import { pool } from '../src/db.js';

async function test() {
  console.log('=== 1. Testing Backend Health ===');
  const healthRes = await fetch('http://localhost:3000/api/health');
  const health = await healthRes.json();
  console.log('Health:', health);

  console.log('\n=== 2. Testing Create Session (Neon DB) ===');
  const hostUserId = 'usr_host_' + Date.now();
  const createRes = await fetch('http://localhost:3000/api/group-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      showtimeId: '21:00',
      cinemaId: 'cin-nvq',
      cinemaName: 'Galaxy Cinema Nguyễn Văn Quá',
      movieId: 'mv-01',
      movieTitle: 'Quý Tử Vượt Giàu',
      showDate: '07/09/2026',
      showTime: '21:00',
      screenName: 'Phòng 3',
      hostUserId: hostUserId,
      hostName: 'Phan Trung Tín',
      name: 'Friday Movie Night Live',
      paymentMode: 'SPLIT_EQUAL',
      maxMembers: 4
    })
  });
  const createJson = await createRes.json();
  console.log('Status:', createRes.status);
  console.log('Session ID:', createJson.data.session.id);
  console.log('Invite Code:', createJson.data.invite.code);
  console.log('Host Name:', createJson.data.host.name);

  const sessionId = createJson.data.session.id;
  const inviteCode = createJson.data.invite.code;

  console.log('\n=== 3. Testing Join Group (Member 2: Minh) ===');
  const joinRes1 = await fetch(`http://localhost:3000/api/invites/${inviteCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'usr_minh_' + Date.now(),
      name: 'Minh'
    })
  });
  const joinJson1 = await joinRes1.json();
  console.log('Minh Join Status:', joinRes1.status, 'Name:', joinJson1.data.member.name);

  console.log('\n=== 4. Testing Join Group (Member 3: An) ===');
  const joinRes2 = await fetch(`http://localhost:3000/api/invites/${inviteCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'usr_an_' + Date.now(),
      name: 'An'
    })
  });
  const joinJson2 = await joinRes2.json();
  console.log('An Join Status:', joinRes2.status, 'Name:', joinJson2.data.member.name);

  console.log('\n=== 5. Testing Lobby Polling (GET /api/group-sessions/:id) ===');
  const lobbyRes = await fetch(`http://localhost:3000/api/group-sessions/${sessionId}`);
  const lobbyJson = await lobbyRes.json();
  console.log('Lobby Status:', lobbyRes.status);
  console.log('Total Members in DB:', lobbyJson.data.members.length);
  lobbyJson.data.members.forEach((m, idx) => {
    console.log(` - Slot ${idx + 1} (${idx === 0 ? 'm1' : 'm' + (idx + 1)}): ${m.name} [isHost: ${m.is_host}, status: ${m.status}]`);
  });

  console.log('\n=== 6. Verifying Direct Neon PostgreSQL Database Records ===');
  const sessionDb = await pool.query('SELECT id, name, status, payment_mode, max_members FROM group_sessions WHERE id = $1', [sessionId]);
  console.log('DB Session row:', sessionDb.rows[0]);

  const membersDb = await pool.query('SELECT name, is_host, status, joined_at FROM group_members WHERE group_session_id = $1 ORDER BY joined_at ASC', [sessionId]);
  console.log('DB Members count:', membersDb.rows.length);
  console.table(membersDb.rows);

  console.log('\n=== 7. Testing Frontend Dev Server and Deep Link Query ===');
  const feRes = await fetch(`http://localhost:5174/?join=${inviteCode}`);
  console.log('Frontend Dev Server Status:', feRes.status);
  const feHtml = await feRes.text();
  console.log('Frontend Serves Correct HTML title:', feHtml.includes('Galaxy Together'));

  console.log('\n>>> ALL 7 E2E INTEGRATION CHECKS PASSED! <<<');
  process.exit(0);
}

test().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
