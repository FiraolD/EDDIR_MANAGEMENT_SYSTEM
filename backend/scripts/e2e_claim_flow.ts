import fetch from 'node-fetch';

const login = async (identifier: string, password: string) => {
  const res = await fetch('http://localhost:5020/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Login failed for ${identifier}: ${data.error || res.status}`);
  }
  return data;
};

const createClaim = async (token: string, memberId: string) => {
  const res = await fetch('http://localhost:5020/api/claims', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      member_id: memberId,
      deceased_name: 'E2E Test Deceased',
      relationship: 'spouse',
      date_of_death: '2026-08-02',
      amount: 15000,
      notes: 'End-to-end claim workflow test',
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Create claim failed: ${data.error || res.status}`);
  }
  return data.claim;
};

const advanceClaim = async (token: string, claimId: string, role: string) => {
  const res = await fetch(`http://localhost:5020/api/claims/${claimId}/advance`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Advance claim failed for ${role}: ${data.error || res.status}`);
  }
  return data;
};

const run = async () => {
  try {
    const leader = await login('ui_test_leader@local', 'Test@1234');
    const orgAdmin = await login('ui_test_org_admin@local', 'Admin@1234');
    const finance = await login('ui_test_finance@local', 'Finance@1234');

    console.log('Logged in users:', leader.user.role, orgAdmin.user.role, finance.user.role);

    const claim = await createClaim(leader.accessToken, leader.user.id);
    console.log('Created claim', claim.id, 'status', claim.status);

    const step1 = await advanceClaim(leader.accessToken, claim.id, 'leader');
    console.log('Leader advanced claim:', step1.status);

    const step2 = await advanceClaim(orgAdmin.accessToken, claim.id, 'org_admin');
    console.log('Org admin advanced claim:', step2.status);

    const step3 = await advanceClaim(orgAdmin.accessToken, claim.id, 'org_admin');
    console.log('Org admin advanced claim:', step3.status);

    const step4 = await advanceClaim(finance.accessToken, claim.id, 'finance');
    console.log('Finance advanced claim:', step4.status);

    console.log('Workflow complete. Final status:', step4.status);
  } catch (error) {
    console.error('E2E workflow failed:', error);
    process.exit(1);
  }
};

run();
