const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5020;

// Database connection
const pool = new Pool({
    host: 'localhost',
    port: 5434,
    database: 'EMS',
    user: 'postgres',
    password: 'postgres'
});

app.use(cors({
    origin: ['http://localhost:3025', 'http://127.0.0.1:3025'],
    credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== AUTH ROUTES ====================

app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        console.log('Login attempt:', identifier);
        
        const result = await pool.query(
            'SELECT id, email, phone, full_name, password_hash, role, organization_id FROM users WHERE email = $1 OR phone = $1',
            [identifier, identifier]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, organization_id: user.organization_id },
            'secret-key',
            { expiresIn: '7d' }
        );
        
        res.json({
            accessToken: token,
            refreshToken: token,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                fullName: user.full_name,
                role: user.role,
                organization_id: user.organization_id
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== DASHBOARD ROUTES ====================

app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const members = await pool.query('SELECT COUNT(*) as total FROM members');
        const contributions = await pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM contributions');
        
        res.json({
            members: { total: parseInt(members.rows[0].total) || 0, active: 0, inactive: 0, pending: 0, total_contributions: 0 },
            contributions: { total: parseFloat(contributions.rows[0].total) || 0, this_month: 0, this_year: 0 },
            claims: { total: 0, reported: 0, leader_approved: 0, admin_approved: 0, processing: 0, paid: 0, high_priority: 0, total_paid_this_year: 0 },
            recentContributions: [],
            monthlyTrend: [
                { name: 'Jan', amount: 45000 },
                { name: 'Feb', amount: 52000 },
                { name: 'Mar', amount: 48000 },
                { name: 'Apr', amount: 61000 },
                { name: 'May', amount: 55000 },
                { name: 'Jun', amount: 67000 }
            ]
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== MEMBERS ROUTES ====================

app.get('/api/members', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                m.id, m.member_number, u.full_name, u.phone, u.email,
                m.status, m.join_date, m.total_contributions,
                u.role, o.name as organization_name
            FROM members m
            JOIN users u ON u.id = m.user_id
            LEFT JOIN organizations o ON o.id = m.organization_id
            ORDER BY m.join_date DESC
            LIMIT 20
        `);
        
        res.json({
            members: result.rows,
            pagination: { page: 1, limit: 20, total: result.rows.length, totalPages: 1 }
        });
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== CONTRIBUTIONS ROUTES ====================

app.get('/api/contributions', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.*,
                u.full_name as member_name,
                m.member_number
            FROM contributions c
            JOIN members m ON m.id = c.member_id
            JOIN users u ON u.id = m.user_id
            ORDER BY c.contribution_date DESC
            LIMIT 20
        `);
        
        res.json({
            contributions: result.rows,
            stats: { total: 0, this_month: 0, this_year: 0, pending: 0, confirmed: 0 },
            pagination: { page: 1, limit: 20, total: result.rows.length, totalPages: 1 }
        });
    } catch (error) {
        console.error('Get contributions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== CLAIMS ROUTES ====================

app.get('/api/claims', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.*,
                u.full_name as member_name,
                m.member_number
            FROM claims c
            JOIN members m ON m.id = c.member_id
            JOIN users u ON u.id = m.user_id
            ORDER BY c.created_at DESC
            LIMIT 20
        `);
        
        res.json({
            claims: result.rows,
            stats: { total: 0, pending: 0, in_payout: 0, paid_this_month: 0 },
            pagination: { page: 1, limit: 20, total: result.rows.length, totalPages: 1 }
        });
    } catch (error) {
        console.error('Get claims error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== TRANSACTIONS ROUTES ====================

app.get('/api/transactions', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                t.*,
                u.full_name as member_name,
                m.member_number
            FROM transactions t
            LEFT JOIN members m ON m.id = t.member_id
            LEFT JOIN users u ON u.id = m.user_id
            ORDER BY t.transaction_date DESC
            LIMIT 20
        `);
        
        res.json({
            transactions: result.rows,
            stats: { total_inflow: 0, total_outflow: 0, net_movement: 0 },
            pagination: { page: 1, limit: 20, total: result.rows.length, totalPages: 1 }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== ORGANIZATIONS ROUTES ====================

app.get('/api/organizations', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM organizations ORDER BY created_at DESC');
        
        res.json({
            organizations: result.rows,
            pagination: { page: 1, limit: 10, total: result.rows.length, totalPages: 1 }
        });
    } catch (error) {
        console.error('Get organizations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== USERS ROUTES ====================

app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id, u.email, u.phone, u.full_name, u.role, u.is_active,
                o.name as organization_name
            FROM users u
            LEFT JOIN organizations o ON o.id = u.organization_id
            ORDER BY u.created_at DESC
        `);
        
        res.json({
            users: result.rows,
            pagination: { page: 1, limit: 100, total: result.rows.length, totalPages: 1 }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== USER PERMISSIONS ====================

app.get('/api/users/me/permissions', (req, res) => {
    res.json({
        success: true,
        role: 'super_admin',
        permissions: ['organization.read', 'member.read', 'contribution.read', 'claim.read']
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`🔗 API URL: http://localhost:${PORT}/api`);
    console.log(`📝 Health check: http://localhost:${PORT}/health`);
});