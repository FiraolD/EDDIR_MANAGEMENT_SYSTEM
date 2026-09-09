import { Request, Response } from 'express';
import { query } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const organizationId = req.user?.organization_id;
        const isSuperAdmin = req.user?.role === 'super_admin';
        const userRole = req.user?.role;

        console.log('Dashboard stats request:', { organizationId, isSuperAdmin, userRole });

        // Determine which organization to filter by
        let targetOrgId = null;
        if (isSuperAdmin) {
            targetOrgId = req.query.organization_id as string || null;
        } else if (organizationId) {
            targetOrgId = organizationId;
        }

        // Member stats
        let memberQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COALESCE(SUM(total_contributions), 0) as total_contributions
            FROM members
            WHERE 1=1
        `;
        const memberParams: any[] = [];
        if (targetOrgId) {
            memberQuery += ` AND organization_id = $1`;
            memberParams.push(targetOrgId);
        }
        const memberStats = await query(memberQuery, memberParams);

        // Contribution stats
        let contribQuery = `
            SELECT 
                COALESCE(SUM(amount), 0) as total,
                COALESCE(SUM(amount) FILTER (WHERE contribution_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) as this_month,
                COALESCE(SUM(amount) FILTER (WHERE contribution_date >= DATE_TRUNC('year', CURRENT_DATE)), 0) as this_year
            FROM contributions
            WHERE status = 'confirmed'
        `;
        const contribParams: any[] = [];
        if (targetOrgId) {
            contribQuery += ` AND organization_id = $1`;
            contribParams.push(targetOrgId);
        }
        const contributionStats = await query(contribQuery, contribParams);

        // Claim stats
        let claimQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status IN ('reported', 'leader_approved', 'admin_approved')) as pending,
                COUNT(*) FILTER (WHERE status = 'processing') as in_payout,
                COUNT(*) FILTER (WHERE status = 'paid') as paid,
                COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND paid_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) as total_paid_this_year,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as total_paid
            FROM claims
            WHERE 1=1
        `;
        const claimParams: any[] = [];
        if (targetOrgId) {
            claimQuery += ` AND organization_id = $1`;
            claimParams.push(targetOrgId);
        }
        const claimStats = await query(claimQuery, claimParams);

        // Recent contributions (limit 10) - FIXED: use u.full_name from users table
        let recentQuery = `
            SELECT 
                c.id, 
                c.amount, 
                c.contribution_date, 
                c.status,
                u.full_name as member_name, 
                m.member_number
            FROM contributions c
            JOIN members m ON m.id = c.member_id
            JOIN users u ON u.id = m.user_id
            WHERE c.status = 'confirmed'
        `;
        const recentParams: any[] = [];
        if (targetOrgId) {
            recentQuery += ` AND c.organization_id = $1`;
            recentParams.push(targetOrgId);
        }
        recentQuery += ` ORDER BY c.created_at DESC LIMIT 10`;
        const recentContributions = await query(recentQuery, recentParams);

        // Monthly trend (last 12 months)
        const trendQuery = `
            SELECT 
                TO_CHAR(date_trunc('month', contribution_date), 'Mon YYYY') as month,
                COALESCE(SUM(amount), 0) as total
            FROM contributions
            WHERE contribution_date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '11 months'
                AND status = 'confirmed'
            ${targetOrgId ? 'AND organization_id = $1' : ''}
            GROUP BY date_trunc('month', contribution_date)
            ORDER BY date_trunc('month', contribution_date)
        `;
        const trendParams: any[] = [];
        if (targetOrgId) {
            trendParams.push(targetOrgId);
        }
        const monthlyTrend = await query(trendQuery, trendParams);

        // If no trend data, return default months
        let trendData = monthlyTrend.rows;
        if (trendData.length === 0) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const currentMonth = new Date().getMonth();
            trendData = [];
            for (let i = 11; i >= 0; i--) {
                const monthIndex = (currentMonth - i + 12) % 12;
                trendData.push({
                    month: months[monthIndex],
                    total: 0
                });
            }
        }

        res.json({
            members: memberStats.rows[0] || { total: 0, active: 0, inactive: 0, pending: 0, total_contributions: 0 },
            contributions: contributionStats.rows[0] || { total: 0, this_month: 0, this_year: 0 },
            claims: claimStats.rows[0] || { total: 0, pending: 0, in_payout: 0, paid: 0, high_priority: 0, total_paid_this_year: 0, total_paid: 0 },
            recentContributions: recentContributions.rows || [],
            monthlyTrend: trendData,
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({ error: 'Internal server error', details: errorMessage });
    }
};

