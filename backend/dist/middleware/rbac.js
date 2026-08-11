"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearPermissionCache = exports.checkOrganizationAccess = exports.hasPermission = void 0;
const database_1 = require("../config/database");
// Cache for role permissions
let permissionCache = new Map();
const hasPermission = (resource, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            // Super admin has all permissions
            if (req.user.role === 'super_admin') {
                return next();
            }
            const cacheKey = `${req.user.role}:${resource}:${action}`;
            // Check cache
            if (permissionCache.has(cacheKey)) {
                return next();
            }
            // Check if role_permissions table exists, if not, allow by role
            try {
                const result = await (0, database_1.query)(`SELECT 1 FROM role_permissions rp
                     JOIN permissions p ON p.id = rp.permission_id
                     WHERE rp.role = $1 AND p.resource = $2 AND p.action = $3`, [req.user.role, resource, action]);
                if (result.rows.length === 0) {
                    // Fallback to role-based access if permissions table doesn't exist
                    const roleAccess = {
                        'org_admin': ['member', 'contribution', 'ledger', 'claim', 'report'],
                        'edir_leader': ['member', 'contribution', 'claim', 'report'],
                        'member': ['contribution', 'claim']
                    };
                    const allowedResources = roleAccess[req.user.role] || [];
                    if (!allowedResources.includes(resource)) {
                        return res.status(403).json({
                            error: `Access denied. Required permission: ${resource}.${action}`
                        });
                    }
                }
            }
            catch (err) {
                // If permissions table doesn't exist, allow based on role
                console.log('Permissions table not found, using role-based access');
            }
            // Cache the permission
            permissionCache.set(cacheKey, true);
            setTimeout(() => permissionCache.delete(cacheKey), 60000);
            next();
        }
        catch (error) {
            console.error('Permission check error:', error);
            // On error, allow access to prevent blocking
            next();
        }
    };
};
exports.hasPermission = hasPermission;
const checkOrganizationAccess = async (req, res, next) => {
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
    }
    catch (error) {
        console.error('Organization access error:', error);
        next();
    }
};
exports.checkOrganizationAccess = checkOrganizationAccess;
const clearPermissionCache = () => {
    permissionCache.clear();
};
exports.clearPermissionCache = clearPermissionCache;
