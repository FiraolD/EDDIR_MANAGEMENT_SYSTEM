import { query } from '../src/config/database';
import { hashPassword } from '../src/utils/bcrypt';

const users = [
  {
    email: 'ui_test_leader@local',
    phone: '+251999000111',
    fullName: 'UI Test Leader',
    role: 'edir_leader',
    organization_id: '22222222-2222-2222-2222-222222222222',
    password: 'Test@1234',
  },
  {
    email: 'ui_test_org_admin@local',
    phone: '+251999000222',
    fullName: 'UI Test Org Admin',
    role: 'org_admin',
    organization_id: '22222222-2222-2222-2222-222222222222',
    password: 'Admin@1234',
  },
  {
    email: 'ui_test_finance@local',
    phone: '+251999000333',
    fullName: 'UI Test Finance',
    role: 'finance',
    organization_id: '22222222-2222-2222-2222-222222222222',
    password: 'Finance@1234',
  },
];

const run = async () => {
  try {
    for (const user of users) {
      const existing = await query('SELECT id FROM users WHERE email = $1', [user.email]);
      const passwordHash = await hashPassword(user.password);

      if (existing.rows.length > 0) {
        await query(
          'UPDATE users SET phone = $1, full_name = $2, password_hash = $3, role = $4, organization_id = $5, is_active = true, updated_at = NOW() WHERE email = $6',
          [user.phone, user.fullName, passwordHash, user.role, user.organization_id, user.email]
        );
        console.log(`Updated existing user ${user.email}`);
      } else {
        await query(
          `INSERT INTO users (email, phone, full_name, password_hash, role, organization_id, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [user.email, user.phone, user.fullName, passwordHash, user.role, user.organization_id]
        );
        console.log(`Created user ${user.email}`);
      }
    }

    console.log('All test users created/updated.');
  } catch (error) {
    console.error('Failed creating test users:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

run();
