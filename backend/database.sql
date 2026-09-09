-- ============================================
-- AWASH EDDIR MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ============================================

-- Drop existing tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS claim_workflow CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS claims CASCADE;
DROP TABLE IF EXISTS contributions CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS organization_leaders CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS organization_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS member_status CASCADE;
DROP TYPE IF EXISTS contribution_status CASCADE;
DROP TYPE IF EXISTS claim_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS transaction_category CASCADE;

-- ============================================
-- CREATE ENUM TYPES
-- ============================================

CREATE TYPE organization_type AS ENUM ('parent', 'edir');
CREATE TYPE user_role AS ENUM ('super_admin', 'org_admin', 'edir_leader', 'member');
CREATE TYPE member_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE contribution_status AS ENUM ('pending', 'confirmed', 'failed');
CREATE TYPE claim_status AS ENUM ('reported', 'leader_approved', 'admin_approved', 'claims_approved', 'processing', 'paid');
CREATE TYPE transaction_type AS ENUM ('credit', 'debit');
CREATE TYPE transaction_category AS ENUM ('contribution', 'claim_payout', 'registration', 'service_fee', 'utility');

-- ============================================
-- ORGANIZATIONS TABLE (Supports parent-child hierarchy)
-- ============================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    org_type organization_type DEFAULT 'edir',
    parent_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    subdomain VARCHAR(100) UNIQUE,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#000080',
    secondary_color VARCHAR(7) DEFAULT '#020617',
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    registration_number VARCHAR(100),
    settings JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS TABLE (Platform wide)
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role DEFAULT 'member',
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    fcm_token TEXT,
    is_active BOOLEAN DEFAULT true,
    token_version INTEGER NOT NULL DEFAULT 0,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
    token_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expiry ON password_reset_tokens(expires_at);

-- ============================================
-- ORGANIZATION LEADERS (Specific to each Edir)
-- ============================================

CREATE TABLE organization_leaders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'edir_leader',
    permissions JSONB DEFAULT '{}',
    appointed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, id)
);

-- ============================================
-- MEMBERS (Scoped to organization/Edir)
-- ============================================

CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    id UUID REFERENCES users(id) ON DELETE CASCADE,
    member_number VARCHAR(50) NOT NULL,
    status member_status DEFAULT 'pending',
    join_date DATE DEFAULT CURRENT_DATE,
    total_contributions DECIMAL(12,2) DEFAULT 0,
    last_contribution_date DATE,
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, member_number),
    UNIQUE(organization_id, id)
);

-- ============================================
-- CONTRIBUTIONS
-- ============================================

CREATE TABLE contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50),
    transaction_ref VARCHAR(255) UNIQUE,
    status contribution_status DEFAULT 'pending',
    recorded_by UUID REFERENCES users(id),
    contribution_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLAIMS
-- ============================================

CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    deceased_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    date_of_death DATE NOT NULL,
    date_reported DATE DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    status claim_status DEFAULT 'reported',
    priority VARCHAR(10) DEFAULT 'normal',
    documents TEXT[],
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLAIM WORKFLOW HISTORY
-- ============================================

CREATE TABLE claim_workflow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
    from_status claim_status,
    to_status claim_status NOT NULL,
    changed_by UUID REFERENCES users(id),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRANSACTIONS LEDGER
-- ============================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    transaction_number VARCHAR(100) UNIQUE NOT NULL,
    type transaction_type NOT NULL,
    category transaction_category NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    member_id UUID REFERENCES members(id),
    claim_id UUID REFERENCES claims(id),
    contribution_id UUID REFERENCES contributions(id),
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'completed',
    reference VARCHAR(255),
    description TEXT,
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SETTINGS (Organization-specific)
-- ============================================

CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Organizations
CREATE INDEX idx_organizations_parent ON organizations(parent_organization_id);
CREATE INDEX idx_organizations_type ON organizations(org_type);
CREATE INDEX idx_organizations_subdomain ON organizations(subdomain);

