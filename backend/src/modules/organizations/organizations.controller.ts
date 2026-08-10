import { Response } from 'express';
import { query } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export const getOrganizations = async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;
        const offset = (page - 1) * limit;

        let queryText = `
            SELECT 
                o.id, o.name, o.subdomain, o.email, o.phone, o.address,
                o.status, o.created_at, o.updated_at,
                COUNT(DISTINCT m.id) as total_members,
                COUNT(DISTINCT c.id) as total_claims,
                COALESCE(SUM(cont.amount), 0) as total_contributions
            FROM organizations o
            LEFT JOIN members m ON m.organization_id = o.id
            LEFT JOIN claims c ON c.organization_id = o.id
            LEFT JOIN contributions cont ON cont.organization_id = o.id
            WHERE o.org_type = 'edir'
        `;

        const params: any[] = [];
        let paramIndex = 1;

        if (search) {
            queryText += ` AND (o.name ILIKE $${paramIndex} OR o.subdomain ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        queryText += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await query(queryText, params);

        let countQuery = `SELECT COUNT(*) FROM organizations WHERE org_type = 'edir'`;
        const countParams: any[] = [];
        let countIndex = 1;

        if (search) {
            countQuery += ` AND (name ILIKE $${countIndex} OR subdomain ILIKE $${countIndex})`;
            countParams.push(`%${search}%`);
            countIndex++;
        }

        const countResult = await query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            organizations: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get organizations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getOrganizationById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Organization ID is required' });
        }

        const result = await query(
            `SELECT 
                o.*,
                COUNT(DISTINCT m.id) as total_members,
                COUNT(DISTINCT c.id) as total_claims,
                COALESCE(SUM(cont.amount), 0) as total_contributions
            FROM organizations o
            LEFT JOIN members m ON m.organization_id = o.id
            LEFT JOIN claims c ON c.organization_id = o.id
            LEFT JOIN contributions cont ON cont.organization_id = o.id
            WHERE o.id = $1
            GROUP BY o.id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const leaders = await query(
            `SELECT u.id, u.full_name, u.email, u.phone
             FROM organization_leaders ol
             JOIN users u ON u.id = ol.user_id
             WHERE ol.organization_id = $1`,
            [id]
        );

        res.json({
            success: true,
            organization: result.rows[0],
            leaders: leaders.rows,
        });
    } catch (error) {
        console.error('Get organization by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createOrganization = async (req: AuthRequest, res: Response) => {
    try {
        const { name, subdomain, email, phone, address } = req.body;

        if (!name || !subdomain) {
            return res.status(400).json({ error: 'Name and subdomain are required' });
        }

        const existing = await query(
            'SELECT id FROM organizations WHERE subdomain = $1',
            [subdomain]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Subdomain already taken' });
        }

        const result = await query(
            `INSERT INTO organizations (name, subdomain, email, phone, address, org_type, status)
             VALUES ($1, $2, $3, $4, $5, 'edir', 'active')
             RETURNING *`,
            [name, subdomain, email, phone, address]
        );

        res.status(201).json({
            success: true,
            message: 'Organization created successfully',
            organization: result.rows[0],
        });
    } catch (error) {
        console.error('Create organization error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateOrganization = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, email, phone, address, status } = req.body;

        const result = await query(
            `UPDATE organizations 
             SET name = COALESCE($1, name),
                 email = COALESCE($2, email),
                 phone = COALESCE($3, phone),
                 address = COALESCE($4, address),
                 status = COALESCE($5, status),
                 updated_at = NOW()
             WHERE id = $6
             RETURNING *`,
            [name, email, phone, address, status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        res.json({
            success: true,
            message: 'Organization updated successfully',
            organization: result.rows[0],
        });
    } catch (error) {
        console.error('Update organization error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteOrganization = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const members = await query('SELECT COUNT(*) FROM members WHERE organization_id = $1', [id]);
        if (parseInt(members.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Cannot delete organization with existing members' });
        }

        const result = await query('DELETE FROM organizations WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        res.json({
            success: true,
            message: 'Organization deleted successfully',
        });
    } catch (error) {
        console.error('Delete organization error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateOrganizationStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const result = await query(
            'UPDATE organizations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        res.json({
            success: true,
            message: `Organization ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
            organization: result.rows[0],
        });
    } catch (error) {
        console.error('Update organization status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const assignLeader = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Check if organization exists
        const org = await query('SELECT id FROM organizations WHERE id = $1', [id]);
        if (org.rows.length === 0) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Check if user exists
        const user = await query('SELECT id, role FROM users WHERE id = $1', [userId]);
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user role to org_admin
        await query(
            'UPDATE users SET role = $1, organization_id = $2 WHERE id = $3',
            ['org_admin', id, userId]
        );

        // Add to organization_leaders
        await query(
            `INSERT INTO organization_leaders (organization_id, user_id, role)
             VALUES ($1, $2, 'admin')
             ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'admin'`,
            [id, userId]
        );

        res.json({
            success: true,
            message: 'Leader assigned successfully',
        });
    } catch (error) {
        console.error('Assign leader error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getOrganizationStats = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const result = await query(
            `SELECT 
                COUNT(DISTINCT m.id) as total_members,
                COUNT(DISTINCT c.id) as total_claims,
                COALESCE(SUM(cont.amount), 0) as total_contributions,
                COALESCE(SUM(cont.amount) FILTER (WHERE cont.contribution_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) as monthly_contributions,
                COUNT(DISTINCT CASE WHEN c.status = 'pending' THEN c.id END) as pending_claims
            FROM organizations o
            LEFT JOIN members m ON m.organization_id = o.id
            LEFT JOIN claims c ON c.organization_id = o.id
            LEFT JOIN contributions cont ON cont.organization_id = o.id
            WHERE o.id = $1
            GROUP BY o.id`,
            [id]
        );

        res.json({
            success: true,
            stats: result.rows[0] || {
                total_members: 0,
                total_claims: 0,
                total_contributions: 0,
                monthly_contributions: 0,
                pending_claims: 0,
            },
        });
    } catch (error) {
        console.error('Get organization stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// NEW: Get members of a specific organization
export const getOrganizationMembers = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Organization ID is required' });
        }

        const result = await query(
            `SELECT 
                m.id, 
                m.member_number, 
                m.full_name, 
                m.email, 
                m.phone,
                m.status, 
                m.join_date, 
                m.total_contributions
             FROM members m
             WHERE m.organization_id = $1
             ORDER BY m.join_date DESC`,
            [id]
        );

        res.json({
            success: true,
            members: result.rows,
        });
    } catch (error) {
        console.error('Get organization members error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};