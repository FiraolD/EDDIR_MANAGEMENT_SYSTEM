import { Response } from 'express';
import { query } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

export const getClaims = async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;
        const memberId = req.query.memberId as string;
        const organizationId = req.query.organization_id as string;

        const isSuperAdmin = req.user?.role === 'super_admin';
        const userOrgId = req.user?.organization_id;

        let targetOrgId = null;
        if (isSuperAdmin && organizationId) {
            targetOrgId = organizationId;
        } else if (!isSuperAdmin && userOrgId) {
            targetOrgId = userOrgId;
        }

        let queryText = `
            SELECT 
                c.id, c.claim_number, c.deceased_name, c.relationship,
                c.date_of_death, c.date_reported, c.amount,
                c.status AS status, c.priority,
                c.documents, c.approved_by, c.approved_at, c.paid_at,
                c.notes, c.created_at, c.updated_at,
                m.id AS member_id, m.member_number, m.full_name AS member_name
            FROM claims c
            JOIN members m ON m.id = c.member_id
            WHERE 1=1
        `;
        const params: any[] = [];
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

        const claimsResult = await query(queryText, params);
        const total = claimsResult.rowCount || 0;

        let statsQuery = `
            SELECT 
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE c.status IN ('reported', 'leader_approved', 'admin_approved')) AS pending,
                COUNT(*) FILTER (WHERE c.status = 'processing') AS in_payout,
                COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'paid' AND c.paid_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS paid_this_month
            FROM claims c
            JOIN members m ON m.id = c.member_id
            WHERE 1=1
        `;
        const statsParams: any[] = [];
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
        const statsResult = await query(statsQuery, statsParams);

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
    } catch (error) {
        console.error('Get claims error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getClaimById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const result = await query(
            `SELECT c.*, m.full_name AS member_name, m.member_number
             FROM claims c
             JOIN members m ON m.id = c.member_id
             WHERE c.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        res.json({ claim: result.rows[0] });
    } catch (error) {
        console.error('Get claim by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ✅ SINGLE createClaim – with file upload support (keeps the one you added)
export const createClaim = async (req: AuthRequest, res: Response) => {
    try {
        const { member_id, deceased_name, relationship, date_of_death, amount, notes } = req.body;
        if (!member_id || !deceased_name || !amount) {
            return res.status(400).json({ error: 'Member, deceased name, and amount are required' });
        }

        // Get organization_id from member
        const member = await query('SELECT organization_id FROM members WHERE id = $1', [member_id]);
        if (member.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        const organizationId = member.rows[0].organization_id;

        const claimNumber = `CLM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Handle file upload
        let documentPath = null;
        if (req.file) {
            documentPath = req.file.path; // or use a public URL
        }

        const result = await query(
            `INSERT INTO claims (
                member_id, organization_id, claim_number,
                deceased_name, relationship, date_of_death,
                amount, notes, status, documents
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'reported'::claim_status, $9)
            RETURNING *`,
            [member_id, organizationId, claimNumber, deceased_name, relationship, date_of_death, amount, notes, documentPath ? [documentPath] : []]
        );

        // Log workflow
        await query(
            `INSERT INTO claim_workflow (claim_id, from_status, to_status, changed_by, comments)
             VALUES ($1, NULL, 'reported'::claim_status, $2, 'Claim reported')`,
            [result.rows[0].id, req.user!.id]
        );

        res.status(201).json({
            success: true,
            message: 'Claim reported successfully',
            claim: result.rows[0],
        });
    } catch (error) {
        console.error('Create claim error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const advanceClaim = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
     const statusFlow: Record<string, string> = {
  reported: 'leader_approved',
  leader_approved: 'admin_approved',
  admin_approved: 'processing',
  processing: 'paid'
};

        const current = await query('SELECT status, amount, member_id, organization_id FROM claims WHERE id = $1', [id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        const currentStatus = current.rows[0].status;
        const nextStatus = statusFlow[currentStatus];
        if (!nextStatus) {
            return res.status(400).json({ error: 'Claim cannot be advanced further' });
        }

        const result = await query(
            `UPDATE claims 
             SET status = $1::claim_status,
                 approved_by = CASE WHEN $1::claim_status IN ('leader_approved', 'admin_approved') THEN $2 ELSE approved_by END,
                 approved_at = CASE WHEN $1::claim_status IN ('leader_approved', 'admin_approved') THEN NOW() ELSE approved_at END,
                 paid_at = CASE WHEN $1::claim_status = 'paid' THEN NOW() ELSE paid_at END,
                 updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [nextStatus, req.user!.id, id]
        );

        await query(
            `INSERT INTO claim_workflow (claim_id, from_status, to_status, changed_by, comments)
             VALUES ($1, $2::claim_status, $3::claim_status, $4, 'Advanced from ' || $2 || ' to ' || $3)`,
            [id, currentStatus, nextStatus, req.user!.id]
        );

        if (nextStatus === 'paid') {
            const transactionNumber = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            await query(
                `INSERT INTO transactions (transaction_number, type, category, amount, member_id, claim_id, description, organization_id)
                 VALUES ($1, 'debit', 'claim_payout', $2, $3, $4, 'Death benefit payout', $5)`,
                [transactionNumber, current.rows[0].amount, current.rows[0].member_id, id, current.rows[0].organization_id]
            );
        }

        res.json({
            success: true,
            message: `Claim advanced to ${nextStatus}`,
            claim: result.rows[0],
            status: nextStatus,
        });
    } catch (error) {
        console.error('Advance claim error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const payClaim = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { transactionReference } = req.body;

        const current = await query('SELECT status, amount, member_id, organization_id FROM claims WHERE id = $1', [id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        const claim = current.rows[0];
        if (claim.status !== 'processing' && claim.status !== 'admin_approved') {
            return res.status(400).json({ error: `Claim cannot be paid from status: ${claim.status}` });
        }

        const result = await query(
            `UPDATE claims 
             SET status = 'paid'::claim_status,
                 paid_at = NOW(),
                 approved_by = $1,
                 updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [req.user!.id, id]
        );

        await query(
            `INSERT INTO claim_workflow (claim_id, from_status, to_status, changed_by, comments)
             VALUES ($1, $2::claim_status, 'paid'::claim_status, $3, 'Payout completed by Finance')`,
            [id, claim.status, req.user!.id]
        );

        const transactionNumber = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        await query(
            `INSERT INTO transactions (transaction_number, type, category, amount, member_id, claim_id, description, organization_id, reference)
             VALUES ($1, 'debit', 'claim_payout', $2, $3, $4, 'Death benefit payout', $5, $6)`,
            [transactionNumber, claim.amount, claim.member_id, id, claim.organization_id, transactionReference]
        );

        res.json({
            success: true,
            message: 'Claim marked as paid successfully',
            claim: result.rows[0],
        });
    } catch (error) {
        console.error('Pay claim error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateClaimStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['reported', 'leader_approved', 'admin_approved', 'processing', 'paid'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const result = await query(
            'UPDATE claims SET status = $1::claim_status, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        res.json({ success: true, message: 'Claim status updated', claim: result.rows[0] });
    } catch (error) {
        console.error('Update claim status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteClaim = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM claims WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        res.json({ success: true, message: 'Claim deleted successfully' });
    } catch (error) {
        console.error('Delete claim error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getClaimStats = async (req: AuthRequest, res: Response) => {
    try {
        const organizationId = req.query.organization_id as string;
        const isSuperAdmin = req.user?.role === 'super_admin';
        const userOrgId = req.user?.organization_id;

        let targetOrgId = null;
        if (isSuperAdmin && organizationId) {
            targetOrgId = organizationId;
        } else if (!isSuperAdmin && userOrgId) {
            targetOrgId = userOrgId;
        }

        let queryText = `
            SELECT 
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status IN ('reported', 'leader_approved', 'admin_approved')) AS pending,
                COUNT(*) FILTER (WHERE status = 'processing') AS in_payout,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND paid_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS paid_this_month,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS total_paid
            FROM claims
            WHERE 1=1
        `;
        const params: any[] = [];
        if (targetOrgId) {
            queryText += ` AND organization_id = $1`;
            params.push(targetOrgId);
        }
        const result = await query(queryText, params);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get claim stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const exportClaims = async (req: AuthRequest, res: Response) => {
    try {
        const result = await query(`
            SELECT 
                c.claim_number AS "Claim Number",
                m.full_name AS "Member Name",
                c.deceased_name AS "Deceased Name",
                c.relationship AS "Relationship",
                c.amount AS "Amount",
                c.status AS "Status",
                c.date_reported AS "Date Reported"
            FROM claims c
            JOIN members m ON m.id = c.member_id
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
    } catch (error) {
        console.error('Export claims error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};