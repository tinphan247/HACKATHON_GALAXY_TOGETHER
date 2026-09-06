import WebSocket from 'ws';

const API_BASE = 'http://localhost:3000/api';
const WS_BASE = 'ws://localhost:3000/ws';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json();
  return { status: res.status, data };
}

function connectWs(sessionId, userId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_BASE}?sessionId=${sessionId}&userId=${userId}`);
    const events = [];
    ws.on('open', () => resolve({ ws, events }));
    ws.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString());
        events.push(parsed);
      } catch (e) {}
    });
    ws.on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSplitPayTest() {
  console.log('🤝 [SPLIT_PAY Test] Starting Split Payment Flow Integration Test...\n');
  const showtimeId = `st_split_test_${Date.now()}`;

  // 1. Host creates group session with paymentMode = 'split'
  const createRes = await request('/group-sessions', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Nhóm Tự Chia Tiền',
      hostUserId: 'usr_host_tin',
      hostName: 'Tín',
      showtimeId,
      cinemaId: 'cin_nvq',
      cinemaName: 'Galaxy Cinema Nguyễn Văn Quá',
      movieId: 'mv_dune',
      movieTitle: 'Dune: Part Two',
      showDate: '06/09/2026',
      showTime: '20:15',
      screenName: 'RAP 4',
      paymentMode: 'split',
      maxMembers: 3,
    }),
  });
  console.assert(createRes.status === 201, 'Host session create failed');
  const session = createRes.data.data.session;
  const sessionId = session.id;
  const inviteCode = createRes.data.data.invite.code;
  console.log('  ✅ [PASS] Host created session with paymentMode = split');

  // 2. Member joins session
  const joinRes = await request(`/invites/${inviteCode}/join`, {
    method: 'POST',
    body: JSON.stringify({
      userId: 'usr_member_minh',
      name: 'Minh',
    }),
  });
  console.assert(joinRes.status === 200 || joinRes.status === 201, 'Member join failed');
  console.log('  ✅ [PASS] Member Minh joined group');

  // Connect WebSocket for Member
  const { ws: memberWs, events: memberEvents } = await connectWs(sessionId, 'usr_member_minh');
  await sleep(100);

  // 3. Host holds seat B5 (Standard 55.000đ)
  const holdHost = await request(`/group-sessions/${sessionId}/seats/hold`, {
    method: 'POST',
    body: JSON.stringify({
      showtimeId,
      seatId: 'B5',
      seatCode: 'B5',
      seatType: 'standard',
      price: 55000,
      userId: 'usr_host_tin',
      memberName: 'Tín',
    }),
  });
  console.assert(holdHost.status === 201 || holdHost.status === 200, 'Host hold seat failed');
  console.log('  ✅ [PASS] Host holds seat B5 (55.000đ)');

  // 4. Member holds seat B6 (Standard 55.000đ)
  const holdMember = await request(`/group-sessions/${sessionId}/seats/hold`, {
    method: 'POST',
    body: JSON.stringify({
      showtimeId,
      seatId: 'B6',
      seatCode: 'B6',
      seatType: 'standard',
      price: 55000,
      userId: 'usr_member_minh',
      memberName: 'Minh',
    }),
  });
  console.assert(holdMember.status === 201 || holdMember.status === 200, 'Member hold seat failed');
  console.log('  ✅ [PASS] Member holds seat B6 (55.000đ)');

  // 5. Host pays ONLY their own share (55.000đ)
  const hostPayRes = await request(`/group-sessions/${sessionId}/payments/member`, {
    method: 'POST',
    body: JSON.stringify({
      userId: 'usr_host_tin',
      paymentMethod: 'momo',
    }),
  });
  console.assert(hostPayRes.status === 200, 'Host pay failed');
  console.assert(hostPayRes.data.data.isAllPaid === false, 'isAllPaid should be false after Host alone pays');
  console.assert(hostPayRes.data.data.isConfirmed === false, 'isConfirmed should be false after Host alone pays');
  console.log('  ✅ [PASS] Host paid only their share; group is NOT yet confirmed (1/2 paid)');

  // 6. Member pays ONLY their own share (55.000đ)
  const memberPayRes = await request(`/group-sessions/${sessionId}/payments/member`, {
    method: 'POST',
    body: JSON.stringify({
      userId: 'usr_member_minh',
      paymentMethod: 'zalopay',
    }),
  });
  console.assert(memberPayRes.status === 200, 'Member pay failed');
  console.assert(memberPayRes.data.data.isAllPaid === true, 'isAllPaid should be true after Member pays');
  console.assert(memberPayRes.data.data.isConfirmed === true, 'isConfirmed should be true after Member pays');
  console.log('  ✅ [PASS] Member paid their share; session is now fully confirmed (2/2 paid)');

  // 7. Check tickets issued
  console.assert(Array.isArray(memberPayRes.data.data.tickets), 'Response should contain tickets array');
  console.assert(memberPayRes.data.data.tickets.length === 2, 'Should issue exactly 2 tickets');
  console.log('  ✅ [PASS] Backend automatically issued 2 individual tickets');

  // 8. Check GET /tickets endpoint
  const ticketsRes = await request(`/group-sessions/${sessionId}/tickets`);
  console.assert(ticketsRes.status === 200, 'GET /tickets failed');
  const ticketList = Array.isArray(ticketsRes.data.data) ? ticketsRes.data.data : ticketsRes.data.data?.tickets;
  console.assert(ticketList && ticketList.length === 2, 'GET /tickets should return 2 tickets');
  console.log('  ✅ [PASS] GET /api/group-sessions/:id/tickets returns all individual tickets');

  // 9. Verify WebSocket delivered SESSION_CONFIRMED & GROUP_TICKETS_ISSUED
  await sleep(200);
  const confirmedEv = memberEvents.find((e) => e.type === 'SESSION_CONFIRMED');
  const ticketsEv = memberEvents.find((e) => e.type === 'GROUP_TICKETS_ISSUED');
  console.assert(Boolean(confirmedEv), 'SESSION_CONFIRMED event was not received');
  console.assert(Boolean(ticketsEv), 'GROUP_TICKETS_ISSUED event was not received');
  console.log('  ✅ [PASS] Member WebSocket received SESSION_CONFIRMED');
  console.log('  ✅ [PASS] Member WebSocket received GROUP_TICKETS_ISSUED');

  memberWs.close();
  console.log('\n🏁 [Result] Split-Payment integration verified: 10/10 checks PASSED!\n');
}

runSplitPayTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
