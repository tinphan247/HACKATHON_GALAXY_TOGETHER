/**
 * Test Suite: Group Booking Flow (GROUP + HOST_PAYS)
 * Tests:
 * 1. Member and Host select seats and F&B
 * 2. Host payment (HOST_PAYS_ALL)
 * 3. Database ticket issuance (tickets & booking_items)
 * 4. WebSocket realtime broadcast of GROUP_PAYMENT_SUCCESS & GROUP_TICKETS_ISSUED
 * 5. GET /api/group-sessions/:id/tickets endpoint
 * 6. Role guard (Non-host cannot pay for host_all)
 */

import http from 'http';
import WebSocket from 'ws';

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runHostPaysTest() {
  console.log('🎟️ [HOST_PAYS Test] Starting Group Host-Pays Flow Test...\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  const showtimeId = `st_dune_test_${Date.now()}`;

  // 1. Create Host-Pays Session
  const createRes = await apiRequest('POST', '/api/group-sessions', {
    name: 'Nhóm Đi Xem Dune',
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
    paymentMode: 'host_pays',
    maxMembers: 3,
  });

  assert(createRes.status === 201, 'Host created session with paymentMode = host_pays');
  const session = createRes.data.data.session;
  const sessionId = session.id;
  const inviteCode = createRes.data.data.invite.code;

  // 2. Member joins
  const joinRes = await apiRequest('POST', `/api/invites/${inviteCode}/join`, {
    userId: 'usr_member_minh',
    name: 'Minh',
  });
  assert(joinRes.status === 200 || joinRes.status === 201, 'Member Minh joined the group');

  // 3. Connect WebSocket client to listen for payment and ticket events
  const wsEvents = [];
  const ws = new WebSocket(`${WS_URL}?sessionId=${sessionId}&userId=usr_member_minh`);

  await new Promise((resolve) => {
    ws.on('open', () => {
      ws.on('message', (msg) => {
        try {
          const parsed = JSON.parse(msg.toString());
          wsEvents.push(parsed);
        } catch (e) {}
      });
      resolve();
    });
  });

  // 4. Seats selection: Host picks B5, Minh picks B6
  const holdHostSeat = await apiRequest('POST', `/api/group-sessions/${sessionId}/seats/hold`, {
    showtimeId,
    seatId: 'B5',
    seatCode: 'B5',
    seatType: 'standard',
    price: 95000,
    userId: 'usr_host_tin',
  });
  assert(holdHostSeat.status === 201 || holdHostSeat.status === 200, 'Host holds seat B5 (95.000đ)');

  const holdMemberSeat = await apiRequest('POST', `/api/group-sessions/${sessionId}/seats/hold`, {
    showtimeId,
    seatId: 'B6',
    seatCode: 'B6',
    seatType: 'standard',
    price: 95000,
    userId: 'usr_member_minh',
  });
  assert(holdMemberSeat.status === 201 || holdMemberSeat.status === 200, 'Member Minh holds seat B6 (95.000đ)');

  // 5. F&B selection: Host picks c1 (115.000đ), Member picks c2 (134.000đ)
  await apiRequest('POST', `/api/group-sessions/${sessionId}/fnb`, {
    userId: 'usr_host_tin',
    items: [{ comboId: 'c1', quantity: 1, unitPrice: 115000 }],
  });
  await apiRequest('POST', `/api/group-sessions/${sessionId}/fnb`, {
    userId: 'usr_member_minh',
    items: [{ comboId: 'c2', quantity: 1, unitPrice: 134000 }],
  });

  // 6. Security / Role Guard: Member tries to call host-all
  const unauthorizedPay = await apiRequest('POST', `/api/group-sessions/${sessionId}/payments/host-all`, {
    hostUserId: 'usr_member_minh',
    paymentMethod: 'momo',
  });
  assert(unauthorizedPay.status === 403, 'Member is forbidden from triggering host-all payment (403)');

  // 7. Host triggers payment for entire group
  const hostPayRes = await apiRequest('POST', `/api/group-sessions/${sessionId}/payments/host-all`, {
    hostUserId: 'usr_host_tin',
    paymentMethod: 'momo',
  });

  assert(hostPayRes.status === 200, 'Host payment succeeded (200 OK)');
  assert(hostPayRes.data.data.isAllPaid === true, 'isAllPaid is true');
  assert(hostPayRes.data.data.isConfirmed === true, 'isConfirmed is true');
  assert(Array.isArray(hostPayRes.data.data.tickets), 'Response includes issued tickets array');
  assert(hostPayRes.data.data.tickets.length === 2, 'Two tickets issued (for B5 and B6)');

  // 8. Test GET /api/group-sessions/:id/tickets endpoint
  const ticketsRes = await apiRequest('GET', `/api/group-sessions/${sessionId}/tickets`);
  assert(ticketsRes.status === 200, 'GET /tickets returns 200 OK');
  assert(Array.isArray(ticketsRes.data.data), 'GET /tickets returns ticket list');
  assert(ticketsRes.data.data.length === 2, 'GET /tickets returns exactly 2 individual tickets');

  const ticketB5 = ticketsRes.data.data.find((t) => t.seatCode === 'B5');
  const ticketB6 = ticketsRes.data.data.find((t) => t.seatCode === 'B6');
  assert(ticketB5 && ticketB5.ticketCode.startsWith('GLX-'), 'Ticket B5 has valid ticket code');
  assert(ticketB6 && ticketB6.qrPayload.includes('B6'), 'Ticket B6 has QR payload containing seat B6');

  // 9. Verify WebSocket Events delivered to Member
  await new Promise((r) => setTimeout(r, 500));
  const paymentSuccessEvent = wsEvents.find((e) => e.type === 'GROUP_PAYMENT_SUCCESS');
  const ticketsIssuedEvent = wsEvents.find((e) => e.type === 'GROUP_TICKETS_ISSUED');

  assert(!!paymentSuccessEvent, 'WebSocket delivered GROUP_PAYMENT_SUCCESS event to connected Member');
  assert(!!ticketsIssuedEvent, 'WebSocket delivered GROUP_TICKETS_ISSUED event to connected Member');

  ws.close();

  console.log(`\n🏁 [Result] ${passed}/${total} tests passed.`);
  process.exit(passed === total ? 0 : 1);
}

runHostPaysTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