export const getDashboardChartData = async (req: AuthRequest, res: Response) => {
    try {
        const period = req.query.period as string || 'year';
        const organizationId = req.user?.organization_id;
        const isSuperAdmin = req.user?.role === 'super_admin';
        
        let targetOrgId = null;
        if (isSuperAdmin) {
            targetOrgId = req.query.organization_id as string || null;
        } else if (organizationId) {
            targetOrgId = organizationId;
        }

        let dateRange = "DATE_TRUNC('year', CURRENT_DATE)";
        let interval = 'month';
        
        switch (period) {
            case 'month':
                dateRange = "DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '30 days'";
                interval = 'day';
                break;
            case 'quarter':
                dateRange = "DATE_TRUNC('quarter', CURRENT_DATE)";
                interval = 'week';
                break;
            case 'year':
                dateRange = "DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '11 months'";
                interval = 'month';
                break;
        }

        const queryText = `
            SELECT 
                TO_CHAR(date_trunc('${interval}', contribution_date), '${interval === 'month' ? 'Mon YYYY' : interval === 'week' ? 'W YYYY' : 'DD Mon'}') as label,
                COALESCE(SUM(amount), 0) as value,
                COUNT(*) as count
            FROM contributions
            WHERE contribution_date >= ${dateRange}
                AND status = 'confirmed'
                ${targetOrgId ? 'AND organization_id = $1' : ''}
            GROUP BY date_trunc('${interval}', contribution_date)
            ORDER BY date_trunc('${interval}', contribution_date)
        `;
        
        const params: any[] = [];
        if (targetOrgId) {
            params.push(targetOrgId);
        }
        
        const result = await query(queryText, params);
        
        res.json({
            success: true,
            data: result.rows,
            period,
        });
    } catch (error) {
        console.error('Dashboard chart data error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({ error: 'Internal server error', details: errorMessage });
    }
};

export const getRecentActivity = async (req: AuthRequest, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const organizationId = req.user?.organization_id;
        const isSuperAdmin = req.user?.role === 'super_admin';
        
        let targetOrgId = null;
        if (isSuperAdmin) {
            targetOrgId = req.query.organization_id as string || null;
        } else if (organizationId) {
            targetOrgId = organizationId;
        }

        // Get recent members - FIXED: use u.full_name from users table
        let membersQuery = `
            SELECT 
                'member' as type,
                m.id,
                u.full_name as name,
                m.join_date as date,
                m.member_number
            FROM members m
            JOIN users u ON u.id = m.user_id
            WHERE 1=1
        `;
        const membersParams: any[] = [];
        if (targetOrgId) {
            membersQuery += ` AND m.organization_id = $1`;
            membersParams.push(targetOrgId);
        }
        membersQuery += ` ORDER BY m.join_date DESC LIMIT ${limit}`;
        const newMembers = await query(membersQuery, membersParams);

        // Get recent contributions - FIXED: use u.full_name from users table
        let contribQuery = `
            SELECT 
                'contribution' as type,
                c.id,
                u.full_name as name,
                c.contribution_date as date,
                c.amount
            FROM contributions c
            JOIN members m ON m.id = c.member_id
            JOIN users u ON u.id = m.user_id
            WHERE c.status = 'confirmed'
        `;
        const contribParams: any[] = [];
        if (targetOrgId) {
            contribQuery += ` AND c.organization_id = $1`;
            contribParams.push(targetOrgId);
        }
        contribQuery += ` ORDER BY c.created_at DESC LIMIT ${limit}`;
        const recentContribs = await query(contribQuery, contribParams);

        // Get recent claims - FIXED: use u.full_name from users table
        let claimsQuery = `
            SELECT 
                'claim' as type,
                c.id,
                u.full_name as name,
                c.created_at as date,
                c.amount,
                c.status
            FROM claims c
            JOIN members m ON m.id = c.member_id
            JOIN users u ON u.id = m.user_id
            WHERE 1=1
        `;
        const claimsParams: any[] = [];
        if (targetOrgId) {
            claimsQuery += ` AND c.organization_id = $1`;
            claimsParams.push(targetOrgId);
        }
        claimsQuery += ` ORDER BY c.created_at DESC LIMIT ${limit}`;
        const recentClaims = await query(claimsQuery, claimsParams);

        // Combine and sort by date
        const activities = [...newMembers.rows, ...recentContribs.rows, ...recentClaims.rows];
        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        res.json({
            success: true,
            activities: activities.slice(0, limit),
        });
    } catch (error) {
        console.error('Recent activity error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({ error: 'Internal server error', details: errorMessage });
    }
};