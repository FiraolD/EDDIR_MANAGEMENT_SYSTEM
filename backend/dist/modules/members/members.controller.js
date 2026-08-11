"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMember = exports.updateMemberRole = exports.addMemberToOrganization = exports.updateMemberStatus = exports.updateMember = exports.createMember = exports.getMemberById = exports.getMembers = void 0;
const database_1 = require("../../config/database");
const database_2 = __importDefault(require("../../config/database"));
const bcrypt_1 = require("../../utils/bcrypt");
const getMembers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const status = req.query.status;
        const organizationId = req.query.organization_id;
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
        const params = [];
        let idx = 1;
        // Organization filter
        if (isSuperAdmin && organizationId) {
            queryText += ` AND m.organization_id = $${idx}`;
            params.push(organizationId);
            idx++;
        }
        else if (!isSuperAdmin && userOrgId) {
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
        const membersResult = await (0, database_1.query)(queryText, params);
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
        const params = [id];
        // Add organization filter for non-super admin
        if (!isSuperAdmin && organizationId) {
            queryText += ` AND m.organization_id = $2`;
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
            const memberResult = await client.query(`INSERT INTO members (id, organization_id, member_number, address, emergency_contact_name, emergency_contact_phone, status, join_date) 
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
        await (0, database_1.query)(`UPDATE users SET is_active = $1 WHERE id = (SELECT id FROM members WHERE id = $2)`, [status === 'active', id]);
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
const addMemberToOrganization = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const { email, phone, fullName, password, address, emergencyContactName, emergencyContactPhone } = req.body;
        // Check if user already exists
        const existingUser = await (0, database_1.query)('SELECT id, email, phone FROM users WHERE email = $1 OR phone = $2', [email, phone]);
        let userId;
        if (existingUser.rows.length > 0) {
            // User exists, check if they're already a member of this organization
            const existingMember = await (0, database_1.query)('SELECT id FROM members WHERE id = $1 AND organization_id = $2', [existingUser.rows[0].id, organizationId]);
            if (existingMember.rows.length > 0) {
                return res.status(409).json({ error: 'User is already a member of this organization' });
            }
            userId = existingUser.rows[0].id;
        }
        else {
            // Create new user
            const passwordHash = await (0, bcrypt_1.hashPassword)(password);
            const userResult = await (0, database_1.query)(`INSERT INTO users (email, phone, full_name, password_hash, role, organization_id) 
                 VALUES ($1, $2, $3, $4, 'member', $5) 
                 RETURNING id`, [email, phone, fullName, passwordHash, organizationId]);
            userId = userResult.rows[0].id;
        }
        // Create member profile
        const memberNumber = `MEM${organizationId.slice(0, 4)}${Date.now()}${Math.floor(Math.random() * 10000)}`;
        const memberResult = await (0, database_1.query)(`INSERT INTO members (id, organization_id, member_number, address, emergency_contact_name, emergency_contact_phone, status, join_date) 
             VALUES ($1, $2, $3, $4, $5, $6, 'active', CURRENT_DATE)
             RETURNING id, member_number`, [userId, organizationId, memberNumber, address, emergencyContactName, emergencyContactPhone]);
        res.status(201).json({
            success: true,
            message: 'Member added to organization successfully',
            data: {
                memberId: memberResult.rows[0].id,
                memberNumber: memberResult.rows[0].member_number,
                userId: userId
            }
        });
    }
    catch (error) {
        console.error('Add member to organization error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.addMemberToOrganization = addMemberToOrganization;
const updateMemberRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const validRoles = ['member', 'edir_leader', 'org_admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        // First get the id from member
        const member = await (0, database_1.query)('SELECT id FROM members WHERE id = $1', [id]);
        if (member.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        const result = await (0, database_1.query)('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, role', [role, member.rows[0].id]);
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
        // First get the id
        const member = await (0, database_1.query)('SELECT id FROM members WHERE id = $1', [id]);
        if (member.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        // Delete member (user will be deleted by CASCADE)
        const result = await (0, database_1.query)('DELETE FROM members WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
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