-- Users
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);

-- Members
CREATE INDEX idx_members_organization_id ON members(organization_id);
CREATE INDEX idx_members_id ON members(id);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_member_number ON members(member_number);

-- Contributions
CREATE INDEX idx_contributions_organization_id ON contributions(organization_id);
CREATE INDEX idx_contributions_member_id ON contributions(member_id);
CREATE INDEX idx_contributions_status ON contributions(status);
CREATE INDEX idx_contributions_date ON contributions(contribution_date);

-- Claims
CREATE INDEX idx_claims_organization_id ON claims(organization_id);
CREATE INDEX idx_claims_member_id ON claims(member_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_priority ON claims(priority) WHERE priority = 'high';

-- Transactions
CREATE INDEX idx_transactions_organization_id ON transactions(organization_id);
CREATE INDEX idx_transactions_member_id ON transactions(member_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(type);

-- Notifications
CREATE INDEX idx_notifications_id ON notifications(id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;

-- Audit logs
CREATE INDEX idx_audit_logs_id ON audit_logs(id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Organization leaders
CREATE INDEX idx_organization_leaders_org_id ON organization_leaders(organization_id);
CREATE INDEX idx_organization_leaders_id ON organization_leaders(id);

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- 1. Insert Awash Insurance (Parent Organization)
INSERT INTO organizations (id, name, org_type, subdomain, email, phone, address, registration_number, settings) 
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Awash Insurance',
    'parent',
    'awash-insurance',
    'info@awashinsurance.com',
    '+251115555555',
    'Addis Ababa, Ethiopia',
    'INS-2024-001',
    '{"type": "insurance_provider", "headquarters": "Addis Ababa"}'::JSONB
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert Super Admin (under Awash Insurance parent organization)
-- Password: Admin@123 (bcrypt hash)
INSERT INTO users (id, email, phone, full_name, password_hash, role, organization_id) 
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'superadmin@awash.com',
    '+251911111111',
    'Super Admin',
    '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrZkpJRHbEeF3wUfJX.3XxXxXxXxXx.',
    'super_admin',
    '11111111-1111-1111-1111-111111111111'
) ON CONFLICT (email) DO NOTHING;

-- 3. Insert Awash Main Edir (Child Organization under Awash Insurance)
INSERT INTO organizations (id, name, org_type, parent_organization_id, subdomain, email, phone, address, registration_number) 
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Awash Main Edir',
    'edir',
    '11111111-1111-1111-1111-111111111111',
    'awash-main-edir',
    'main@awasheidir.com',
    '+251912222333',
    'Addis Ababa, Bole Sub-city',
    'EDIR-2024-001'
) ON CONFLICT (id) DO NOTHING;

-- 4. Insert Awash North Edir (Another child organization)
INSERT INTO organizations (id, name, org_type, parent_organization_id, subdomain, email, phone, address, registration_number) 
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Awash North Edir',
    'edir',
    '11111111-1111-1111-1111-111111111111',
    'awash-north-edir',
    'north@awasheidir.com',
    '+251913333444',
    'Addis Ababa, Gulele Sub-city',
    'EDIR-2024-002'
) ON CONFLICT (id) DO NOTHING;

-- 5. Insert Awash South Edir (Another child organization)
INSERT INTO organizations (id, name, org_type, parent_organization_id, subdomain, email, phone, address, registration_number) 
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'Awash South Edir',
    'edir',
    '11111111-1111-1111-1111-111111111111',
    'awash-south-edir',
    'south@awasheidir.com',
    '+251914444555',
    'Addis Ababa, Nifas Silk',
    'EDIR-2024-003'
) ON CONFLICT (id) DO NOTHING;

-- 6. Insert Edir Leader for Awash Main Edir (Password: Admin@123)
INSERT INTO users (id, email, phone, full_name, password_hash, role, organization_id) 
VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'leader@awashmain.com',
    '+251912222333',
    'Abebe Kebede',
    '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrZkpJRHbEeF3wUfJX.3XxXxXxXxXx.',
    'edir_leader',
    '44444444-4444-4444-4444-444444444444'
) ON CONFLICT (email) DO NOTHING;

