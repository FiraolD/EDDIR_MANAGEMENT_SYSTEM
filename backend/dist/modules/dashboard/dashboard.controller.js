"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const database_1 = require("../../config/database");
const getDashboardStats = async (req, res) => {
    try {
        const organizationId = req.query.organization_id;
        const isSuperAdmin = req.user?.role === 'super_admin';
        const userOrgId = req.user?.organization_id;
        // Determine the target organization ID
        let targetOrgId = null;
        if (isSuperAdmin && organizationId) {
            targetOrgId = organizationId;
        }
        else if (!isSuperAdmin && userOrgId) {
            targetOrgId = userOrgId;
        }
        // If super admin and no organizationId -> null -> all orgs
        // 1. Member stats
        let memberQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COALESCE(SUM(total_contributions), 0) as total_contributions
            FROM members m
        `;
        const memberParams = [];
        if (targetOrgId) {
            memberQuery += ` WHERE m.organization_id = $1`;
            memberParams.push(targetOrgId);
        }
        const memberStats = await (0, database_1.query)(memberQuery, memberParams);
        // 2. Contribution stats
        let contribQuery = `
            SELECT 
                COALESCE(SUM(amount), 0) as total,
                COALESCE(SUM(amount) FILTER (WHERE contribution_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) as this_month,
                COALESCE(SUM(amount) FILTER (WHERE contribution_date >= DATE_TRUNC('year', CURRENT_DATE)), 0) as this_year
            FROM contributions c
            WHERE status = 'confirmed'
        `;
        const contribParams = [];
        if (targetOrgId) {
            contribQuery += ` AND c.organization_id = $1`;
            contribParams.push(targetOrgId);
        }
        const contributionStats = await (0, database_1.query)(contribQuery, contribParams);
        // 3. Claim stats
        let claimQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'reported') as reported,
                COUNT(*) FILTER (WHERE status = 'leader_approved') as leader_approved,
                COUNT(*) FILTER (WHERE status = 'admin_approved') as admin_approved,
                COUNT(*) FILTER (WHERE status = 'processing') as processing,
                COUNT(*) FILTER (WHERE status = 'paid') as paid,
                COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as total_paid_this_year
            FROM claims c
        `;
        const claimParams = [];
        if (targetOrgId) {
            claimQuery += ` WHERE c.organization_id = $1`;
            claimParams.push(targetOrgId);
        }
        const claimStats = await (0, database_1.query)(claimQuery, claimParams);
        // 4. Recent contributions (join with members for names)
        let recentQuery = `
            SELECT 
                c.id, c.amount, c.contribution_date, c.status,
                m.full_name as member_name,
                m.member_number
            FROM contributions c
            JOIN members m ON m.id = c.member_id
        `;
        const recentParams = [];
        if (targetOrgId) {
            recentQuery += ` WHERE c.organization_id = $1`;
            recentParams.push(targetOrgId);
        }
        recentQuery += ` ORDER BY c.created_at DESC LIMIT 10`;
        const recentContributions = await (0, database_1.query)(recentQuery, recentParams);
        // 5. Monthly contribution trend
        let trendQuery = `
            SELECT 
                TO_CHAR(date_trunc('month', contribution_date), 'Mon YYYY') as month,
                COALESCE(SUM(amount), 0) as total
            FROM contributions c
            WHERE contribution_date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '11 months'
                AND status = 'confirmed'
        `;
        const trendParams = [];
        if (targetOrgId) {
            trendQuery += ` AND c.organization_id = $1`;
            trendParams.push(targetOrgId);
        }
        trendQuery += ` GROUP BY date_trunc('month', contribution_date) ORDER BY date_trunc('month', contribution_date)`;
        const monthlyTrend = await (0, database_1.query)(trendQuery, trendParams);
        // 6. Send response
        res.json({
            members: memberStats.rows[0],
            contributions: contributionStats.rows[0],
            claims: claimStats.rows[0],
            recentContributions: recentContributions.rows,
            monthlyTrend: monthlyTrend.rows,
        });
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getDashboardStats = getDashboardStats;
