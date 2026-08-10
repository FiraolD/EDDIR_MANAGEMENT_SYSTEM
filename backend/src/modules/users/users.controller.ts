// backend/src/modules/users/users.controller.ts
import { Response } from 'express';
import { query } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 100;
        const search = req.query.search as string;
        const role = req.query.role as string; // might be comma-separated
        const offset = (page - 1) * limit;

        let queryText = `
            SELECT 
                u.id, u.email, u.phone, u.full_name, u.role, u.is_active,
                u.last_login, u.created_at, u.updated_at,
                o.name as organization_name,
                m.member_number
            FROM users u
            LEFT JOIN organizations o ON o.id = u.organization_id
            LEFT JOIN members m ON m.id = u.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (search) {
            queryText += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.phone ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (role) {
            // Handle comma-separated roles safely
            const roles = role.split(',').filter(Boolean);
            if (roles.length > 0) {
                const placeholders = roles.map((_, i) => `$${paramIndex + i}`).join(',');
                queryText += ` AND u.role IN (${placeholders})`;
                params.push(...roles);
                paramIndex += roles.length;
            }
        }

        queryText += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await query(queryText, params);
        const total = result.rows.length; // simplified; you can do a separate count if needed

        res.json({
            success: true,
            users: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
export const getUserById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT u.*, o.name as organization_name
             FROM users u
             LEFT JOIN organizations o ON o.id = u.organization_id
             WHERE u.id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            success: true,
            user: result.rows[0],
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        const validRoles = ['super_admin', 'org_admin', 'edir_leader', 'member'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        
        const result = await query(
            'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, role',
            [role, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            success: true,
            message: 'User role updated successfully',
            user: result.rows[0],
        });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateUserStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        
        const result = await query(
            'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, is_active',
            [is_active, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            success: true,
            message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
            user: result.rows[0],
        });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        // Don't allow deleting yourself
        if (id === req.user?.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        
        const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getUserPermissions = async (req: AuthRequest, res: Response) => {
    try {
        const role = req.user?.role || 'member';
        
        // Define role-based permissions
        const permissions: Record<string, string[]> = {
            super_admin: [
                'organization.create', 'organization.read', 'organization.update', 'organization.delete',
                'member.create', 'member.read', 'member.update', 'member.delete',
                'contribution.create', 'contribution.read', 'contribution.update',
                'claim.create', 'claim.read', 'claim.update', 'claim.approve',
                'report.read', 'report.export', 'user.manage', 'system.configure'
            ],
            org_admin: [
                'member.create', 'member.read', 'member.update',
                'contribution.create', 'contribution.read', 'contribution.update',
                'claim.create', 'claim.read', 'claim.update', 'claim.approve_admin',
                'report.read', 'report.export'
            ],
            edir_leader: [
                'member.read', 'contribution.create', 'contribution.read',
                'claim.create', 'claim.read', 'claim.approve_leader'
            ],
            member: [
                'contribution.create', 'contribution.read.own',
                'claim.create', 'claim.read.own'
            ]
        };
        
        res.json({
            success: true,
            role: role,
            permissions: permissions[role] || [],
        });
    } catch (error) {
        console.error('Get user permissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};