-- Add to organization_leaders
INSERT INTO organization_leaders (organization_id, id, role) 
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'edir_leader'
) ON CONFLICT (organization_id, id) DO NOTHING;

-- 7. Insert Edir Leader for Awash North Edir (Password: Admin@123)
INSERT INTO users (id, email, phone, full_name, password_hash, role, organization_id) 
VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'leader@awashnorth.com',
    '+251913333444',
    'Tigist Haile',
    '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrZkpJRHbEeF3wUfJX.3XxXxXxXxXx.',
    'edir_leader',
    '33333333-3333-3333-3333-333333333333'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO organization_leaders (organization_id, id, role) 
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'edir_leader'
) ON CONFLICT (organization_id, id) DO NOTHING;

-- 8. Insert regular member for Awash Main Edir (Password: Member@123)
INSERT INTO users (id, email, phone, full_name, password_hash, role, organization_id) 
VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'member@awashmain.com',
    '+251915555666',
    'Kebede Tesfaye',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'member',
    '22222222-2222-2222-2222-222222222222'
) ON CONFLICT (email) DO NOTHING;

-- Create member profile
INSERT INTO members (organization_id, id, member_number, status, join_date, address) 
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'MEM-MAIN-001',
    'active',
    CURRENT_DATE,
    'Addis Ababa, Bole Sub-city'
) ON CONFLICT (organization_id, id) DO NOTHING;

-- 9. Insert another regular member for Awash Main Edir (Password: Member@123)
INSERT INTO users (id, email, phone, full_name, password_hash, role, organization_id) 
VALUES (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'member2@awashmain.com',
    '+251916666777',
    'Mulugeta Demeke',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'member',
    '22222222-2222-2222-2222-222222222222'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO members (organization_id, id, member_number, status, join_date, address) 
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'MEM-MAIN-002',
    'active',
    CURRENT_DATE,
    'Addis Ababa, Kazanchis'
) ON CONFLICT (organization_id, id) DO NOTHING;

-- 10. Insert default settings for each Edir
INSERT INTO settings (key, value, organization_id) VALUES 
('monthly_contribution', '{"amount": 500, "currency": "ETB"}', '22222222-2222-2222-2222-222222222222'),
('claim_limit', '{"max_amount": 50000, "processing_days": 3}', '22222222-2222-2222-2222-222222222222');

INSERT INTO settings (key, value, organization_id) VALUES 
('monthly_contribution', '{"amount": 500, "currency": "ETB"}', '33333333-3333-3333-3333-333333333333'),
('claim_limit', '{"max_amount": 50000, "processing_days": 3}', '33333333-3333-3333-3333-333333333333')
;

INSERT INTO settings (key, value, organization_id) VALUES 
('monthly_contribution', '{"amount": 500, "currency": "ETB"}', '44444444-4444-4444-4444-444444444444'),
('claim_limit', '{"max_amount": 50000, "processing_days": 3}', '44444444-4444-4444-4444-444444444444')
ON CONFLICT (key, organization_id) DO NOTHING;

-- ============================================
-- VERIFY SETUP
-- ============================================

SELECT 'Database migration completed successfully!' as status;

-- Show summary
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM organizations) as total_organizations,
    (SELECT COUNT(*) FROM members) as total_members;

-- Show organization hierarchy
SELECT 
    o.name as organization_name,
    o.org_type,
    p.name as parent_organization,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT m.id) as total_members
FROM organizations o
LEFT JOIN organizations p ON p.id = o.parent_organization_id
LEFT JOIN users u ON u.organization_id = o.id
LEFT JOIN members m ON m.organization_id = o.id
GROUP BY o.name, o.org_type, p.name
ORDER BY o.org_type DESC, o.name;