import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { query } from '../config/database';

export interface AuthRequest extends Request {
    user?: TokenPayload;
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
            `SELECT u.id, u.email, u.phone, u.role, u.is_active, u.organization_id
             FROM users u
             WHERE u.id = $1 AND u.is_active = true`,
            [decoded.id]
        );
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }
        const userData = userResult.rows[0];
        req.user = {
            id: userData.id,
            email: userData.email,
            phone: userData.phone,
            role: userData.role,
            organization_id: userData.organization_id,
        };
        console.log(`🔐 Authenticated: ${userData.email} (role: ${userData.role})`);
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

// ... existing imports

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // Super admin has access to everything
        if (req.user.role === 'super_admin') {
            console.log(`✅ Super Admin allowed: ${req.user.email}`);
            return next();
        }
        if (!roles.includes(req.user.role)) {
            console.log(`❌ Access denied: ${req.user.role} not in [${roles.join(', ')}]`);
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        console.log(`✅ Role allowed: ${req.user.role}`);
        next();
    };
};