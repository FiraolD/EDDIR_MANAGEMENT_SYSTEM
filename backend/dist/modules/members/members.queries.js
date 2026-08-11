"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memberQueries = void 0;
exports.memberQueries = {
    // Get all members with pagination (mobile-friendly)
    getAll: `
    SELECT 
      m.id, m.member_number, u.full_name, u.phone, u.email,
      m.status, m.join_date, m.total_contributions, m.last_contribution_date,
      m.address, m.emergency_contact_name, m.emergency_contact_phone
    FROM members m
    JOIN users u ON u.id = m.id
    WHERE ($1::text IS NULL OR u.full_name ILIKE $1)
      AND ($2::text IS NULL OR m.status = $2)
    ORDER BY m.join_date DESC
    LIMIT $3 OFFSET $4
  `,
    // Get single member with full details
    getById: `
    SELECT 
      m.*, 
      u.full_name, u.email, u.phone, u.role,
      json_agg(DISTINCT jsonb_build_object(
        'id', c.id, 'amount', c.amount, 'date', c.contribution_date, 'status', c.status
      )) FILTER (WHERE c.id IS NOT NULL) as recent_contributions,
      json_agg(DISTINCT jsonb_build_object(
        'id', cl.id, 'claim_number', cl.claim_number, 'amount', cl.amount, 'status', cl.status
      )) FILTER (WHERE cl.id IS NOT NULL) as claims
    FROM members m
    JOIN users u ON u.id = m.id
    LEFT JOIN contributions c ON c.member_id = m.id AND c.contribution_date > NOW() - INTERVAL '90 days'
    LEFT JOIN claims cl ON cl.member_id = m.id
    WHERE m.id = $1
    GROUP BY m.id, u.id
  `,
    // Member statistics for dashboard
    getStats: `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'active') as active,
      COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COALESCE(SUM(total_contributions), 0) as total_contributions
    FROM members
  `,
    // Create member (transaction-safe)
    create: `
    WITH new_user AS (
      INSERT INTO users (email, phone, full_name, password_hash, role)
      VALUES ($1, $2, $3, $4, 'member')
      RETURNING id
    )
    INSERT INTO members (id, member_number, status, join_date)
    SELECT id, $5, 'active', CURRENT_DATE
    FROM new_user
    RETURNING id, member_number
  `,
    // Update member status
    updateStatus: `
    UPDATE members 
    SET status = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `,
};
