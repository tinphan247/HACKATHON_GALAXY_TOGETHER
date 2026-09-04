import { WebSocket } from 'ws';

async function testWebSocketRealtime() {
  console.log('==================================================');
  console.log('⚡ STARTING REALTIME WEBSOCKET COLLABORATION TEST');
  console.log('==================================================');

  // 1. Create a real session first via REST
  const hostUserId = 'usr_ws_host_' + Date.now();
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
      hostName: 'Phan Trung Tín',
      name: 'WebSocket Test Group',
      paymentMode: 'split',
      maxMembers: 4,
    }),
  });
  const createData = await createRes.json();
  const sessionId = createData.data.session.id;
  const inviteCode = createData.data.invite.code;
  console.log(`[Step 1] Session created: ${sessionId}, Code: ${inviteCode}`);

  // 2. Connect WebSocket Client (Host)
  const wsUrl = `ws://localhost:3000/ws?sessionId=${sessionId}&userId=${hostUserId}`;
  const ws = new WebSocket(wsUrl);

  const receivedEvents = [];

  await new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('[Step 2] Host WebSocket connected to /ws');
      resolve();
    });
    ws.on('error', reject);
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    receivedEvents.push(msg);
    console.log(`[WebSocket Event Received] ${msg.type}:`, msg.payload || msg.message);
  });

  // Wait 100ms for subscription confirmation
  await new Promise((r) => setTimeout(r, 150));

  // 3. Member 2 joins via REST API
  console.log('\n[Step 3] Simulating Member 2 (Minh) joining via POST /api/invites/:code/join...');
  const startTime = Date.now();
  const joinRes = await fetch(`http://localhost:3000/api/invites/${inviteCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'usr_minh_' + Date.now(),
      name: 'Minh',
    }),
  });
  const joinData = await joinRes.json();
  console.log('Join REST response:', joinData.success);

  // Wait for event to arrive over WebSocket
  await new Promise((r) => setTimeout(r, 200));

  const joinedEvent = receivedEvents.find((e) => e.type === 'GROUP_MEMBER_JOINED');
  if (joinedEvent) {
    const latency = Date.now() - startTime;
    console.log(`✓ Realtime event GROUP_MEMBER_JOINED received! (Latency: ${latency}ms)`);
    console.log(`  New member: ${joinedEvent.payload.member.name} (${joinedEvent.payload.member.user_id})`);
  } else {
    throw new Error('FAILED: GROUP_MEMBER_JOINED event was not received via WebSocket');
  }

  // 4. Member 2 leaves via REST API
  console.log('\n[Step 4] Simulating Member 2 (Minh) leaving via POST /api/group-sessions/:id/leave...');
  await fetch(`http://localhost:3000/api/group-sessions/${sessionId}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: joinData.data.member.user_id,
    }),
  });

  await new Promise((r) => setTimeout(r, 200));

  const leftEvent = receivedEvents.find((e) => e.type === 'GROUP_MEMBER_LEFT');
  if (leftEvent) {
    console.log(`✓ Realtime event GROUP_MEMBER_LEFT received!`);
    console.log(`  Left member ID: ${leftEvent.payload.userId}`);
  } else {
    throw new Error('FAILED: GROUP_MEMBER_LEFT event was not received via WebSocket');
  }

  ws.close();
  console.log('\n==================================================');
  console.log('🎉 REALTIME WEBSOCKET TEST PASSED (100%)');
  console.log('==================================================');
}

testWebSocketRealtime()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Error:', err);
    process.exit(1);
  });
