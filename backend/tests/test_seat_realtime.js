import WebSocket from 'ws';
import assert from 'assert';

async function testSeatRealtime() {
  console.log('==================================================');
  console.log('💺 TESTING REALTIME SEAT LOCKING & SYNCHRONIZATION');
  console.log('==================================================');

  const hostUserId = `usr_host_${Date.now()}`;
  const guestUserId = `usr_guest_${Date.now()}`;

  // 1. Create Session
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
      hostUserId,
      hostName: 'Tín Host',
      name: 'Seat Sync Test Group',
      paymentMode: 'split',
      maxMembers: 4,
    }),
  });

  const createData = await createRes.json();
  const sessionId = createData.data.session.id;
  const inviteCode = createData.data.invite.code;
  console.log(`[Step 1] Session created: ${sessionId}, Code: ${inviteCode}`);

  // 2. Host Connects via WebSocket
  const hostWs = new WebSocket(`ws://localhost:3000/ws?sessionId=${sessionId}&userId=${hostUserId}`);
  const hostEvents = [];

  await new Promise((resolve, reject) => {
    hostWs.on('open', resolve);
    hostWs.on('error', reject);
    hostWs.on('message', (raw) => {
      const parsed = JSON.parse(raw.toString());
      hostEvents.push(parsed);
    });
  });
  console.log('[Step 2] Host connected to WebSocket room');

  // 3. Guest Joins Session
  await fetch(`http://localhost:3000/api/invites/${inviteCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: guestUserId, name: 'Minh Guest' }),
  });
  console.log('[Step 3] Guest joined session via invite code');

  // 4. Guest Holds Seat 'G10' via REST API
  const holdRes = await fetch(`http://localhost:3000/api/group-sessions/${sessionId}/seats/hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seatId: 'G10',
      seatCode: 'G10',
      userId: guestUserId,
    }),
  });
  const holdData = await holdRes.json();
  assert.strictEqual(holdRes.status, 201, 'Should return 201 Created for seat hold');
  console.log('[Step 4] Guest held seat G10 via API');

  // Wait for WS event on Host
  await new Promise((r) => setTimeout(r, 500));
  const seatHeldEvent = hostEvents.find((e) => e.type === 'SEAT_HELD' && e.payload?.seatId === 'G10');
  assert.ok(seatHeldEvent, 'Host should receive SEAT_HELD WebSocket broadcast');
  console.log(`✓ Host received SEAT_HELD broadcast for G10:`, seatHeldEvent.payload);

  // 5. Verify GET /api/group-sessions/:id/seats
  const seatsRes = await fetch(`http://localhost:3000/api/group-sessions/${sessionId}/seats`);
  const seatsData = await seatsRes.json();
  assert.strictEqual(seatsData.data.length, 1, 'Should have 1 active held seat');
  assert.strictEqual(seatsData.data[0].seat_id, 'G10');
  console.log('[Step 5] GET /seats returned 1 active held seat: G10');

  // 6. Guest Releases Seat 'G10' via REST API
  const releaseRes = await fetch(`http://localhost:3000/api/group-sessions/${sessionId}/seats/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seatId: 'G10',
      userId: guestUserId,
    }),
  });
  const releaseData = await releaseRes.json();
  assert.strictEqual(releaseRes.status, 200, 'Should return 200 OK for seat release');
  console.log('[Step 6] Guest released seat G10');

  // Wait for WS event on Host
  await new Promise((r) => setTimeout(r, 500));
  const seatReleasedEvent = hostEvents.find((e) => e.type === 'SEAT_RELEASED' && e.payload?.seatId === 'G10');
  assert.ok(seatReleasedEvent, 'Host should receive SEAT_RELEASED WebSocket broadcast');
  console.log(`✓ Host received SEAT_RELEASED broadcast for G10`);

  hostWs.close();
  console.log('==================================================');
  console.log('🎉 ALL REALTIME SEAT SYNCHRONIZATION TESTS PASSED');
  console.log('==================================================');
}

testSeatRealtime().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
