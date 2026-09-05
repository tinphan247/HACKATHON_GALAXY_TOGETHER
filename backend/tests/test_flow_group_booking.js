/**
 * End-to-End Test Suite for the Restructured Group Booking Flow
 * Tests:
 * 1. Create group directly from showtime selection (POST /api/group-sessions)
 * 2. Member join via code (POST /api/invites/:code/join)
 * 3. Atomic Seat Swapping (Member holding G08 swaps to G09 -> G08 released, G09 held)
 * 4. Anti-Conflict: Another member cannot hold G09 (409 Conflict)
 * 5. Seat Hold Timer: Starts ONLY when clicking continue (POST /api/group-sessions/:id/checkout)
 * 6. Split Payment: Member pays individually
 * 7. Verification: Session confirms and tickets are generated
 */

import http from 'http';

const BASE_URL = 'http://localhost:3000';

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
        } catch {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runGroupFlowTests() {
  console.log('🎬 [Group Flow Tests] Starting End-to-End Flow Verification...\n');

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

  const hostUserId = `usr_flow_host_${Date.now()}`;
  const memberUserId = `usr_flow_minh_${Date.now()}`;
  const showtimeId = `st_flow_${Date.now()}`;

  try {
    // TEST 1: Create Group Session
    console.log('--- TEST 1: Create Group Session ---');
    const createRes = await apiRequest('POST', '/api/group-sessions', {
      showtimeId,
      cinemaId: 'cin-nvq',
      cinemaName: 'Galaxy Cinema Nguyễn Văn Quá',
      movieId: 'mv-01',
      movieTitle: 'Quý Tử Vượt Giàu',
      showDate: '07/09/2026',
      showTime: '21:00',
      screenName: 'Phòng 3',
      hostUserId,
      hostName: 'Tín Phan',
      name: 'Nhóm Đi Bụi Cuối Tuần',
      paymentMode: 'split',
      maxMembers: 4,
    });

    assert(createRes.status === 201, 'Group session created with status 201');
    const resData = createRes.data?.data || createRes.data;
    const sessionId = resData?.session?.id;
    const inviteCode = resData?.invite?.code;
    assert(!!sessionId, `Session ID generated: ${sessionId}`);
    assert(!!inviteCode, `Invite Code generated: ${inviteCode}`);

    // TEST 2: Member joins via code
    console.log('\n--- TEST 2: Member Joins Group via Code ---');
    const joinRes = await apiRequest('POST', `/api/invites/${inviteCode}/join`, {
      userId: memberUserId,
      name: 'Minh',
    });

    assert([200, 201].includes(joinRes.status), 'Member Minh joined successfully (200/201)');
    const sessionDetails = await apiRequest('GET', `/api/group-sessions/${sessionId}`);
    const members = sessionDetails.data?.data?.members || sessionDetails.data?.members || [];
    assert(members.length === 2, `Session has 2 members in DB (Host + Minh)`);

    // TEST 3: Host holds seat G08
    console.log('\n--- TEST 3: Host Holds Seat G08 ---');
    const holdRes1 = await apiRequest('POST', `/api/group-sessions/${sessionId}/seats/hold`, {
      showtimeId,
      seatId: 'G08',
      seatCode: 'G08',
      userId: hostUserId,
    });
    assert([200, 201].includes(holdRes1.status), 'Host held G08 successfully');

    // TEST 4: Host swaps seat from G08 to G09
    console.log('\n--- TEST 4: Atomic Seat Swapping (Host G08 -> G09) ---');
    const swapRes = await apiRequest('POST', `/api/group-sessions/${sessionId}/seats/hold`, {
      showtimeId,
      seatId: 'G09',
      seatCode: 'G09',
      userId: hostUserId,
    });
    assert([200, 201].includes(swapRes.status), 'Host swapped to G09 successfully');
    const swapData = swapRes.data?.data || swapRes.data;
    assert(swapData?.releasedSeatId === 'G08', 'Backend automatically released previous seat G08');
    assert(swapData?.seatId === 'G09' || swapData?.hold?.seat_id === 'G09', 'Backend holds new seat G09');

    // TEST 5: Verify Active Seats in Session
    console.log('\n--- TEST 5: Verify Active Seats State ---');
    const seatsRes = await apiRequest('GET', `/api/group-sessions/${sessionId}/seats`);
    assert(seatsRes.status === 200, 'Fetched active session seats');
    const heldList = seatsRes.data?.data || seatsRes.data || [];
    const hasG08 = Array.isArray(heldList) && heldList.some((s) => s.seat_id === 'G08');
    const hasG09 = Array.isArray(heldList) && heldList.some((s) => s.seat_id === 'G09' && s.user_id === hostUserId);
    assert(!hasG08, 'Seat G08 is no longer held');
    assert(hasG09, 'Seat G09 is actively held by Host');

    // TEST 6: Concurrency Conflict Protection
    console.log('\n--- TEST 6: Concurrency Protection (Minh cannot take G09) ---');
    const conflictRes = await apiRequest('POST', `/api/group-sessions/${sessionId}/seats/hold`, {
      showtimeId,
      seatId: 'G09',
      seatCode: 'G09',
      userId: memberUserId,
    });
    assert(conflictRes.status === 409, 'Conflict detected: 409 returned when trying to take G09');

    // Minh picks G08 (now available)
    const minhHoldRes = await apiRequest('POST', `/api/group-sessions/${sessionId}/seats/hold`, {
      showtimeId,
      seatId: 'G08',
      seatCode: 'G08',
      userId: memberUserId,
    });
    assert([200, 201].includes(minhHoldRes.status), 'Minh successfully picked released seat G08');

    // TEST 7: Seat Hold Countdown Timer
    console.log('\n--- TEST 7: Hold Timer Starts on Continue (Checkout API) ---');
    // Verify session prior to checkout has no hold timer
    const preSessionRes = await apiRequest('GET', `/api/group-sessions/${sessionId}`);
    const preSession = preSessionRes.data?.data || preSessionRes.data;
    assert(!preSession?.seat_hold_started_at, 'seat_hold_started_at was null initially');

    // Call checkout endpoint
    const checkoutRes = await apiRequest('POST', `/api/group-sessions/${sessionId}/checkout`, {
      durationMinutes: 10,
    });
    console.log('checkoutRes:', checkoutRes.status, checkoutRes.data);
    assert(checkoutRes.status === 200, 'Checkout / hold timer started with 200');
    const checkoutData = checkoutRes.data?.data || checkoutRes.data;
    assert(!!checkoutData?.seatHoldStartedAt, 'seatHoldStartedAt returned');
    assert(!!checkoutData?.seatHoldExpiresAt, 'seatHoldExpiresAt returned');
    const expiresDate = new Date(checkoutData.seatHoldExpiresAt);
    const startedDate = new Date(checkoutData.seatHoldStartedAt);
    const diffMinutes = Math.round((expiresDate.getTime() - startedDate.getTime()) / 60000);
    assert(diffMinutes === 10, `Hold duration correctly set to 10 minutes (${diffMinutes}m)`);

    // TEST 8: Individual F&B & Split Payment
    console.log('\n--- TEST 8: Split Payment ---');
    // Host adds Combo 1
    await apiRequest('POST', `/api/group-sessions/${sessionId}/fnb`, {
      userId: hostUserId,
      items: [{ comboId: 'c1', quantity: 1, unitPrice: 115000 }],
    });

    // Host pays share
    const hostPayRes = await apiRequest('POST', `/api/group-sessions/${sessionId}/payments/member`, {
      userId: hostUserId,
      paymentMethod: 'momo',
    });
    assert(hostPayRes.status === 200, 'Host paid their share via MoMo');

    // Member pays share
    const memberPayRes = await apiRequest('POST', `/api/group-sessions/${sessionId}/payments/member`, {
      userId: memberUserId,
      paymentMethod: 'zalopay',
    });
    assert(memberPayRes.status === 200, 'Member Minh paid their share via ZaloPay');
    const memberPayData = memberPayRes.data?.data || memberPayRes.data;
    assert(memberPayData?.isConfirmed === true, 'All members paid -> Session automatically confirmed!');

    // TEST 9: Session Status and Booking Verification
    console.log('\n--- TEST 9: Final Session State Verification ---');
    const finalSessionRes = await apiRequest('GET', `/api/group-sessions/${sessionId}`);
    const finalSession = finalSessionRes.data?.data || finalSessionRes.data;
    assert(finalSession?.status === 'CONFIRMED', 'Session status is CONFIRMED');

    console.log(`\n=============================================`);
    console.log(`🎉 [Flow Tests Result] Passed ${passed}/${total} assertions.`);
    console.log(`=============================================\n`);
    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runGroupFlowTests();
