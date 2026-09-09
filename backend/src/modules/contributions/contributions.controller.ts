import { Response } from 'express';
import { query } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

export const getContributions = async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string;
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

        // Base query with all columns qualified
        let queryText = `
            SELECT 
                c.id, 
                c.amount, 
                c.payment_method, 
                c.transaction_ref, 
                c.status AS contribution_status,
                c.contribution_date, 
                c.notes, 
                c.created_at,
                m.id AS member_id, 
                m.member_number,
                u.full_name AS member_name
            FROM contributions c
            JOIN members m ON m.id = c.member_id
            join users u ON u.id = m.user_id
            WHERE 1=1
        `;

        const params: any[] = [];
        let idx = 1;

        if (targetOrgId) {
            queryText += ` AND c.organization_id = $${idx}`;
            params.push(targetOrgId);
            idx++;
        }

        if (search) {
            queryText += ` AND (u.full_name ILIKE $${idx} OR m.member_number ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        if (status) {
            // Fully qualified column
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
        queryText += ` ORDER BY c.contribution_date DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        params.push(limit, offset);

        const contributionsResult = await query(queryText, params);
        const total = contributionsResult.rowCount || 0;

        // Stats query – also qualify columns
        let statsQuery = `
            SELECT 
                COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'confirmed'), 0) AS total,
                COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'confirmed' AND c.contribution_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS this_month,
                COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'confirmed' AND c.contribution_date >= DATE_TRUNC('year', CURRENT_DATE)), 0) AS this_year,
                COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'pending'), 0) AS pending,
                COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'confirmed'), 0) AS confirmed
            FROM contributions c
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

        if (search) {
            statsQuery += ` AND (u.full_name ILIKE $${sIdx} OR m.member_number ILIKE $${sIdx})`;
            statsParams.push(`%${search}%`);
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
            contributions: contributionsResult.rows,
            stats: statsResult.rows[0] || {
                total: 0,
                this_month: 0,
                this_year: 0,
                pending: 0,
                confirmed: 0,
            },
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get contributions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getContributionById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const result = await query(
            `SELECT 
                c.*, 
                u.full_name as member_name,
                m.member_number
             FROM contributions c
             JOIN members m ON m.id = c.member_id
             WHERE c.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contribution not found' });
        }
        res.json({ contribution: result.rows[0] });
    } catch (error) {
        console.error('Get contribution by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createContribution = async (req: AuthRequest, res: Response) => {
    try {
        const { member_id, amount, payment_method, contribution_date, notes } = req.body;
        if (!member_id || !amount || !payment_method) {
            return res.status(400).json({ error: 'Member, amount, and payment method are required' });
        }

        // Get organization_id from member
        const member = await query('SELECT organization_id FROM members WHERE id = $1', [member_id]);
        if (member.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        const organizationId = member.rows[0].organization_id;

        const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        const result = await query(
            `INSERT INTO contributions (member_id, organization_id, amount, payment_method, transaction_ref, contribution_date, notes, recorded_by, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')
             RETURNING *`,
            [member_id, organizationId, amount, payment_method, transactionRef, contribution_date || new Date(), notes, req.user!.id]
        );

        // Update member's total contributions
        await query(
            `UPDATE members 
             SET total_contributions = total_contributions + $1,
                 last_contribution_date = $2
             WHERE id = $3`,
            [amount, contribution_date || new Date(), member_id]
        );

        // Create transaction record
        await query(
            `INSERT INTO transactions (transaction_number, type, category, amount, member_id, contribution_id, payment_method, description, organization_id)
             VALUES ($1, 'credit', 'contribution', $2, $3, $4, $5, 'Monthly contribution payment', $6)`,
            [transactionRef, amount, member_id, result.rows[0].id, payment_method, organizationId]
        );

        res.status(201).json({
            message: 'Contribution recorded successfully',
            contribution: result.rows[0],
        });
    } catch (error) {
        console.error('Create contribution error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateContribution = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const result = await query(
            `UPDATE contributions 
             SET status = COALESCE($1, status),
                 notes = COALESCE($2, notes),
                 updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [status, notes, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contribution not found' });
        }
        res.json({
            message: 'Contribution updated successfully',
            contribution: result.rows[0],
        });
    } catch (error) {
        console.error('Update contribution error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteContribution = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM contributions WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contribution not found' });
        }
        res.json({ message: 'Contribution deleted successfully' });
    } catch (error) {
        console.error('Delete contribution error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getContributionStats = async (req: AuthRequest, res: Response) => {
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
                COALESCE(SUM(amount), 0) as total,
                COALESCE(SUM(amount) FILTER (WHERE contribution_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) as this_month,
                COALESCE(SUM(amount) FILTER (WHERE contribution_date >= DATE_TRUNC('year', CURRENT_DATE)), 0) as this_year,
                COUNT(*) as total_count,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_count
            FROM contributions
            WHERE status = 'confirmed'
        `;
        const params: any[] = [];
        if (targetOrgId) {
            queryText += ` AND organization_id = $1`;
            params.push(targetOrgId);
        }
        const result = await query(queryText, params);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get contribution stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const exportContributions = async (req: AuthRequest, res: Response) => {
    try {
        const result = await query(`
            SELECT 
                c.transaction_ref as "Transaction Ref",
                u.full_name as "Member Name",
                m.member_number as "Member Number",
                c.amount as "Amount",
                c.payment_method as "Payment Method",
                c.contribution_date as "Date",
                c.status as "Status"
            FROM contributions c
            JOIN members m ON m.id = c.member_id
            ORDER BY c.contribution_date DESC
        `);
        const csvRows = [];
        const headers = Object.keys(result.rows[0] || {});
        csvRows.push(headers.join(','));
        for (const row of result.rows) {
            const values = headers.map(header => JSON.stringify(row[header] || ''));
            csvRows.push(values.join(','));
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=contributions_${Date.now()}.csv`);
        res.send(csvRows.join('\n'));
    } catch (error) {
        console.error('Export contributions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const reconcileContributions = async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate, organizationId } = req.body;
        const isSuperAdmin = req.user?.role === 'super_admin';
        const userOrgId = req.user?.organization_id;

        let targetOrgId = organizationId;
        if (!isSuperAdmin && userOrgId) {
            targetOrgId = userOrgId;
        } else if (!isSuperAdmin && !userOrgId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let filter = '';
        const params: any[] = [];
        let idx = 1;

        if (targetOrgId) {
            filter += ` AND organization_id = $${idx}`;
            params.push(targetOrgId);
            idx++;
        }
        if (startDate) {
            filter += ` AND contribution_date >= $${idx}`;
            params.push(startDate);
            idx++;
        }
        if (endDate) {
            filter += ` AND contribution_date <= $${idx}`;
            params.push(endDate);
            idx++;
        }

        const summary = await query(`
            SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(amount) FILTER (WHERE status = 'confirmed'), 0) as confirmed_amount,
                COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_amount,
                COALESCE(SUM(amount) FILTER (WHERE status = 'failed'), 0) as failed_amount
            FROM contributions
            WHERE 1=1 ${filter}
        `, params);

        const details = await query(`
            SELECT c.*, m.member_number, u.full_name as member_name
            FROM contributions c
            JOIN members m ON m.id = c.member_id
            WHERE 1=1 ${filter}
            ORDER BY c.contribution_date DESC
        `, params);

        res.json({
            success: true,
            summary: summary.rows[0],
            details: details.rows,
        });
    } catch (error) {
        console.error('Reconcile contributions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};