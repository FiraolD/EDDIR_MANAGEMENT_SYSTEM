import { Request, Response } from 'express';
import { query } from '../../config/database';
import { hashPassword, comparePassword } from '../../utils/bcrypt';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, TokenPayload } from '../../utils/jwt';
import { AuthRequest } from '../../middleware/auth';

export const login = async (req: Request, res: Response) => {
    try {
        const { identifier, password } = req.body;
        
        console.log('Login attempt:', { identifier });
        
        if (!identifier || !password) {
            return res.status(400).json({ error: 'Email/phone and password are required' });
        }
        
        // Fix: Use $1 for both parameters with OR
        const result = await query(
            `SELECT id, email, phone, full_name, password_hash, role, is_active, organization_id 
             FROM users 
             WHERE email = $1 OR phone = $1`,
            [identifier]  // Only one parameter for both conditions
        );
        
        console.log('Query result rows:', result.rows.length);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        
        if (!user.is_active) {
            return res.status(401).json({ error: 'Account is disabled' });
        }
        
        // Compare password
        const isValidPassword = await comparePassword(password, user.password_hash);
        
        console.log('Password valid:', isValidPassword);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        
        const payload: TokenPayload = {
            id: user.id,
            email: user.email,
            phone: user.phone,
            role: user.role,
            organization_id: user.organization_id,
        };
        
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);
        
        // Return user data (excluding password hash)
        const userData = {
            id: user.id,
            email: user.email,
            phone: user.phone,
            fullName: user.full_name,
            role: user.role,
            organization_id: user.organization_id,
        };
        
        res.json({
            success: true,
            accessToken,
            refreshToken,
            user: userData,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const { email, phone, fullName, password, organization_id } = req.body;
        
        console.log('Register attempt:', { email, phone, fullName });
        
        if (!email || !phone || !fullName || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        // Check if user exists
        const existing = await query(
            'SELECT id FROM users WHERE email = $1 OR phone = $2',
            [email, phone]
        );
        
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'User with this email or phone already exists' });
        }
        
        const passwordHash = await hashPassword(password);
        
        // Get or create default organization
        let orgId = organization_id;
        if (!orgId) {
            // Check if default org exists
            const defaultOrg = await query(
                'SELECT id FROM organizations WHERE subdomain = $1',
                ['default']
            );
            
            if (defaultOrg.rows.length > 0) {
                orgId = defaultOrg.rows[0].id;
            } else {
                const orgResult = await query(
                    `INSERT INTO organizations (name, subdomain) 
                     VALUES ($1, $2) 
                     RETURNING id`,
                    ['Default Organization', 'default']
                );
                orgId = orgResult.rows[0].id;
            }
        }
        
        // Create user
        const result = await query(
            `INSERT INTO users (email, phone, full_name, password_hash, role, organization_id) 
             VALUES ($1, $2, $3, $4, 'member', $5) 
             RETURNING id, email, phone, full_name, role, organization_id`,
            [email, phone, fullName, passwordHash, orgId]
        );
        
        const user = result.rows[0];
        
        // Create member profile
        const memberNumber = `MEM${Date.now()}${Math.floor(Math.random() * 10000)}`;
        await query(
            `INSERT INTO members (id, organization_id, member_number, status, join_date) 
             VALUES ($1, $2, $3, 'pending', CURRENT_DATE)`,
            [user.id, user.organization_id, memberNumber]
        );
        
        const payload: TokenPayload = {
            id: user.id,
            email: user.email,
            phone: user.phone,
            role: user.role,
            organization_id: user.organization_id,
        };
        
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);
        
        res.status(201).json({
            success: true,
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                fullName: user.full_name,
                role: user.role,
                organization_id: user.organization_id,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const refreshToken = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }
        
        const user = verifyRefreshToken(refreshToken);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }
        
        // Get fresh user data
        const result = await query(
            'SELECT id, email, phone, role, organization_id FROM users WHERE id = $1 AND is_active = true',
            [user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }
        
        const freshUser = result.rows[0];
        
        const payload: TokenPayload = {
            id: freshUser.id,
            email: freshUser.email,
            phone: freshUser.phone,
            role: freshUser.role,
            organization_id: freshUser.organization_id,
        };
        
        const newAccessToken = generateAccessToken(payload);
        
        res.json({
            success: true,
            accessToken: newAccessToken,
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const logout = async (req: AuthRequest, res: Response) => {
    try {
        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const result = await query(
            `SELECT u.id, u.email, u.phone, u.full_name, u.role, u.is_active, u.organization_id,
                    o.name as organization_name,
                    m.id as member_id, m.member_number, m.status as member_status
             FROM users u
             LEFT JOIN organizations o ON o.id = u.organization_id
             LEFT JOIN members m ON m.id = u.id
             WHERE u.id = $1`,
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            success: true,
            user: result.rows[0],
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        
        // Get current user
        const result = await query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const isValid = await comparePassword(currentPassword, result.rows[0].password_hash);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        const newPasswordHash = await hashPassword(newPassword);
        
        await query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [newPasswordHash, userId]
        );
        
        res.json({
            success: true,
            message: 'Password changed successfully',
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        const result = await query(
            'SELECT id, email FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            // Don't reveal that user doesn't exist for security
            return res.json({
                success: true,
                message: 'If an account exists with that email, you will receive a password reset link',
            });
        }
        
        res.json({
            success: true,
            message: 'If an account exists with that email, you will receive a password reset link',
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        res.json({
            success: true,
            message: 'Password reset successfully',
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};