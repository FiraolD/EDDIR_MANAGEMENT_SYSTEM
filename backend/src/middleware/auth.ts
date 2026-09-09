import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { query } from '../config/database';

export interface AuthRequest extends Request {
    user?: TokenPayload & {
        organization_name?: string;
    };
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const token = authHeader.substring(7);
        const decoded = verifyAccessToken(token);
        
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        // Verify user still exists and is active
        const userResult = await query(
            `SELECT u.id, u.email, u.phone, u.role, u.is_active, u.organization_id, u.token_version,
                    o.name as organization_name
             FROM users u
             LEFT JOIN organizations o ON o.id = u.organization_id
             WHERE u.id = $1 AND u.is_active = true`,
            [decoded.id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }
        
        const userData = userResult.rows[0];

        if (typeof decoded.token_version === 'number' && decoded.token_version !== userData.token_version) {
            return res.status(401).json({ error: 'Session expired' });
        }
        
        req.user = {
            id: userData.id,
            email: userData.email,
            phone: userData.phone,
            role: userData.role,
            organization_id: userData.organization_id,
            token_version: userData.token_version,
            organization_name: userData.organization_name,
        };
        
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Super admin has access to everything
        if (req.user.role === 'super_admin') {
            return next();
        }
        
        // Check if user's role is in the allowed roles
        // Also handle the case where 'finance' role might be used
        const userRole = req.user.role;
        const isAllowed = roles.some(role => {
            // Handle exact match
            if (role === userRole) return true;
            // Handle 'finance' matching any finance sub-role
            if (role === 'finance' && ['finance_processor', 'finance_approver', 'finance_recon', 'finance_auditor'].includes(userRole)) {
                return true;
            }
            return false;
        });
        
        if (!isAllowed) {
            console.log(`Access denied: User role ${userRole} not in allowed roles [${roles.join(', ')}]`);
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                required_roles: roles,
                user_role: userRole
            });
        }
        
        next();
    };
};