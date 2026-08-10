import { Response } from 'express';
import { query } from '../../config/database';
import pool from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { hashPassword } from '../../utils/bcrypt';

export const getMembers = async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string;
        const status = req.query.status as string;
        const organizationId = req.query.organization_id as string;

        const isSuperAdmin = req.user?.role === 'super_admin';
        const userOrgId = req.user?.organization_id;

        let queryText = `
            SELECT 
                m.id, m.member_number, m.full_name, m.phone, m.email,
                m.status, m.join_date, m.total_contributions, m.last_contribution_date,
                m.address, m.emergency_contact_name, m.emergency_contact_phone,
                m.organization_id, o.name as organization_name,
                'member' as role
            FROM members m
            LEFT JOIN organizations o ON o.id = m.organization_id
            WHERE 1=1
        `;
        const params: any[] = [];
        let idx = 1;

        // Organization filter
        if (isSuperAdmin && organizationId) {
            queryText += ` AND m.organization_id = $${idx}`;
            params.push(organizationId);
            idx++;
        } else if (!isSuperAdmin && userOrgId) {
            queryText += ` AND m.organization_id = $${idx}`;
            params.push(userOrgId);
            idx++;
        }

        if (search) {
            queryText += ` AND (m.full_name ILIKE $${idx} OR m.email ILIKE $${idx} OR m.phone ILIKE $${idx} OR m.member_number ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }
        if (status) {
            queryText += ` AND m.status = $${idx}`;
            params.push(status);
            idx++;
        }

        const offset = (page - 1) * limit;
        queryText += ` ORDER BY m.join_date DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        params.push(limit, offset);

        const membersResult = await query(queryText, params);
        const total = membersResult.rowCount || 0;

        res.json({
            success: true,
            members: membersResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getMemberById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const organizationId = req.user?.organization_id;
        const isSuperAdmin = req.user?.role === 'super_admin';
        
        let queryText = `
            SELECT 
                m.*, u.full_name, u.email, u.phone, u.role,
                o.name as organization_name,
                (
                    SELECT json_agg(json_build_object(
                        'id', c.id, 'amount', c.amount, 'date', c.contribution_date, 'status', c.status
                    ) ORDER BY c.contribution_date DESC LIMIT 5)
                    FROM contributions c
                    WHERE c.member_id = m.id
                ) as recent_contributions,
                (
                    SELECT json_agg(json_build_object(
                        'id', cl.id, 'claim_number', cl.claim_number, 'amount', cl.amount, 'status', cl.status
                    ) ORDER BY cl.created_at DESC LIMIT 5)
                    FROM claims cl
                    WHERE cl.member_id = m.id
                ) as recent_claims
            FROM members m
            JOIN users u ON u.id = m.id
            JOIN organizations o ON o.id = m.organization_id
            WHERE m.id = $1
        `;
        
        const params: any[] = [id];
        
        // Add organization filter for non-super admin
        if (!isSuperAdmin && organizationId) {
            queryText += ` AND m.organization_id = $2`;
            params.push(organizationId);
        }
        
        const result = await query(queryText, params);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        res.json({
            success: true,
            member: result.rows[0],
        });
    } catch (error) {
        console.error('Get member by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createMember = async (req: AuthRequest, res: Response) => {
    try {
        const { email, phone, fullName, password, address, emergencyContactName, emergencyContactPhone, role = 'member' } = req.body;
        const organizationId = req.user?.organization_id;
        const isSuperAdmin = req.user?.role === 'super_admin';
        
        if (!email || !phone || !fullName || !password) {
            return res.status(400).json({ error: 'Required fields missing' });
        }
        
        // Check if user already exists
        const existing = await query(
            'SELECT id, email, phone FROM users WHERE email = $1 OR phone = $2',
            [email, phone]
        );
        
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }
        
        const passwordHash = await hashPassword(password);
        const memberNumber = `MEM${Date.now()}${Math.floor(Math.random() * 10000)}`;
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            const userResult = await client.query(
                `INSERT INTO users (email, phone, full_name, password_hash, role, organization_id) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING id, email, phone, full_name`,
                [email, phone, fullName, passwordHash, role, organizationId]
            );
            
            const userId = userResult.rows[0].id;
            
            const memberResult = await client.query(
                `INSERT INTO members (id, organization_id, member_number, address, emergency_contact_name, emergency_contact_phone, status, join_date) 
                 VALUES ($1, $2, $3, $4, $5, $6, 'active', CURRENT_DATE)
                 RETURNING id, member_number`,
                [userId, organizationId, memberNumber, address, emergencyContactName, emergencyContactPhone]
            );
            
            await client.query('COMMIT');
            
            res.status(201).json({
                success: true,
                message: 'Member created successfully',
                data: {
                    userId,
                    memberId: memberResult.rows[0].id,
                    memberNumber: memberResult.rows[0].member_number,
                    email: userResult.rows[0].email,
                    phone: userResult.rows[0].phone,
                    fullName: userResult.rows[0].full_name,
                },
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Create member error:', error);
        res.status(500).json({ error: 'Failed to create member' });
    }
};

export const updateMember = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { address, emergencyContactName, emergencyContactPhone } = req.body;
        
        const result = await query(
            `UPDATE members 
             SET address = COALESCE($1, address),
                 emergency_contact_name = COALESCE($2, emergency_contact_name),
                 emergency_contact_phone = COALESCE($3, emergency_contact_phone),
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [address, emergencyContactName, emergencyContactPhone, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        res.json({
            success: true,
            message: 'Member updated successfully',
            member: result.rows[0],
        });
    } catch (error) {
        console.error('Update member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateMemberStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['active', 'inactive', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const result = await query(
            `UPDATE members 
             SET status = $1, updated_at = NOW() 
             WHERE id = $2 
             RETURNING id, status`,
            [status, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        // Also update user active status
        await query(
            `UPDATE users SET is_active = $1 WHERE id = (SELECT id FROM members WHERE id = $2)`,
            [status === 'active', id]
        );
        
        res.json({
            success: true,
            message: `Member status updated to ${status}`,
            member: result.rows[0],
        });
    } catch (error) {
        console.error('Update member status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
export const addMemberToOrganization = async (req: AuthRequest, res: Response) => {
    try {
        const { organizationId } = req.params;
        const { email, phone, fullName, password, address, emergencyContactName, emergencyContactPhone } = req.body;
        
        // Check if user already exists
        const existingUser = await query(
            'SELECT id, email, phone FROM users WHERE email = $1 OR phone = $2',
            [email, phone]
        );
        
        let userId;
        
        if (existingUser.rows.length > 0) {
            // User exists, check if they're already a member of this organization
            const existingMember = await query(
                'SELECT id FROM members WHERE id = $1 AND organization_id = $2',
                [existingUser.rows[0].id, organizationId]
            );
            
            if (existingMember.rows.length > 0) {
                return res.status(409).json({ error: 'User is already a member of this organization' });
            }
            userId = existingUser.rows[0].id;
        } else {
            // Create new user
            const passwordHash = await hashPassword(password);
            const userResult = await query(
                `INSERT INTO users (email, phone, full_name, password_hash, role, organization_id) 
                 VALUES ($1, $2, $3, $4, 'member', $5) 
                 RETURNING id`,
                [email, phone, fullName, passwordHash, organizationId]
            );
            userId = userResult.rows[0].id;
        }
        
        // Create member profile
        const memberNumber = `MEM${organizationId.slice(0, 4)}${Date.now()}${Math.floor(Math.random() * 10000)}`;
        const memberResult = await query(
            `INSERT INTO members (id, organization_id, member_number, address, emergency_contact_name, emergency_contact_phone, status, join_date) 
             VALUES ($1, $2, $3, $4, $5, $6, 'active', CURRENT_DATE)
             RETURNING id, member_number`,
            [userId, organizationId, memberNumber, address, emergencyContactName, emergencyContactPhone]
        );
        
        res.status(201).json({
            success: true,
            message: 'Member added to organization successfully',
            data: {
                memberId: memberResult.rows[0].id,
                memberNumber: memberResult.rows[0].member_number,
                userId: userId
            }
        });
    } catch (error) {
        console.error('Add member to organization error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
export const updateMemberRole = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        const validRoles = ['member', 'edir_leader', 'org_admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        
        // First get the id from member
        const member = await query('SELECT id FROM members WHERE id = $1', [id]);
        if (member.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        const result = await query(
            'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, role',
            [role, member.rows[0].id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            success: true,
            message: 'Member role updated successfully',
            user: result.rows[0],
        });
    } catch (error) {
        console.error('Update member role error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteMember = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        // First get the id
        const member = await query('SELECT id FROM members WHERE id = $1', [id]);
        
        if (member.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        // Delete member (user will be deleted by CASCADE)
        const result = await query('DELETE FROM members WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        res.json({
            success: true,
            message: 'Member deleted successfully',
        });
    } catch (error) {
        console.error('Delete member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};