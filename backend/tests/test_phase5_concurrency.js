/**
 * Phase 5: Shared Seat Booking & Concurrency Locking Automated Test Suite
 * Tests atomic seat locking, race condition resolution, WebSocket broadcast, and release lifecycles.
 */

import WebSocket from 'ws';
import assert from 'assert';

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

async function runPhase5Tests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING PHASE 5: SHARED SEAT BOOKING & CONCURRENCY TESTS');
  console.log('===============================================================');

  const timestamp = Date.now();
  const hostUserId = `usr_tin_${timestamp}`;
  const guest1UserId = `usr_minh_${timestamp}`;
  const guest2UserId = `usr_an_${timestamp}`;

  // ─── STEP 1: CREATE GROUP SESSION ───
  console.log('\n[1/7] Creating new group session...');
  const createRes = await fetch(`${BASE_URL}/api/group-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      showtimeId: `st_2100_${timestamp}`,
      cinemaId: 'cin-nvq',
      cinemaName: 'Galaxy Cinema Nguyễn Văn Quá',
      movieId: 'mv-01',
      movieTitle: 'Quý Tử Vượt Giàu',
      showDate: '07/09/2026',
      showTime: '21:00',
      screenName: 'Phòng 3',
      hostUserId,
      hostName: 'Tín (Host)',
      name: 'Phase 5 Concurrency Test',
      paymentMode: 'split',
      maxMembers: 4,
    }),
  });

  assert.strictEqual(createRes.status, 201, 'Session creation should return 201');
  const createData = await createRes.json();
  const sessionId = createData.data.session.id;
  const inviteCode = createData.data.invite.code;
  console.log(`✓ Session created: ${sessionId} (Invite Code: ${inviteCode})`);

  // ─── STEP 2: CONNECT HOST WEBSOCKET ───
  console.log('\n[2/7] Connecting Host WebSocket...');
  const hostWs = new WebSocket(`${WS_URL}?sessionId=${sessionId}&userId=${hostUserId}`);
  const hostEvents = [];

  await new Promise((resolve, reject) => {
    hostWs.on('open', resolve);
    hostWs.on('error', reject);
    hostWs.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString());
        hostEvents.push(parsed);
      } catch (e) {
        console.error('Failed to parse WS message:', e);
      }
    });
  });
  console.log('✓ Host connected to WebSocket channel');

  // ─── STEP 3: GUESTS JOIN SESSION ───
  console.log('\n[3/7] Joining guests Minh (m2) and An (m3)...');
  const join1Res = await fetch(`${BASE_URL}/api/invites/${inviteCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: guest1UserId, name: 'Minh' }),
  });
  const join1Data = await join1Res.json();
  assert.strictEqual(join1Data.data.member.color_slot, 'm2', 'Minh should have slot m2');

  const join2Res = await fetch(`${BASE_URL}/api/invites/${inviteCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: guest2UserId, name: 'An' }),
  });
  const join2Data = await join2Res.json();
  assert.strictEqual(join2Data.data.member.color_slot, 'm3', 'An should have slot m3');
  console.log('✓ Minh (m2) and An (m3) successfully joined');

  // ─── STEP 4: CONCURRENT DIFFERENT SEAT HOLDS ───
  console.log('\n[4/7] Testing concurrent different seat selection (Tín -> G08, Minh -> G09)...');
  const [holdTinRes, holdMinhRes] = await Promise.all([
    fetch(`${BASE_URL}/api/group-sessions/${sessionId}/seats/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId: 'G08', seatCode: 'G08', userId: hostUserId }),
    }),
    fetch(`${BASE_URL}/api/group-sessions/${sessionId}/seats/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId: 'G09', seatCode: 'G09', userId: guest1UserId }),
    }),
  ]);

  assert.strictEqual(holdTinRes.status, 201, 'Tín holding G08 should return 201');
  assert.strictEqual(holdMinhRes.status, 201, 'Minh holding G09 should return 201');

  const holdTinData = await holdTinRes.json();
  const holdMinhData = await holdMinhRes.json();

  assert.strictEqual(holdTinData.data.colorSlot, 'm1', 'Tín hold result should have colorSlot m1');
  assert.strictEqual(holdMinhData.data.colorSlot, 'm2', 'Minh hold result should have colorSlot m2');
  console.log('✓ Both members successfully held different seats with correct color slots (m1, m2)');

  // Verify WebSocket broadcast
  await new Promise((r) => setTimeout(r, 400));
  const tinWsEvent = hostEvents.find((e) => e.type === 'SEAT_HELD' && e.payload?.seatId === 'G08');
  const minhWsEvent = hostEvents.find((e) => e.type === 'SEAT_HELD' && e.payload?.seatId === 'G09');
  assert.ok(tinWsEvent, 'SEAT_HELD event for G08 should be broadcasted');
  assert.ok(minhWsEvent, 'SEAT_HELD event for G09 should be broadcasted');
  assert.strictEqual(minhWsEvent.payload.colorSlot, 'm2', 'SEAT_HELD broadcast should contain colorSlot m2');
  console.log('✓ WebSocket SEAT_HELD broadcasts received with accurate member metadata');

  // ─── STEP 5: CONCURRENCY RACE CONDITION ON SAME SEAT (G10) ───
  console.log('\n[5/7] Testing concurrency race condition: Minh and An compete for seat G10 at the same millisecond...');
  const [race1Res, race2Res] = await Promise.all([
    fetch(`${BASE_URL}/api/group-sessions/${sessionId}/seats/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId: 'G10', seatCode: 'G10', userId: guest1UserId }),
    }),
    fetch(`${BASE_URL}/api/group-sessions/${sessionId}/seats/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId: 'G10', seatCode: 'G10', userId: guest2UserId }),
    }),
  ]);

  const statuses = [race1Res.status, race2Res.status].sort();
  assert.deepStrictEqual(
    statuses,
    [201, 409],
    `Exactly one member must succeed (201) and one must fail with 409 Conflict. Got: ${statuses}`
  );

  const failedRes = race1Res.status === 409 ? race1Res : race2Res;
  const failedData = await failedRes.json();
  const errorMsg = failedData.error || failedData.message || '';
  assert.ok(
    errorMsg.includes('Ghế G10 vừa được người khác chọn'),
    `Error message must be friendly Vietnamese conflict: ${errorMsg}`
  );
  console.log(`✓ Concurrency conflict resolved atomically! 1 winner (201 Created), 1 conflict (409 Conflict: "${errorMsg}")`);

  // Winner ID
  const winnerUserId = race1Res.status === 201 ? guest1UserId : guest2UserId;
  const loserUserId = race1Res.status === 201 ? guest2UserId : guest1UserId;

  // ─── STEP 6: IDEMPOTENT RE-HOLD, RELEASE & RE-ACQUISITION ───
  console.log('\n[6/7] Testing idempotent re-hold, seat release, and re-acquisition...');

  // A. Winner holds G10 again (Idempotency)
  const reHoldRes = await fetch(`${BASE_URL}/api/group-sessions/${sessionId}/seats/hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seatId: 'G10', seatCode: 'G10', userId: winnerUserId }),
  });
  assert.strictEqual(reHoldRes.status, 200, 'Re-holding own seat should return 200 OK');
  const reHoldData = await reHoldRes.json();
  assert.strictEqual(reHoldData.data.isNew, false, 'Should flag isNew: false');
  console.log('✓ Idempotent re-hold returns 200 OK');

  // B. Winner releases G10
  const releaseRes = await fetch(`${BASE_URL}/api/group-sessions/${sessionId}/seats/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seatId: 'G10', userId: winnerUserId }),
  });
  assert.strictEqual(releaseRes.status, 200, 'Release should return 200 OK');
  console.log('✓ Seat G10 released by winner');

  // Verify WS release event
  await new Promise((r) => setTimeout(r, 400));
  const releaseWsEvent = hostEvents.find((e) => e.type === 'SEAT_RELEASED' && e.payload?.seatId === 'G10');
  assert.ok(releaseWsEvent, 'SEAT_RELEASED event must be broadcasted');
  console.log('✓ WebSocket SEAT_RELEASED broadcast confirmed');

  // C. The loser can now hold G10!
  const grabReleasedRes = await fetch(`${BASE_URL}/api/group-sessions/${sessionId}/seats/hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seatId: 'G10', seatCode: 'G10', userId: loserUserId }),
  });
  assert.strictEqual(grabReleasedRes.status, 201, 'Previously conflicted member can now hold the released seat');
  console.log('✓ Released seat G10 successfully acquired by the other member (201 Created)');

  // ─── STEP 7: AUTO-RELEASE ON MEMBER LEAVE ───
  console.log('\n[7/7] Testing automatic seat release when member leaves...');
  // Minh holds G11
  await fetch(`${BASE_URL}/api/group-sessions/${sessionId}/seats/hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seatId: 'G11', seatCode: 'G11', userId: guest1UserId }),
  });

  // Minh leaves
  const leaveRes = await fetch(`${BASE_URL}/api/group-sessions/${sessionId}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: guest1UserId }),
  });
  assert.strictEqual(leaveRes.status, 200, 'Leave should return 200 OK');

  // Check active seats in session
  const getSeatsRes = await fetch(`${BASE_URL}/api/group-sessions/${sessionId}/seats`);
  const getSeatsData = await getSeatsRes.json();
  const heldG11 = getSeatsData.data.find((s) => s.seat_id === 'G11');
  assert.ok(!heldG11, 'Seat G11 held by Minh must be automatically released upon leaving');
  console.log('✓ Seat G11 automatically released when member left');

  // Close WS
  hostWs.close();

  console.log('\n===============================================================');
  console.log('🎉 PHASE 5 VERIFICATION PASSED 100%! CONCURRENCY LOCKING ROCK SOLID');
  console.log('===============================================================');
}

runPhase5Tests().catch((err) => {
  console.error('\n❌ Phase 5 Test Suite Failed:', err);
  process.exit(1);
});
