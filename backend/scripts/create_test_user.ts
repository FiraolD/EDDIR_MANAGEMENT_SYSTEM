import { query } from '../src/config/database';
import { hashPassword } from '../src/utils/bcrypt';

const makeTestUser = async () => {
  try {
    const email = 'ui_test_leader@local';
    const phone = '+251999000111';
    const fullName = 'UI Test Leader';
    const plainPassword = 'Test@1234';
    const orgId = '22222222-2222-2222-2222-222222222222'; // Awash Main Edir

    // Check existing
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      const hash = await hashPassword(plainPassword);
      await query('UPDATE users SET password_hash = $1, role = $2, organization_id = $3, updated_at = NOW() WHERE id = $4', [hash, 'edir_leader', orgId, id]);
      await query('INSERT INTO members (id, organization_id, member_number, status, join_date) VALUES ($1, $2, $3, $4, CURRENT_DATE) ON CONFLICT (id) DO NOTHING', [id, orgId, `MEM-UI-${Date.now()}`, 'active']);
      console.log('Updated existing test user:', email);
      console.log('Credentials ->', { email, password: plainPassword });
      return;
    }

    const passwordHash = await hashPassword(plainPassword);
    const result = await query(
      `INSERT INTO users (email, phone, full_name, password_hash, role, organization_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id`,
      [email, phone, fullName, passwordHash, 'edir_leader', orgId]
    );

    const userId = result.rows[0].id;
    const memberNumber = `MEM-UI-${Date.now()}`;
    await query(
      `INSERT INTO members (id, organization_id, member_number, status, join_date)
       VALUES ($1, $2, $3, 'active', CURRENT_DATE) ON CONFLICT (id) DO NOTHING`,
      [userId, orgId, memberNumber]
    );

    console.log('Created test user:', email);
    console.log('Credentials ->', { email, password: plainPassword });
  } catch (err) {
    console.error('Failed to create test user:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

makeTestUser();
