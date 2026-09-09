import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { query } from '../config/database';

// Role hierarchy for permission inheritance
const roleHierarchy: Record<string, number> = {
    'super_admin': 10,
    'finance_auditor': 9,
    'finance_approver': 8,
    'finance_recon': 7,
    'finance_processor': 6,
    'org_admin': 5,
    'claims_manager': 4,
    'edir_leader': 3,
    'member': 1
};

// Cache for permissions
let permissionCache: Map<string, Set<string>> = new Map();

// Fix: hasPermission should accept resource and action as separate parameters
export const hasPermission = (resource: string, action: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const userRole = req.user.role;
            const permission = `${resource}.${action}`;

            // Super admin has all permissions
            if (userRole === 'super_admin') {
                return next();
            }

            const cacheKey = `${userRole}:${permission}`;

            // Check cache
            if (permissionCache.has(cacheKey)) {
                return next();
            }

            // Check permission in database
            const result = await query(
                `SELECT 1 FROM role_permissions 
                 WHERE role = $1 AND (permission = $2 OR permission = '*')`,
                [userRole, permission]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({
                    error: `Access denied. Required permission: ${permission}`,
                    role: userRole
                });
            }

            // Cache the permission
            permissionCache.set(cacheKey, new Set());
            setTimeout(() => permissionCache.delete(cacheKey), 60000);

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
};

// Fix: requireRole should accept roles as separate arguments or an array
export const requireRole = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (req.user.role === 'super_admin') {
            return next();
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. Required roles: ${roles.join(', ')}`,
                current_role: req.user.role
            });
        }

        next();
    };
};

export const requireHierarchy = (minRole: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userLevel = roleHierarchy[req.user.role] || 0;
        const requiredLevel = roleHierarchy[minRole] || 0;

        if (userLevel >= requiredLevel) {
            return next();
        }

        return res.status(403).json({
            error: `Access denied. Required minimum role: ${minRole}`,
            current_role: req.user.role
        });
    };
};

// Fix: checkOrganizationAccess - export this function
export const checkOrganizationAccess = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const organizationId = req.params.organizationId || req.body.organization_id || req.query.organization_id;
        
        if (!organizationId) {
            return next();
        }
        
        // Super admin can access any organization
        if (req.user?.role === 'super_admin') {
            return next();
        }
        
        // User must belong to the organization
        if (req.user?.organization_id !== organizationId) {
            return res.status(403).json({ error: 'Access denied to this organization' });
        }
        
        next();
    } catch (error) {
        console.error('Organization access error:', error);
        next();
    }
};

// Dual control for financial transactions
export const requireDualControl = (amount: number) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        const THRESHOLD = 10000; // ETB 10,000
        const HIGH_THRESHOLD = 50000; // ETB 50,000

        if (amount <= THRESHOLD) {
            return next();
        }

        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const workflowId = req.body.workflow_id || req.params.workflow_id;

        if (amount > HIGH_THRESHOLD) {
            const approvalCount = await query(
                `SELECT COUNT(*) FROM approval_requests 
                 WHERE workflow_id = $1 AND status = 'approved'`,
                [workflowId]
            );

            if (parseInt(approvalCount.rows[0].count) >= 2) {
                return next();
            }

            return res.status(403).json({
                error: 'High value transaction requires 3 approvals',
                required: 3,
                current: parseInt(approvalCount.rows[0].count)
            });
        }

        const approvalCount = await query(
            `SELECT COUNT(*) FROM approval_requests 
             WHERE workflow_id = $1 AND status = 'approved'`,
            [workflowId]
        );

        if (parseInt(approvalCount.rows[0].count) >= 1) {
            return next();
        }

        return res.status(403).json({
            error: 'Transaction requires dual approval',
            required: 2,
            current: parseInt(approvalCount.rows[0].count)
        });
    };
};

export const clearPermissionCache = () => {
    permissionCache.clear();
};