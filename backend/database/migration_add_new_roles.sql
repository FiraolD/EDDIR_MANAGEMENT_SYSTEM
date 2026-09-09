-- ============================================
-- Migration: Add New Roles and Permissions
-- Step-by-step execution
-- ============================================

BEGIN;

-- Step 1: First add the new roles to the enum
-- Instead of renaming, we'll add the new values first

-- Check if we need to add new values to the existing enum
DO $$ 
BEGIN
    -- Add new values to the user_role enum if they don't exist
    -- We do this by creating a new enum type and migrating
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_new') THEN
        -- Create new enum with all values
        CREATE TYPE user_role_new AS ENUM (
            'super_admin',
            'org_admin',
            'claims_manager',
            'finance_processor',
            'finance_approver',
            'finance_recon',
            'finance_auditor',
            'edir_leader',
            'member'
        );
        
        -- Update users table to use the new enum
        ALTER TABLE users ALTER COLUMN role TYPE user_role_new 
        USING role::text::user_role_new;
        
        -- Rename the enums
        DROP TYPE user_role;
        ALTER TYPE user_role_new RENAME TO user_role;
    END IF;
END $$;

-- Step 2: Create role_permissions table if not exists
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role user_role NOT NULL,
    permission VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission)
);

-- Step 3: Create approval_workflows table
CREATE TABLE IF NOT EXISTS approval_workflows (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create approval_requests table
CREATE TABLE IF NOT EXISTS approval_requests (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES approval_workflows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    approver_role user_role NOT NULL,
    approver_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    comments TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

-- Step 5: Create audit_logs table (enhanced)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Clear existing permissions and insert new ones
TRUNCATE role_permissions;

-- Super Admin - All permissions
INSERT INTO role_permissions (role, permission) VALUES
('super_admin', '*');

-- Finance Processor
INSERT INTO role_permissions (role, permission) VALUES
('finance_processor', 'payment.initiate'),
('finance_processor', 'payment.view'),
('finance_processor', 'payment.batch'),
('finance_processor', 'claim.view'),
('finance_processor', 'contribution.view');

-- Finance Approver (Dual Control)
INSERT INTO role_permissions (role, permission) VALUES
('finance_approver', 'payment.approve'),
('finance_approver', 'payment.view'),
('finance_approver', 'payment.authorize'),
('finance_approver', 'claim.view'),
('finance_approver', 'contribution.view');

-- Finance Reconciliation
INSERT INTO role_permissions (role, permission) VALUES
('finance_recon', 'reconciliation.view'),
('finance_recon', 'reconciliation.match'),
('finance_recon', 'reconciliation.discrepancy'),
('finance_recon', 'payment.view'),
('finance_recon', 'claim.view');

-- Finance Auditor
INSERT INTO role_permissions (role, permission) VALUES
('finance_auditor', 'audit.view'),
('finance_auditor', 'audit.export'),
('finance_auditor', 'report.financial'),
('finance_auditor', 'payment.view'),
('finance_auditor', 'claim.view'),
('finance_auditor', 'contribution.view');

-- Org Admin
INSERT INTO role_permissions (role, permission) VALUES
('org_admin', 'org.manage'),
('org_admin', 'member.create'),
('org_admin', 'member.read'),
('org_admin', 'member.update'),
('org_admin', 'member.delete'),
('org_admin', 'leader.assign'),
('org_admin', 'claim.view'),
('org_admin', 'claim.approve_operational'),
('org_admin', 'payment.verify'),
('org_admin', 'report.view');

-- Claims Manager
INSERT INTO role_permissions (role, permission) VALUES
('claims_manager', 'claim.read'),
('claims_manager', 'claim.review'),
('claims_manager', 'claim.approve'),
('claims_manager', 'claim.advance'),
('claims_manager', 'claim.fraud_assessment'),
('claims_manager', 'claim.report');

-- Edir Leader
INSERT INTO role_permissions (role, permission) VALUES
('edir_leader', 'member.read'),
('edir_leader', 'payment.record'),
('edir_leader', 'claim.record'),
('edir_leader', 'user.manage'),
('edir_leader', 'notification.view'),
('edir_leader', 'org.view_own');

-- Member
INSERT INTO role_permissions (role, permission) VALUES
('member', 'profile.view'),
('member', 'profile.update'),
('member', 'claim.view_own'),
('member', 'payment.view_own'),
('member', 'contribution.view_own');

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_approval_requests_workflow ON approval_requests(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);

COMMIT;

-- Step 9: Verify the migration
SELECT 'Migration completed successfully!' as status;
SELECT rolname, count(*) as user_count 
FROM pg_roles r 
JOIN users u ON u.role::text = r.rolname
GROUP BY rolname;