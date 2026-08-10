import { query } from '../../config/database';
import { claimQueries } from './claims.queries';

export class ClaimsService {
  async createClaim(data: any, userId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Generate claim number
      const claimNumber = `CLM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Insert claim
      const result = await client.query(claimQueries.create, [
        data.memberId, claimNumber, data.deceasedName, 
        data.relationship, data.dateOfDeath, data.amount, userId
      ]);
      
      const claimId = result.rows[0].id;
      
      // Log workflow
      await client.query(claimQueries.logWorkflow, [
        claimId, 'reported', 'reported', userId, 'Claim reported by member'
      ]);
      
      await client.query('COMMIT');
      
      return { id: claimId, claimNumber };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async advanceClaim(claimId: string, userId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get current status
      const current = await client.query(
        'SELECT status FROM claims WHERE id = $1',
        [claimId]
      );
      
      const statusFlow: Record<string, string> = {
  reported: 'leader_approved',
  leader_approved: 'admin_approved',
  admin_approved: 'processing',
  processing: 'paid'
};
      const nextStatus = statusFlow[current.rows[0].status];
      
      if (!nextStatus) {
        throw new Error('Claim cannot be advanced further');
      }
      
      // Update claim
      await client.query(claimQueries.updateStatus, [
        claimId, nextStatus, userId, nextStatus === 'paid' ? 'NOW()' : null
      ]);
      
      // Log workflow
      await client.query(claimQueries.logWorkflow, [
        claimId, current.rows[0].status, nextStatus, userId, 'Status advanced'
      ]);
      
      // If paid, create transaction record
      if (nextStatus === 'paid') {
        const claim = await client.query('SELECT amount, member_id FROM claims WHERE id = $1', [claimId]);
        await client.query(`
          INSERT INTO transactions (transaction_number, type, category, amount, member_id, claim_id, description)
          VALUES ($1, 'debit', 'claim_payout', $2, $3, $4, 'Death benefit payout')
        `, [`PAY-${Date.now()}`, claim.rows[0].amount, claim.rows[0].member_id, claimId]);
      }
      
      await client.query('COMMIT');
      
      return { claimId, status: nextStatus };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}