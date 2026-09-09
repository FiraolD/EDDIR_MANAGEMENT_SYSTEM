-- Migration: add 'claims_approved' to claim_status enum and add created_by to claims table
-- Safe operations: only add value/column if they don't already exist.

-- 1) Add enum value 'claims_approved' if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'claim_status' AND e.enumlabel = 'claims_approved'
    ) THEN
        ALTER TYPE claim_status ADD VALUE 'claims_approved';
    END IF;
END$$;

-- 2) Add created_by column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='claims' AND column_name='created_by'
    ) THEN
        ALTER TABLE claims ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
END$$;

-- 3) Backfill created_by for historical rows when possible: set to approved_by where available
-- (Optional; uncomment to run)
-- UPDATE claims SET created_by = approved_by WHERE created_by IS NULL AND approved_by IS NOT NULL;

-- End of migration
