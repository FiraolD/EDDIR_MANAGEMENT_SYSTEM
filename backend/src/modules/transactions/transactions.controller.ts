// backend/src/modules/transactions/transactions.controller.ts
import { Response } from 'express';
import { query } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string;
        const type = req.query.type as string;
        const category = req.query.category as string;
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;
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
                t.id,
                t.transaction_number,
                t.type,
                t.category,
                t.amount,
                t.payment_method,
                t.status,
                t.description,
                t.transaction_date,
                t.created_at,
                m.id AS member_id,
                m.member_number,
                u.full_name AS member_name,
                t.organization_id
            FROM transactions t
            join members m ON m.id = t.member_id
            join users u ON u.id = m.user_id
            WHERE 1=1
        `;

        const params: any[] = [];
        let idx = 1;

        if (targetOrgId) {
            queryText += ` AND t.organization_id = $${idx}`;
            params.push(targetOrgId);
            idx++;
        }

        if (search) {
            queryText += ` AND (t.transaction_number ILIKE $${idx} OR m.full_name ILIKE $${idx} OR m.member_number ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        if (type) {
            queryText += ` AND t.type = $${idx}`;
            params.push(type);
            idx++;
        }

        if (category) {
            queryText += ` AND t.category = $${idx}`;
            params.push(category);
            idx++;
        }

        if (memberId) {
            queryText += ` AND t.member_id = $${idx}`;
            params.push(memberId);
            idx++;
        }

        if (startDate) {
            queryText += ` AND t.transaction_date >= $${idx}`;
            params.push(startDate);
            idx++;
        }

        if (endDate) {
            queryText += ` AND t.transaction_date <= $${idx}`;
            params.push(endDate);
            idx++;
        }

        const offset = (page - 1) * limit;
        queryText += ` ORDER BY t.transaction_date DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        params.push(limit, offset);

        const transactionsResult = await query(queryText, params);
        const total = transactionsResult.rowCount || 0;

        // Stats query (same filters, no pagination)
        let statsQuery = `
            SELECT 
                COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'credit'), 0) AS total_inflow,
                COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'debit'), 0) AS total_outflow,
                COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'credit'), 0) - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'debit'), 0) AS net_movement
            FROM transactions t
            LEFT JOIN members m ON m.id = t.member_id
            WHERE 1=1
        `;

        const statsParams: any[] = [];
        let sIdx = 1;

        if (targetOrgId) {
            statsQuery += ` AND t.organization_id = $${sIdx}`;
            statsParams.push(targetOrgId);
            sIdx++;
        }

        if (search) {
            statsQuery += ` AND (t.transaction_number ILIKE $${sIdx} OR m.full_name ILIKE $${sIdx} OR m.member_number ILIKE $${sIdx})`;
            statsParams.push(`%${search}%`);
            sIdx++;
        }

        if (type) {
            statsQuery += ` AND t.type = $${sIdx}`;
            statsParams.push(type);
            sIdx++;
        }

        if (category) {
            statsQuery += ` AND t.category = $${sIdx}`;
            statsParams.push(category);
            sIdx++;
        }

        if (memberId) {
            statsQuery += ` AND t.member_id = $${sIdx}`;
            statsParams.push(memberId);
            sIdx++;
        }

        if (startDate) {
            statsQuery += ` AND t.transaction_date >= $${sIdx}`;
            statsParams.push(startDate);
            sIdx++;
        }

        if (endDate) {
            statsQuery += ` AND t.transaction_date <= $${sIdx}`;
            statsParams.push(endDate);
        }

        const statsResult = await query(statsQuery, statsParams);

        res.json({
            transactions: transactionsResult.rows,
            stats: statsResult.rows[0] || { total_inflow: 0, total_outflow: 0, net_movement: 0 },
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getTransactionById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const isSuperAdmin = req.user?.role === 'super_admin';
        const organizationId = req.user?.organization_id;
        const result = await query(
            `SELECT 
                t.*,
                m.full_name AS member_name,
                m.member_number
             FROM transactions t
             LEFT JOIN members m ON m.id = t.member_id
             WHERE t.id = $1 ${!isSuperAdmin ? 'AND t.organization_id = $2' : ''}`,
            isSuperAdmin ? [id] : [id, organizationId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json({ transaction: result.rows[0] });
    } catch (error) {
        console.error('Get transaction by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getTransactionStats = async (req: AuthRequest, res: Response) => {
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
                COALESCE(SUM(amount) FILTER (WHERE type = 'credit'), 0) AS total_inflow,
                COALESCE(SUM(amount) FILTER (WHERE type = 'debit'), 0) AS total_outflow,
                COALESCE(SUM(amount) FILTER (WHERE type = 'credit'), 0) - COALESCE(SUM(amount) FILTER (WHERE type = 'debit'), 0) AS net_movement,
                COUNT(*) AS total_transactions
            FROM transactions
            WHERE transaction_date >= DATE_TRUNC('year', CURRENT_DATE)
        `;
        const params: any[] = [];
        if (targetOrgId) {
            queryText += ` AND organization_id = $1`;
            params.push(targetOrgId);
        }
        const result = await query(queryText, params);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get transaction stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const exportTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const isSuperAdmin = req.user?.role === 'super_admin';
        const organizationId = req.user?.organization_id;
        const result = await query(`
            SELECT 
                t.transaction_number AS "Transaction Number",
                t.type AS "Type",
                t.category AS "Category",
                t.amount AS "Amount",
                m.full_name AS "Member Name",
                t.payment_method AS "Payment Method",
                t.transaction_date AS "Date",
                t.description AS "Description"
            FROM transactions t
            LEFT JOIN members m ON m.id = t.member_id
            ${!isSuperAdmin ? 'WHERE t.organization_id = $1' : ''}
            ORDER BY t.transaction_date DESC
            LIMIT ${!isSuperAdmin ? '$2' : '$1'}
        `, !isSuperAdmin ? [organizationId, 10000] : [10000]);

        const csvRows = [];
        const headers = Object.keys(result.rows[0] || {});
        csvRows.push(headers.join(','));
        for (const row of result.rows) {
            const values = headers.map(header => JSON.stringify(row[header] || ''));
            csvRows.push(values.join(','));
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.csv`);
        res.send(csvRows.join('\n'));
    } catch (error) {
        console.error('Export transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const reconcileTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const organizationId = req.body.organization_id;
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
                COALESCE(SUM(amount) FILTER (WHERE type = 'credit'), 0) AS total_credit,
                COALESCE(SUM(amount) FILTER (WHERE type = 'debit'), 0) AS total_debit,
                COUNT(*) FILTER (WHERE type = 'credit') AS credit_count,
                COUNT(*) FILTER (WHERE type = 'debit') AS debit_count
            FROM transactions
            WHERE 1=1
        `;
        const params: any[] = [];
        if (targetOrgId) {
            queryText += ` AND organization_id = $1`;
            params.push(targetOrgId);
        }
        const result = await query(queryText, params);

        res.json({
            success: true,
            message: 'Reconciliation completed',
            summary: result.rows[0] || { total_credit: 0, total_debit: 0, credit_count: 0, debit_count: 0 },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Reconcile transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};