import { getClient } from '../../config/database';

export class ClaimsService {
  async createClaim(data: any, userId: string) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const claimNumber = `CLM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const result = await client.query(
        `INSERT INTO claims (
            member_id, organization_id, claim_number,
            deceased_name, relationship, date_of_death,
            amount, notes, status, documents, created_by, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'reported'::claim_status, $9, $10, NOW(), NOW()) RETURNING *`,
        [
          data.member_id,
          data.organization_id || null,
          claimNumber,
          data.deceased_name,
          data.relationship,
          data.date_of_death,
          data.amount,
          data.notes || null,
          data.documents || [],
          userId
        ]
      );

      const claimId = result.rows[0].id;

      await client.query(
        `INSERT INTO claim_workflow (claim_id, from_status, to_status, changed_by, comments, created_at)
         VALUES ($1, NULL, 'reported'::claim_status, $2, $3, NOW())`,
        [claimId, userId, 'Claim reported']
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async advanceClaim(claimId: string, userId: string) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const currentRes = await client.query('SELECT status, amount, member_id, organization_id FROM claims WHERE id = $1', [claimId]);
      if (currentRes.rows.length === 0) throw new Error('Claim not found');
      const currentStatus = currentRes.rows[0].status;

      const statusFlow: Record<string, string> = {
        reported: 'admin_approved',
        admin_approved: 'claims_approved',
        claims_approved: 'processing',
        processing: 'paid',
      };

      const nextStatus = statusFlow[currentStatus];
      if (!nextStatus) throw new Error('Claim cannot be advanced further');

      const updateRes = await client.query(
        `UPDATE claims SET
           status = $1::claim_status,
           approved_by = CASE WHEN $1::claim_status IN ('leader_approved','admin_approved','claims_approved') THEN $2 ELSE approved_by END,
           approved_at = CASE WHEN $1::claim_status IN ('leader_approved','admin_approved','claims_approved') THEN NOW() ELSE approved_at END,
           paid_at = CASE WHEN $1::claim_status = 'paid' THEN NOW() ELSE paid_at END,
           updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [nextStatus, userId, claimId]
      );

      await client.query(
        `INSERT INTO claim_workflow (claim_id, from_status, to_status, changed_by, comments, created_at)
         VALUES ($1, $2::claim_status, $3::claim_status, $4, $5, NOW())`,
        [claimId, currentStatus, nextStatus, userId, `Advanced from ${currentStatus} to ${nextStatus}`]
      );

      if (nextStatus === 'paid') {
        const claim = currentRes.rows[0];
        const transactionNumber = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        await client.query(
          `INSERT INTO transactions (transaction_number, type, category, amount, member_id, claim_id, description, organization_id, created_at)
           VALUES ($1, 'debit', 'claim_payout', $2, $3, $4, 'Death benefit payout', $5, NOW())`,
          [transactionNumber, claim.amount, claim.member_id, claimId, claim.organization_id]
        );
      }

      await client.query('COMMIT');
      return updateRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}