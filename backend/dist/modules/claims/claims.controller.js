"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessFraud = exports.reviewClaim = exports.exportClaims = exports.getClaimStats = exports.deleteClaim = exports.updateClaimStatus = exports.payClaim = exports.advanceClaim = exports.createClaim = exports.getClaimById = exports.getClaims = void 0;
const database_1 = require("../../config/database");
// Role-based status flow mapping
const statusFlow = {
    // canonical role: 'edir_leader' (frontend may use 'org_leader' alias)
    'edir_leader': {
        'reported': 'leader_approved'
    },
    // keep alias for backward compatibility
    'org_leader': {
        'reported': 'leader_approved'
    },
    'org_admin': {
        // Org Admin advances reported -> admin_approved
        'reported': 'admin_approved'
    },
    'claims_manager': {
        // Claims Manager advances admin_approved -> claims_approved
        'admin_approved': 'claims_approved'
    },
    'finance_processor': {
        // Finance Processor advances claims_approved -> processing (Payout Processing)
        'claims_approved': 'processing'
    },
    'finance_approver': {
        // Finance Approver finalizes processing -> paid
        'processing': 'paid'
    },
    'super_admin': {
        'reported': 'leader_approved',
        'leader_approved': 'admin_approved',
        'admin_approved': 'processing',
        'processing': 'paid'
    }
};
// Normalize role aliases (frontend may use 'org_leader' while DB uses 'edir_leader')
const normalizeRole = (role) => {
    if (!role)
        return role;
    if (role === 'org_leader')
        return 'edir_leader';
    return role;
};
// Get next approver role for notification (returns canonical role names)
const getNextApproverRole = (status) => {
    const mapping = {
        'reported': 'org_admin',
        'admin_approved': 'claims_manager',
        'claims_approved': 'finance_processor',
        'processing': 'finance_approver'
    };
    return mapping[status] || null;
};
// Create notification for role
const createNotification = async (role, claimId, message, userId) => {
    try {
        // If specific user ID provided, notify only that user
        if (userId) {
            await (0, database_1.query)(`INSERT INTO notifications (user_id, title, body, data)
                 VALUES ($1, 'Claim Action Required', $2, $3)`, [userId, message, JSON.stringify({ claimId, type: 'claim_approval' })]);
            return;
        }
        // Normalize role alias before querying users
        const canonicalRole = normalizeRole(role);
        // Otherwise notify all users with this role
        const users = await (0, database_1.query)('SELECT id FROM users WHERE role = $1 AND is_active = true', [canonicalRole]);
        for (const user of users.rows) {
            await (0, database_1.query)(`INSERT INTO notifications (user_id, title, body, data)
                 VALUES ($1, 'Claim Action Required', $2, $3)`, [user.id, message, JSON.stringify({ claimId, type: 'claim_approval' })]);
        }
    }
    catch (error) {
        console.error('Failed to create notification:', error);
    }
};
const getClaims = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const memberId = req.query.memberId;
        const organizationId = req.query.organization_id;
        const userRole = req.user?.role;
        const isSuperAdmin = userRole === 'super_admin';
        const userOrgId = req.user?.organization_id;
        let targetOrgId = null;
        if (isSuperAdmin && organizationId) {
            targetOrgId = organizationId;
        }
        else if (!isSuperAdmin && userOrgId) {
            targetOrgId = userOrgId;
        }
        let queryText = `
            SELECT 
                c.id, c.claim_number, c.deceased_name, c.relationship,
                c.date_of_death, c.date_reported, c.amount,
                c.status AS status, c.priority,
                c.documents, c.approved_by, c.approved_at, c.paid_at,
                c.notes, c.created_at, c.updated_at, c.created_by,
                m.id AS member_id, m.member_number, u2.full_name AS member_name,
                u.full_name AS approved_by_name, u3.full_name AS created_by_name
            FROM claims c
            JOIN members m ON m.id = c.member_id
            LEFT JOIN users u ON u.id = c.approved_by
            join users u2 on u2.id = m.user_id
            LEFT JOIN users u3 ON u3.id = c.created_by
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;
        if (targetOrgId) {
            queryText += ` AND c.organization_id = $${idx}`;
            params.push(targetOrgId);
            idx++;
        }
        if (status) {
            queryText += ` AND c.status = $${idx}`;
            params.push(status);
            idx++;
        }
        if (memberId) {
            queryText += ` AND c.member_id = $${idx}`;
            params.push(memberId);
            idx++;
        }
        const offset = (page - 1) * limit;
        queryText += ` ORDER BY c.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        params.push(limit, offset);
        const claimsResult = await (0, database_1.query)(queryText, params);
        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total
            FROM claims c
            JOIN members m ON m.id = c.member_id
            WHERE 1=1
        `;
        const countParams = [];
        let cIdx = 1;
        if (targetOrgId) {
            countQuery += ` AND c.organization_id = $${cIdx}`;
            countParams.push(targetOrgId);
            cIdx++;
        }
        if (status) {
            countQuery += ` AND c.status = $${cIdx}`;
            countParams.push(status);
            cIdx++;
        }
        if (memberId) {
            countQuery += ` AND c.member_id = $${cIdx}`;
            countParams.push(memberId);
        }
        const countResult = await (0, database_1.query)(countQuery, countParams);
        const total = parseInt(countResult.rows[0]?.total || '0');
        let statsQuery = `
            SELECT 
                COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE c.status IN ('reported', 'leader_approved', 'admin_approved', 'claims_approved')) AS pending,
                COUNT(*) FILTER (WHERE c.status = 'processing') AS in_payout,
                COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'paid' AND c.paid_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS paid_this_month
            FROM claims c
            JOIN members m ON m.id = c.member_id
            WHERE 1=1
        `;
        const statsParams = [];
        let sIdx = 1;
        if (targetOrgId) {
            statsQuery += ` AND c.organization_id = $${sIdx}`;
            statsParams.push(targetOrgId);
            sIdx++;
        }
        if (status) {
            statsQuery += ` AND c.status = $${sIdx}`;
            statsParams.push(status);
            sIdx++;
        }
        if (memberId) {
            statsQuery += ` AND c.member_id = $${sIdx}`;
            statsParams.push(memberId);
        }
        const statsResult = await (0, database_1.query)(statsQuery, statsParams);
        res.json({
            claims: claimsResult.rows,
            stats: statsResult.rows[0] || { total: 0, pending: 0, in_payout: 0, paid_this_month: 0 },
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Get claims error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getClaims = getClaims;
const getClaimById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await (0, database_1.query)(`SELECT c.*, u2.full_name AS member_name, m.member_number,
                    u.full_name AS approved_by_name
             FROM claims c
             JOIN members m ON m.id = c.member_id
             LEFT JOIN users u ON u.id = c.approved_by
             WHERE c.id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        res.json({ claim: result.rows[0] });
    }
    catch (error) {
        console.error('Get claim by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getClaimById = getClaimById;
const createClaim = async (req, res) => {
    try {
        const { member_id, deceased_name, relationship, date_of_death, amount, notes } = req.body;
        if (!member_id || !deceased_name || !amount) {
            return res.status(400).json({ error: 'Member, deceased name, and amount are required' });
        }
        // Get organization_id from member
        const member = await (0, database_1.query)('SELECT organization_id FROM members WHERE id = $1', [member_id]);
        if (member.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        const organizationId = member.rows[0].organization_id;
        // Check if user has access to this organization
        if (req.user?.role !== 'super_admin' && req.user?.organization_id !== organizationId) {
            return res.status(403).json({ error: 'You do not have access to this member' });
        }
        const claimNumber = `CLM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        // Handle file upload
        let documentPath = null;
        if (req.file) {
            documentPath = req.file.path;
        }
        const result = await (0, database_1.query)(`INSERT INTO claims (
                member_id, organization_id, claim_number,
                deceased_name, relationship, date_of_death,
                amount, notes, status, documents, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'reported'::claim_status, $9, $10)
            RETURNING *`, [member_id, organizationId, claimNumber, deceased_name, relationship, date_of_death, amount, notes, documentPath ? [documentPath] : [], req.user.id]);
        // Log workflow
        await (0, database_1.query)(`INSERT INTO claim_workflow (claim_id, from_status, to_status, changed_by, comments)
             VALUES ($1, NULL, 'reported'::claim_status, $2, 'Claim reported')`, [result.rows[0].id, req.user.id]);
        // Create audit log
        await (0, database_1.query)(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data, ip_address, user_agent)
             VALUES ($1, 'claim_created', 'claim', $2, $3, $4, $5)`, [req.user.id, result.rows[0].id, JSON.stringify(result.rows[0]), req.ip, req.headers['user-agent']]);
        // Notify Org Leader for approval
        await createNotification('edir_leader', result.rows[0].id, `New claim ${claimNumber} requires your approval`);
        res.status(201).json({
            success: true,
            message: 'Claim reported successfully',
            claim: result.rows[0],
        });
    }
    catch (error) {
        console.error('Create claim error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createClaim = createClaim;
const advanceClaim = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.user?.role || 'member';
        // Check claim exists
        const claim = await (0, database_1.query)('SELECT status, amount, member_id, organization_id FROM claims WHERE id = $1', [id]);
        if (claim.rows.length === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        const currentStatus = claim.rows[0].status;
        const amount = parseFloat(claim.rows[0].amount);
        // Check organization access
        if (req.user?.role !== 'super_admin' &&
            claim.rows[0].organization_id !== req.user?.organization_id) {
            return res.status(403).json({ error: 'Access denied to this claim' });
        }
        // Get allowed transitions for this role
        const allowedTransitions = statusFlow[userRole] || {};
        const nextStatus = allowedTransitions[currentStatus];
        if (!nextStatus) {
            return res.status(400).json({
                error: 'Cannot advance claim',
                current_status: currentStatus,
                role: userRole,
                allowed_transitions: allowedTransitions
            });
        }
        // Check for high amount (> ETB 50,000) requiring dual approval
        if (nextStatus === 'paid' && amount > 50000) {
            const approvalCount = await (0, database_1.query)(`SELECT COUNT(*) FROM claim_workflow 
                 WHERE claim_id = $1 AND to_status = 'processing' AND comments LIKE '%dual approval%'`, [id]);
            if (parseInt(approvalCount.rows[0].count) < 1) {
                // Create notification for additional approver
                await createNotification('finance_approver', id, `High value claim ${claim.rows[0].claim_number} requires approval`);
                return res.status(202).json({
                    message: 'High value claim requires additional approval',
                    status: 'pending_approval',
                    approval_required: true,
                    next_approver: 'finance_approver'
                });
            }
        }
        // Update claim status
        const result = await (0, database_1.query)(`UPDATE claims 
             SET status = $1::claim_status,
                 approved_by = CASE WHEN $1::claim_status IN ('leader_approved', 'admin_approved') THEN $2 ELSE approved_by END,
                 approved_at = CASE WHEN $1::claim_status IN ('leader_approved', 'admin_approved') THEN NOW() ELSE approved_at END,
                 paid_at = CASE WHEN $1::claim_status = 'paid' THEN NOW() ELSE paid_at END,
                 updated_at = NOW()
             WHERE id = $3
             RETURNING *`, [nextStatus, req.user.id, id]);
        // Log workflow
        await (0, database_1.query)(`INSERT INTO claim_workflow (claim_id, from_status, to_status, changed_by, comments)
             VALUES ($1, $2::claim_status, $3::claim_status, $4, 'Advanced from ' || $2 || ' to ' || $3)`, [id, currentStatus, nextStatus, req.user.id]);
        // Create audit log
        await (0, database_1.query)(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data, ip_address, user_agent)
             VALUES ($1, 'claim_advanced', 'claim', $2, $3, $4, $5)`, [req.user.id, id, JSON.stringify({ from: currentStatus, to: nextStatus }), req.ip, req.headers['user-agent']]);
        // If paid, create transaction
        if (nextStatus === 'paid') {
            const transactionNumber = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            await (0, database_1.query)(`INSERT INTO transactions (transaction_number, type, category, amount, member_id, claim_id, description, organization_id)
                 VALUES ($1, 'debit', 'claim_payout', $2, $3, $4, 'Death benefit payout', $5)`, [transactionNumber, claim.rows[0].amount, claim.rows[0].member_id, id, claim.rows[0].organization_id]);
        }
        // Notify next approver
        const nextApprover = getNextApproverRole(nextStatus);
        if (nextApprover && nextStatus !== 'paid') {
            await createNotification(nextApprover, id, `Claim ${claim.rows[0].claim_number} requires your approval`);
        }
        // Notify original claimant if paid
        if (nextStatus === 'paid') {
            await createNotification('member', id, `Your claim ${claim.rows[0].claim_number} has been paid`, claim.rows[0].member_id);
        }
        res.json({
            success: true,
            message: `Claim advanced to ${nextStatus}`,
            claim: result.rows[0],
            status: nextStatus,
            next_approver: nextApprover
        });
    }
    catch (error) {
        console.error('Advance claim error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.advanceClaim = advanceClaim;
const payClaim = async (req, res) => {
    try {
        const { id } = req.params;
        const { transactionReference } = req.body;
        const current = await (0, database_1.query)('SELECT status, amount, member_id, organization_id FROM claims WHERE id = $1', [id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        const claim = current.rows[0];
        if (req.user?.role !== 'super_admin' && claim.organization_id !== req.user?.organization_id) {
            return res.status(403).json({ error: 'Access denied to this organization' });
        }
        // Check if user has permission to pay (Finance roles)
        const allowedRoles = ['finance_approver', 'finance_processor', 'super_admin', 'org_admin'];
        if (!allowedRoles.includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Only finance roles can process payouts' });
        }
        // Check if claim can be paid
        if (claim.status !== 'processing' && claim.status !== 'admin_approved') {
            return res.status(400).json({ error: `Claim cannot be paid from status: ${claim.status}` });
        }
        // Check for dual approval on high value
        if (claim.amount > 50000 && req.user?.role === 'finance_processor') {
            const approvalCount = await (0, database_1.query)(`SELECT COUNT(*) FROM claim_workflow 
                 WHERE claim_id = $1 AND to_status = 'paid'`, [id]);
            if (parseInt(approvalCount.rows[0].count) < 1) {
                return res.status(403).json({
                    error: 'High value payout requires approver authorization',
                    next_approver: 'finance_approver'
                });
            }
        }
        const result = await (0, database_1.query)(`UPDATE claims 
             SET status = 'paid'::claim_status,
                 paid_at = NOW(),
                 approved_by = $1,
                 updated_at = NOW()
             WHERE id = $2 AND status IN ('processing', 'admin_approved')
             RETURNING *`, [req.user.id, id]);
        if (result.rows.length === 0) {
            return res.status(409).json({ error: 'Claim was already paid or is no longer payable' });
        }
        await (0, database_1.query)(`INSERT INTO claim_workflow (claim_id, from_status, to_status, changed_by, comments)
             VALUES ($1, $2::claim_status, 'paid'::claim_status, $3, 'Payout completed by Finance')`, [id, claim.status, req.user.id]);
        // Create transaction
        const transactionNumber = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        await (0, database_1.query)(`INSERT INTO transactions (transaction_number, type, category, amount, member_id, claim_id, description, organization_id, reference)
             VALUES ($1, 'debit', 'claim_payout', $2, $3, $4, 'Death benefit payout', $5, $6)`, [transactionNumber, claim.amount, claim.member_id, id, claim.organization_id, transactionReference]);
        // Create audit log
        await (0, database_1.query)(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data, ip_address, user_agent)
             VALUES ($1, 'claim_paid', 'claim', $2, $3, $4, $5)`, [req.user.id, id, JSON.stringify({ transaction_reference: transactionReference }), req.ip, req.headers['user-agent']]);
        // Notify member
        await createNotification('member', id, `Your claim has been paid successfully`, claim.member_id);
        res.json({
            success: true,
            message: 'Claim marked as paid successfully',
            claim: result.rows[0],
            transaction_number: transactionNumber
        });
    }
    catch (error) {
        console.error('Pay claim error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.payClaim = payClaim;
const updateClaimStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['reported', 'leader_approved', 'admin_approved', 'claims_approved', 'processing', 'paid'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        // Only Super Admin and Org Admin can update status directly
        if (!['super_admin', 'org_admin'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        const result = await (0, database_1.query)('UPDATE claims SET status = $1::claim_status, updated_at = NOW() WHERE id = $2 RETURNING *', [status, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        res.json({ success: true, message: 'Claim status updated', claim: result.rows[0] });
    }
    catch (error) {
        console.error('Update claim status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateClaimStatus = updateClaimStatus;
const deleteClaim = async (req, res) => {
    try {
        const { id } = req.params;
        // Only Super Admin can delete claims
        if (req.user?.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only Super Admin can delete claims' });
        }
        // Check if claim exists
        const claim = await (0, database_1.query)('SELECT status FROM claims WHERE id = $1', [id]);
        if (claim.rows.length === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        // Create audit log before deletion
        await (0, database_1.query)(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, ip_address, user_agent)
             VALUES ($1, 'claim_deleted', 'claim', $2, $3, $4, $5)`, [req.user.id, id, JSON.stringify(claim.rows[0]), req.ip, req.headers['user-agent']]);
        const result = await (0, database_1.query)('DELETE FROM claims WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        res.json({ success: true, message: 'Claim deleted successfully' });
    }
    catch (error) {
        console.error('Delete claim error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteClaim = deleteClaim;
const getClaimStats = async (req, res) => {
    try {
        const organizationId = req.query.organization_id;
        const isSuperAdmin = req.user?.role === 'super_admin';
        const userOrgId = req.user?.organization_id;
        let targetOrgId = null;
        if (isSuperAdmin && organizationId) {
            targetOrgId = organizationId;
        }
        else if (!isSuperAdmin && userOrgId) {
            targetOrgId = userOrgId;
        }
        let queryText = `
            SELECT 
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status IN ('reported', 'leader_approved', 'admin_approved')) AS pending,
                COUNT(*) FILTER (WHERE status = 'processing') AS in_payout,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND paid_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS paid_this_month,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS total_paid,
                AVG(amount) FILTER (WHERE status = 'paid') AS average_payout
            FROM claims
            WHERE 1=1
        `;
        const params = [];
        if (targetOrgId) {
            queryText += ` AND organization_id = $1`;
            params.push(targetOrgId);
        }
        const result = await (0, database_1.query)(queryText, params);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Get claim stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getClaimStats = getClaimStats;
const exportClaims = async (req, res) => {
    try {
        // Only Super Admin, Org Admin, Finance roles can export
        const allowedRoles = ['super_admin', 'org_admin', 'finance_auditor', 'finance_recon'];
        if (!allowedRoles.includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Insufficient permissions to export claims' });
        }
        const result = await (0, database_1.query)(`
            SELECT 
                c.claim_number AS "Claim Number",
                u2.full_name AS "Member Name",
                c.deceased_name AS "Deceased Name",
                c.relationship AS "Relationship",
                c.amount AS "Amount",
                c.status AS "Status",
                c.date_reported AS "Date Reported",
                c.paid_at AS "Paid Date",
                u.full_name AS "Approved By"
            FROM claims c
            JOIN members m ON m.id = c.member_id
            LEFT JOIN users u ON u.id = c.approved_by
            ORDER BY c.created_at DESC
        `);
        const csvRows = [];
        const headers = Object.keys(result.rows[0] || {});
        csvRows.push(headers.join(','));
        for (const row of result.rows) {
            const values = headers.map(header => JSON.stringify(row[header] || ''));
            csvRows.push(values.join(','));
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=claims_${Date.now()}.csv`);
        res.send(csvRows.join('\n'));
    }
    catch (error) {
        console.error('Export claims error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.exportClaims = exportClaims;
// Additional function for claims review (Claims Manager role)
const reviewClaim = async (req, res) => {
    try {
        const { id } = req.params;
        const { decision, comments } = req.body;
        // Only Claims Manager can review
        if (req.user?.role !== 'claims_manager' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only Claims Manager can review claims' });
        }
        const claim = await (0, database_1.query)('SELECT status, organization_id FROM claims WHERE id = $1', [id]);
        if (claim.rows.length === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        if (claim.rows[0].status !== 'leader_approved') {
            return res.status(400).json({ error: 'Claim must be in Leader Approved status for review' });
        }
        // Update claim based on decision
        const newStatus = decision === 'approve' ? 'admin_approved' : 'rejected';
        const result = await (0, database_1.query)(`UPDATE claims 
             SET status = $1::claim_status,
                 approved_by = $2,
                 approved_at = NOW(),
                 notes = COALESCE(notes || '', '') || '\n' || $3
             WHERE id = $4
             RETURNING *`, [newStatus, req.user.id, comments, id]);
        await (0, database_1.query)(`INSERT INTO claim_workflow (claim_id, from_status, to_status, changed_by, comments)
             VALUES ($1, 'leader_approved'::claim_status, $2::claim_status, $3, $4)`, [id, newStatus, req.user.id, comments]);
        // Notify org admin
        await createNotification('org_admin', id, `Claim ${claim.rows[0].claim_number} ${decision}ed by Claims Manager`);
        res.json({
            success: true,
            message: `Claim ${decision}ed successfully`,
            claim: result.rows[0]
        });
    }
    catch (error) {
        console.error('Review claim error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.reviewClaim = reviewClaim;
// Fraud assessment for Claims Manager
const assessFraud = async (req, res) => {
    try {
        const { id } = req.params;
        const { risk_level, assessment_notes } = req.body;
        if (req.user?.role !== 'claims_manager' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only Claims Manager can assess fraud' });
        }
        const claim = await (0, database_1.query)('SELECT status, organization_id FROM claims WHERE id = $1', [id]);
        if (claim.rows.length === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        // Store fraud assessment (you might want to add a fraud_assessment table)
        await (0, database_1.query)(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data, ip_address, user_agent)
             VALUES ($1, 'fraud_assessment', 'claim', $2, $3, $4, $5)`, [req.user.id, id, JSON.stringify({ risk_level, assessment_notes }), req.ip, req.headers['user-agent']]);
        // If high risk, flag the claim
        if (risk_level === 'high') {
            await (0, database_1.query)(`UPDATE claims SET priority = 'high' WHERE id = $1`, [id]);
        }
        res.json({
            success: true,
            message: 'Fraud assessment completed',
            risk_level,
            assessment_notes
        });
    }
    catch (error) {
        console.error('Fraud assessment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.assessFraud = assessFraud;
