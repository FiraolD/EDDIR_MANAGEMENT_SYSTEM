"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemberStats = exports.deleteMember = exports.updateMemberRole = exports.updateMemberStatus = exports.updateMember = exports.createMember = exports.getMemberById = exports.getMembers = void 0;
const database_1 = require("../../config/database");
const database_2 = __importDefault(require("../../config/database"));
const bcrypt_1 = require("../../utils/bcrypt");
const getMembers = async (req, res) => {
    try {
        const organizationId = req.user?.organization_id;
        const isSuperAdmin = req.user?.role === 'super_admin';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const status = req.query.status;
        const offset = (page - 1) * limit;
        let queryText = `
            SELECT 
                m.id, 
                m.member_number, 
                u.full_name, 
                u.phone, 
                u.email,
                m.status, 
                m.join_date, 
                m.total_contributions, 
                m.last_contribution_date,
                m.address, 
                m.emergency_contact_name, 
                m.emergency_contact_phone,
                u.role,
                o.name as organization_name,
                u.organization_id
            FROM members m
            JOIN users u ON u.id = m.user_id
            LEFT JOIN organizations o ON o.id = u.organization_id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        // Filter by organization (non-super admin sees only their org)
        if (!isSuperAdmin && organizationId) {
            queryText += ` AND u.organization_id = $${paramIndex}`;
            params.push(organizationId);
            paramIndex++;
        }
        if (search) {
            queryText += ` AND (u.full_name ILIKE $${paramIndex} OR u.phone ILIKE $${paramIndex} OR m.member_number ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        if (status) {
            queryText += ` AND m.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        queryText += ` ORDER BY m.join_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        const result = await (0, database_1.query)(queryText, params);
        // Get total count with same filters
        let countQuery = `
            SELECT COUNT(*) as count 
            FROM members m
            JOIN users u ON u.id = m.user_id
            WHERE 1=1
        `;
        const countParams = [];
        let countIndex = 1;
        if (!isSuperAdmin && organizationId) {
            countQuery += ` AND u.organization_id = $${countIndex}`;
            countParams.push(organizationId);
            countIndex++;
        }
        if (search) {
            countQuery += ` AND (u.full_name ILIKE $${countIndex} OR u.phone ILIKE $${countIndex} OR m.member_number ILIKE $${countIndex})`;
            countParams.push(`%${search}%`);
            countIndex++;
        }
        if (status) {
            countQuery += ` AND m.status = $${countIndex}`;
            countParams.push(status);
        }
        const countResult = await (0, database_1.query)(countQuery, countParams);
        const total = parseInt(countResult.rows[0]?.count || '0');
        res.json({
            success: true,
            members: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMembers = getMembers;
const getMemberById = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user?.organization_id;
        const isSuperAdmin = req.user?.role === 'super_admin';
        let queryText = `
            SELECT 
                m.*, 
                u.full_name, 
                u.email, 
                u.phone, 
                u.role,
                o.name as organization_name,
                (
                    SELECT json_agg(json_build_object(
                        'id', c.id, 
                        'amount', c.amount, 
                        'date', c.contribution_date, 
                        'status', c.status
                    ) ORDER BY c.contribution_date DESC LIMIT 5)
                    FROM contributions c
                    WHERE c.member_id = m.id
                ) as recent_contributions,
                (
                    SELECT json_agg(json_build_object(
                        'id', cl.id, 
                        'claim_number', cl.claim_number, 
                        'amount', cl.amount, 
                        'status', cl.status
                    ) ORDER BY cl.created_at DESC LIMIT 5)
                    FROM claims cl
                    WHERE cl.member_id = m.id
                ) as recent_claims
            FROM members m
            JOIN users u ON u.id = m.user_id
            LEFT JOIN organizations o ON o.id = u.organization_id
            WHERE m.id = $1
        `;
        const params = [id];
        // Add organization filter for non-super admin
        if (!isSuperAdmin && organizationId) {
            queryText += ` AND u.organization_id = $2`;
            params.push(organizationId);
        }
        const result = await (0, database_1.query)(queryText, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        res.json({
            success: true,
            member: result.rows[0],
        });
    }
    catch (error) {
        console.error('Get member by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMemberById = getMemberById;
const createMember = async (req, res) => {
    try {
        const { email, phone, fullName, password, address, emergencyContactName, emergencyContactPhone, role = 'member' } = req.body;
        const organizationId = req.user?.organization_id;
        const isSuperAdmin = req.user?.role === 'super_admin';
        if (!email || !phone || !fullName || !password) {
            return res.status(400).json({ error: 'Required fields missing' });
        }
        // Check if user already exists
        const existing = await (0, database_1.query)('SELECT id, email, phone FROM users WHERE email = $1 OR phone = $2', [email, phone]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }
        const passwordHash = await (0, bcrypt_1.hashPassword)(password);
        const memberNumber = `MEM${Date.now()}${Math.floor(Math.random() * 10000)}`;
        const client = await database_2.default.connect();
        try {
            await client.query('BEGIN');
            const userResult = await client.query(`INSERT INTO users (email, phone, full_name, password_hash, role, organization_id) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING id, email, phone, full_name`, [email, phone, fullName, passwordHash, role, organizationId]);
            const userId = userResult.rows[0].id;
            const memberResult = await client.query(`INSERT INTO members (user_id, organization_id, member_number, address, emergency_contact_name, emergency_contact_phone, status, join_date) 
                 VALUES ($1, $2, $3, $4, $5, $6, 'active', CURRENT_DATE)
                 RETURNING id, member_number`, [userId, organizationId, memberNumber, address, emergencyContactName, emergencyContactPhone]);
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Create member error:', error);
        res.status(500).json({ error: 'Failed to create member' });
    }
};
exports.createMember = createMember;
const updateMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { address, emergencyContactName, emergencyContactPhone } = req.body;
        const result = await (0, database_1.query)(`UPDATE members 
             SET address = COALESCE($1, address),
                 emergency_contact_name = COALESCE($2, emergency_contact_name),
                 emergency_contact_phone = COALESCE($3, emergency_contact_phone),
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`, [address, emergencyContactName, emergencyContactPhone, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        res.json({
            success: true,
            message: 'Member updated successfully',
            member: result.rows[0],
        });
    }
    catch (error) {
        console.error('Update member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateMember = updateMember;
const updateMemberStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['active', 'inactive', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const result = await (0, database_1.query)(`UPDATE members 
             SET status = $1, updated_at = NOW() 
             WHERE id = $2 
             RETURNING id, status`, [status, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        // Also update user active status
        await (0, database_1.query)(`UPDATE users SET is_active = $1 WHERE id = (SELECT user_id FROM members WHERE id = $2)`, [status === 'active', id]);
        res.json({
            success: true,
            message: `Member status updated to ${status}`,
            member: result.rows[0],
        });
    }
    catch (error) {
        console.error('Update member status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateMemberStatus = updateMemberStatus;
const updateMemberRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const validRoles = ['member', 'org_leader', 'org_admin', 'claims_manager', 'finance_processor', 'finance_approver', 'finance_recon', 'finance_auditor'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        // First get the user_id from member
        const member = await (0, database_1.query)('SELECT user_id FROM members WHERE id = $1', [id]);
        if (member.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        const result = await (0, database_1.query)('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, role', [role, member.rows[0].user_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            success: true,
            message: 'Member role updated successfully',
            user: result.rows[0],
        });
    }
    catch (error) {
        console.error('Update member role error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateMemberRole = updateMemberRole;
const deleteMember = async (req, res) => {
    try {
        const { id } = req.params;
        // First get the user_id
        const member = await (0, database_1.query)('SELECT user_id FROM members WHERE id = $1', [id]);
        if (member.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        // Delete member (user will be deleted by CASCADE)
        const result = await (0, database_1.query)('DELETE FROM members WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        // Delete the user as well
        await (0, database_1.query)('DELETE FROM users WHERE id = $1', [member.rows[0].user_id]);
        res.json({
            success: true,
            message: 'Member deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteMember = deleteMember;
const getMemberStats = async (req, res) => {
    try {
        const organizationId = req.user?.organization_id;
        const isSuperAdmin = req.user?.role === 'super_admin';
        let queryText = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COALESCE(SUM(total_contributions), 0) as total_contributions
            FROM members m
            JOIN users u ON u.id = m.user_id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        if (!isSuperAdmin && organizationId) {
            queryText += ` AND u.organization_id = $${paramIndex}`;
            params.push(organizationId);
            paramIndex++;
        }
        const result = await (0, database_1.query)(queryText, params);
        res.json(result.rows[0] || { total: 0, active: 0, inactive: 0, pending: 0, total_contributions: 0 });
    }
    catch (error) {
        console.error('Get member stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMemberStats = getMemberStats;
