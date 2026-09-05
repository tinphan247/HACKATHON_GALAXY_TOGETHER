/**
 * Phase 7: Split & Host Payment Orchestration Automated Test Suite
 * Tests:
 * 1. Server-authoritative calculation of ticket price + individual F&B
 * 2. Split-Pay: Individual member payment via MoMo / ZaloPay
 * 3. Realtime WebSocket broadcast of PAYMENT_UPDATED
 * 4. Host-assisted payment (Host pays on behalf of a friend)
 * 5. Automatic session confirmation and transition to CONFIRMED
 * 6. Conversion of seat_holds ('held' -> 'sold') and creation of group_bookings
 * 7. Host-Pays-All: Whole group payment in a single transaction
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

async function runPhase7Tests() {
  console.log('💳 [Phase 7 Tests] Starting Split & Host Payment Orchestration Test Suite...\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  try {
    // ==========================================
    // SCENARIO 1: SPLIT-PAY FLOW WITH 3 MEMBERS
    // ==========================================
    console.log('--- Scenario 1: Setup Split-Pay Session with Seats & F&B ---');
    const hostUser = { userId: `usr_tin_${Date.now()}`, name: 'Tín' };
    const showtimeId = `st_pay_${Date.now()}`;
    const createRes = await apiRequest('POST', '/api/group-sessions', {
      hostUserId: hostUser.userId,
      hostName: hostUser.name,
      cinemaId: 'cin-nvq',
      cinemaName: 'Galaxy Cinema Nguyễn Văn Quá',
      movieId: 'mv-01',
      movieTitle: 'Quý Tử Vượt Giàu',
      showtimeId,
      showDate: '07/09/2026',
      showTime: '21:00',
      screenName: 'Phòng 3',
      name: 'Nhóm Split-Pay Test',
      paymentMode: 'split',
      maxMembers: 4,
    });
    assert(createRes.status === 201, 'Group session created (HTTP 201)');
    const sessionId = createRes.data.data.session.id;
    const inviteCode = createRes.data.data.invite.code;

    // Join Minh & An
    const minhUser = { userId: `usr_minh_${Date.now()}`, name: 'Minh' };
    const anUser = { userId: `usr_an_${Date.now()}`, name: 'An' };
    const joinMinh = await apiRequest('POST', `/api/invites/${inviteCode}/join`, minhUser);
    const joinAn = await apiRequest('POST', `/api/invites/${inviteCode}/join`, anUser);
    assert([200, 201].includes(joinMinh.status), 'Minh joined session');
    assert([200, 201].includes(joinAn.status), 'An joined session');

    // Seat selection:
    // Tín: G08 (55k) + G09 (55k) = 110k
    // An: G10 (55k) = 55k
    // Minh: G11 (55k) = 55k
    await apiRequest('POST', `/api/group-sessions/${sessionId}/seats/hold`, {
      showtimeId,
      seatId: 'G08',
      seatCode: 'G8',
      price: 55000,
      userId: hostUser.userId,
    });
    await apiRequest('POST', `/api/group-sessions/${sessionId}/seats/hold`, {
      showtimeId,
      seatId: 'G09',
      seatCode: 'G9',
      price: 55000,
      userId: hostUser.userId,
    });
    await apiRequest('POST', `/api/group-sessions/${sessionId}/seats/hold`, {
      showtimeId,
      seatId: 'G10',
      seatCode: 'G10',
      price: 55000,
      userId: anUser.userId,
    });
    await apiRequest('POST', `/api/group-sessions/${sessionId}/seats/hold`, {
      showtimeId,
      seatId: 'G11',
      seatCode: 'G11',
      price: 55000,
      userId: minhUser.userId,
    });

    // F&B selection:
    // Tín: Combo 1 (115k)
    // An: Combo 2 (134k)
    // Minh: no F&B (0k)
    await apiRequest('POST', `/api/group-sessions/${sessionId}/fnb`, {
      userId: hostUser.userId,
      items: [{ comboId: 'c1', comboName: 'Combo 1 Big Extra', quantity: 1, unitPrice: 115000 }],
    });
    await apiRequest('POST', `/api/group-sessions/${sessionId}/fnb`, {
      userId: anUser.userId,
      items: [{ comboId: 'c2', comboName: 'Combo 2 Big Extra', quantity: 1, unitPrice: 134000 }],
    });

    // Verify Server-Authoritative Calculation
    console.log('\n--- Test 1: Verify Server-Authoritative Payment Calculation ---');
    const summaryRes = await apiRequest('GET', `/api/group-sessions/${sessionId}/payments`);
    assert(summaryRes.status === 200, 'GET /:id/payments returned HTTP 200');
    const sumData = summaryRes.data.data;
    // Tín: 110k (seats) + 115k (fnb) = 225.000đ
    // An: 55k (seats) + 134k (fnb) = 189.000đ
    // Minh: 55k (seats) + 0k (fnb) = 55.000đ
    // Total: 225k + 189k + 55k = 469.000đ
    assert(sumData.totalSessionAmount === 469000, 'Total session amount computed accurately to 469.000đ');
    assert(sumData.totalMembers === 3, 'Total members count is 3');
    assert(sumData.paidMembersCount === 0, 'Initial paid count is 0');
    assert(sumData.isAllPaid === false, 'isAllPaid is false initially');

    const tinPay = sumData.members.find((m) => m.userId === hostUser.userId);
    assert(tinPay && tinPay.totalAmount === 225000 && tinPay.seatAmount === 110000 && tinPay.fnbAmount === 115000, 'Tín breakdown: 110k seat + 115k fnb = 225k');

    const anPay = sumData.members.find((m) => m.userId === anUser.userId);
    assert(anPay && anPay.totalAmount === 189000 && anPay.fnbAmount === 134000, 'An breakdown: 55k seat + 134k fnb = 189k');

    const minhPay = sumData.members.find((m) => m.userId === minhUser.userId);
    assert(minhPay && minhPay.totalAmount === 55000 && minhPay.fnbAmount === 0, 'Minh breakdown: 55k seat + 0k fnb = 55k');

    // Setup WebSocket listener
    console.log('\n--- Test 2: Realtime WebSocket Subscription ---');
    let lastWsPaymentEvent = null;
    let lastWsConfirmedEvent = null;
    const ws = new WebSocket(WS_URL);
    await new Promise((resolve) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'SUBSCRIBE', sessionId, userId: hostUser.userId }));
        resolve();
      });
      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'PAYMENT_UPDATED') lastWsPaymentEvent = msg;
          if (msg.type === 'SESSION_CONFIRMED') lastWsConfirmedEvent = msg;
        } catch (e) {}
      });
    });
    assert(ws.readyState === WebSocket.OPEN, 'WebSocket connected and subscribed');

    // An pays her share via MoMo (189.000đ)
    console.log('\n--- Test 3: An Pays via MoMo (189.000đ) ---');
    const anPayRes = await apiRequest('POST', `/api/group-sessions/${sessionId}/payments/member`, {
      userId: anUser.userId,
      paymentMethod: 'momo',
    });
    assert(anPayRes.status === 200, 'An payment processed successfully');
    assert(anPayRes.data.data.payment.amount === 189000, 'Payment amount charged is 189.000đ');
    assert(anPayRes.data.data.payment.paymentMethod === 'momo', 'Payment method is MoMo');
    assert(anPayRes.data.data.isAllPaid === false, 'Group is not yet all paid (1/3)');

    await new Promise((r) => setTimeout(r, 200));
    assert(lastWsPaymentEvent !== null, 'WebSocket received PAYMENT_UPDATED for An');
    assert(lastWsPaymentEvent?.payload?.memberName === 'An', 'WS payload identifies member An');

    // Tín pays his share via ZaloPay (225.000đ)
    console.log('\n--- Test 4: Tín Pays via ZaloPay (225.000đ) ---');
    const tinPayRes = await apiRequest('POST', `/api/group-sessions/${sessionId}/payments/member`, {
      userId: hostUser.userId,
      paymentMethod: 'zalopay',
    });
    assert(tinPayRes.status === 200, 'Tín payment processed successfully');
    assert(tinPayRes.data.data.payment.amount === 225000, 'Payment amount charged is 225.000đ');
    assert(tinPayRes.data.data.summary.paidMembersCount === 2, '2/3 members have paid');

    // Host Tín pays on behalf of Minh via VNPAY (55.000đ) - Bailout flow
    console.log('\n--- Test 5: Host Tín Pays on Behalf of Minh (55.000đ) & Auto-Confirmation ---');
    const minhBailoutRes = await apiRequest('POST', `/api/group-sessions/${sessionId}/payments/member`, {
      userId: minhUser.userId,
      payerUserId: hostUser.userId,
      paymentMethod: 'vnpay',
    });
    assert(minhBailoutRes.status === 200, 'Host paid on behalf of Minh successfully');
    assert(minhBailoutRes.data.data.isAllPaid === true, 'All 3 members are now PAID!');
    assert(minhBailoutRes.data.data.isConfirmed === true, 'Session auto-confirmed!');

    await new Promise((r) => setTimeout(r, 200));
    assert(lastWsConfirmedEvent !== null, 'WebSocket received SESSION_CONFIRMED broadcast');

    // Verify session in database is now CONFIRMED and seats are SOLD
    const finalSessionRes = await apiRequest('GET', `/api/group-sessions/${sessionId}`);
    assert(finalSessionRes.data.data.status === 'CONFIRMED', 'Session status in DB is CONFIRMED');

    const seatsAfterRes = await apiRequest('GET', `/api/group-sessions/${sessionId}/seats`);
    assert(seatsAfterRes.data.data.length === 0, 'Zero held seats (all converted to sold)');

    ws.close();

    // ==========================================
    // SCENARIO 2: HOST-PAYS-ALL IN 1 TRANSACTION
    // ==========================================
    console.log('\n--- Scenario 2: Host-Pays-All Mode (Single Transaction) ---');
    const hostUser2 = { userId: `usr_host2_${Date.now()}`, name: 'Trưởng Nhóm' };
    const createHostPayRes = await apiRequest('POST', '/api/group-sessions', {
      hostUserId: hostUser2.userId,
      hostName: hostUser2.name,
      cinemaId: 'cin-nvq',
      cinemaName: 'Galaxy Cinema Nguyễn Văn Quá',
      movieId: 'mv-01',
      movieTitle: 'Quý Tử Vượt Giàu',
      showtimeId: `st_hostpay_${Date.now()}`,
      showDate: '07/09/2026',
      showTime: '21:00',
      screenName: 'Phòng 3',
      name: 'Nhóm Host-Pays Test',
      paymentMode: 'host_pays',
      maxMembers: 2,
    });
    const session2Id = createHostPayRes.data.data.session.id;

    // Hold 2 seats
    await apiRequest('POST', `/api/group-sessions/${session2Id}/seats/hold`, {
      showtimeId: `st_hostpay_${Date.now()}`,
      seatId: 'H01',
      price: 55000,
      userId: hostUser2.userId,
    });
    await apiRequest('POST', `/api/group-sessions/${session2Id}/seats/hold`, {
      showtimeId: `st_hostpay_${Date.now()}`,
      seatId: 'H02',
      price: 55000,
      userId: hostUser2.userId,
    });

    // Host pays for all
    const hostPayAllRes = await apiRequest('POST', `/api/group-sessions/${session2Id}/payments/host-all`, {
      hostUserId: hostUser2.userId,
      paymentMethod: 'card',
    });
    assert(hostPayAllRes.status === 200, 'Host-pays-all endpoint returned HTTP 200');
    assert(hostPayAllRes.data.data.isConfirmed === true, 'Session confirmed via Host-Pays');
    assert(hostPayAllRes.data.data.payment.amount === 110000, 'Host paid 110.000đ for 2 seats');
    assert(hostPayAllRes.data.data.payment.paymentMethod === 'card', 'Payment method recorded as Card');

    console.log(`\n========================================`);
    console.log(`💳 [Phase 7 Result] ${passed}/${total} assertions PASSED!`);
    console.log(`========================================\n`);

    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('💥 [Phase 7 Error]:', err);
    process.exit(1);
  }
}

runPhase7Tests();
