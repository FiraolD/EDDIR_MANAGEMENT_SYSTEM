"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.getMe = exports.logout = exports.refreshToken = exports.register = exports.login = void 0;
const database_1 = require("../../config/database");
const bcrypt_1 = require("../../utils/bcrypt");
const jwt_1 = require("../../utils/jwt");
const validation_1 = require("../../utils/validation");
const crypto_1 = __importDefault(require("crypto"));
const mail_1 = require("../../utils/mail");
const passwordMeetsPolicy = (password) => (typeof password === 'string' && password.length >= 12 && password.length <= 256 &&
    /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password));
const login = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const normalizedIdentifier = typeof identifier === 'string' ? identifier.trim().toLowerCase() : '';
        if (!normalizedIdentifier || typeof password !== 'string' || password.length > 256) {
            return res.status(400).json({ error: 'Email/phone and password are required' });
        }
        // Fix: Use $1 for both parameters with OR
        const result = await (0, database_1.query)(`SELECT id, email, phone, full_name, password_hash, role, is_active, organization_id, token_version 
             FROM users 
             WHERE email = $1 OR phone = $1`, [normalizedIdentifier]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = result.rows[0];
        if (!user.is_active) {
            return res.status(401).json({ error: 'Account is disabled' });
        }
        const isValidPassword = await (0, bcrypt_1.comparePassword)(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Update last login
        await (0, database_1.query)('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        const payload = {
            id: user.id,
            email: user.email,
            phone: user.phone,
            role: user.role,
            organization_id: user.organization_id,
            token_version: user.token_version,
        };
        const accessToken = (0, jwt_1.generateAccessToken)(payload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
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
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
const register = async (req, res) => {
    try {
        const { email, phone, fullName, password } = req.body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const normalizedPhone = typeof phone === 'string' ? phone.replace(/[\s-]/g, '') : '';
        const normalizedName = typeof fullName === 'string' ? fullName.trim() : '';
        if (!(0, validation_1.isValidEmail)(normalizedEmail) || !(0, validation_1.isValidPhone)(normalizedPhone) || !normalizedName || !(0, validation_1.isValidPassword)(password) || password.length > 256) {
            return res.status(400).json({ error: 'Provide a valid email, Ethiopian phone number, full name, and password of at least 12 characters' });
        }
        if (!passwordMeetsPolicy(password)) {
            return res.status(400).json({ error: 'Password must be at least 12 characters and include uppercase, lowercase, number, and symbol' });
        }
        // Check if user exists
        const existing = await (0, database_1.query)('SELECT id FROM users WHERE email = $1 OR phone = $2', [normalizedEmail, normalizedPhone]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'User with this email or phone already exists' });
        }
        const passwordHash = await (0, bcrypt_1.hashPassword)(password);
        // Get or create default organization
        let orgId;
        {
            // Check if default org exists
            const defaultOrg = await (0, database_1.query)('SELECT id FROM organizations WHERE subdomain = $1', ['default']);
            if (defaultOrg.rows.length > 0) {
                orgId = defaultOrg.rows[0].id;
            }
            else {
                const orgResult = await (0, database_1.query)(`INSERT INTO organizations (name, subdomain) 
                     VALUES ($1, $2) 
                     RETURNING id`, ['Default Organization', 'default']);
                orgId = orgResult.rows[0].id;
            }
        }
        // Create user
        const result = await (0, database_1.query)(`INSERT INTO users (email, phone, full_name, password_hash, role, organization_id) 
             VALUES ($1, $2, $3, $4, 'member', $5) 
             RETURNING id, email, phone, full_name, role, organization_id`, [normalizedEmail, normalizedPhone, normalizedName, passwordHash, orgId]);
        const user = result.rows[0];
        // Create member profile
        const memberNumber = `MEM${Date.now()}${Math.floor(Math.random() * 10000)}`;
        await (0, database_1.query)(`INSERT INTO members (id, organization_id, member_number, status, join_date) 
             VALUES ($1, $2, $3, 'pending', CURRENT_DATE)`, [user.id, user.organization_id, memberNumber]);
        const payload = {
            id: user.id,
            email: user.email,
            phone: user.phone,
            role: user.role,
            organization_id: user.organization_id,
        };
        const accessToken = (0, jwt_1.generateAccessToken)(payload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
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
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.register = register;
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }
        const user = (0, jwt_1.verifyRefreshToken)(refreshToken);
        if (!user) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }
        // Get fresh user data
        const result = await (0, database_1.query)('SELECT id, email, phone, role, organization_id, token_version FROM users WHERE id = $1 AND is_active = true', [user.id]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }
        const freshUser = result.rows[0];
        const payload = {
            id: freshUser.id,
            email: freshUser.email,
            phone: freshUser.phone,
            role: freshUser.role,
            organization_id: freshUser.organization_id,
            token_version: freshUser.token_version,
        };
        const newAccessToken = (0, jwt_1.generateAccessToken)(payload);
        res.json({
            success: true,
            accessToken: newAccessToken,
        });
    }
    catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.refreshToken = refreshToken;
const logout = async (req, res) => {
    try {
        await (0, database_1.query)('UPDATE users SET token_version = token_version + 1, updated_at = NOW() WHERE id = $1', [req.user?.id]);
        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.logout = logout;
const getMe = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const result = await (0, database_1.query)(`SELECT u.id, u.email, u.phone, u.full_name, u.role, u.is_active, u.organization_id,
                    o.name as organization_name,
                    m.id as member_id, m.member_number, m.status as member_status
             FROM users u
             LEFT JOIN organizations o ON o.id = u.organization_id
             LEFT JOIN members m ON m.id = u.id
             WHERE u.id = $1`, [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            success: true,
            user: result.rows[0],
        });
    }
    catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMe = getMe;
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (!passwordMeetsPolicy(newPassword)) {
            return res.status(400).json({ error: 'New password must be at least 12 characters and include uppercase, lowercase, number, and symbol' });
        }
        // Get current user
        const result = await (0, database_1.query)('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isValid = await (0, bcrypt_1.comparePassword)(currentPassword, result.rows[0].password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        const newPasswordHash = await (0, bcrypt_1.hashPassword)(newPassword);
        await (0, database_1.query)('UPDATE users SET password_hash = $1, token_version = token_version + 1, updated_at = NOW() WHERE id = $2', [newPasswordHash, userId]);
        res.json({
            success: true,
            message: 'Password changed successfully',
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.changePassword = changePassword;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        if (!(0, validation_1.isValidEmail)(normalizedEmail)) {
            return res.status(400).json({ error: 'Email is required' });
        }
        const result = await (0, database_1.query)('SELECT id, email FROM users WHERE email = $1', [normalizedEmail]);
        if (result.rows.length === 0) {
            // Don't reveal that user doesn't exist for security
            return res.json({
                success: true,
                message: 'If an account exists with that email, you will receive a password reset link',
            });
        }
        const rawToken = crypto_1.default.randomBytes(32).toString('base64url');
        const tokenHash = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
        await (0, database_1.query)('DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at < NOW()', [result.rows[0].id]);
        await (0, database_1.query)(`INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '1 hour')`, [tokenHash, result.rows[0].id]);
        await (0, mail_1.sendResetEmail)(result.rows[0].email, rawToken);
        res.json({
            success: true,
            message: 'If an account exists with that email, you will receive a password reset link',
        });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }
        if (!passwordMeetsPolicy(newPassword)) {
            return res.status(400).json({ error: 'Password must be at least 12 characters and include uppercase, lowercase, number, and symbol' });
        }
        const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const tokenResult = await (0, database_1.query)(`UPDATE password_reset_tokens
             SET used_at = NOW()
             WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
             RETURNING user_id`, [tokenHash]);
        if (tokenResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }
        const passwordHash = await (0, bcrypt_1.hashPassword)(newPassword);
        const userId = tokenResult.rows[0].user_id;
        await (0, database_1.query)('UPDATE users SET password_hash = $1, token_version = token_version + 1, updated_at = NOW() WHERE id = $2 AND is_active = true', [passwordHash, userId]);
        res.json({
            success: true,
            message: 'Password reset successfully',
        });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.resetPassword = resetPassword;
