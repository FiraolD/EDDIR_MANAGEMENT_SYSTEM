-- A claim can produce at most one payout ledger entry.
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_claim_payout
ON transactions (claim_id)
WHERE category = 'claim_payout' AND claim_id IS NOT NULL;