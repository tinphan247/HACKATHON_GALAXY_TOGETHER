/**
 * Phase 6: Individual F&B & Group Summary Anti-Duplication Automated Test Suite
 * Tests:
 * 1. Catalog retrieval
 * 2. Multi-member F&B selection
 * 3. Accurate server-side price calculation & subtotal
 * 4. Group aggregate calculation (anti-duplication)
 * 5. Update / modification of F&B items
 * 6. Realtime WebSocket broadcast of FNB_UPDATED
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

async function runPhase6Tests() {
  console.log('🍿 [Phase 6 Tests] Starting Individual F&B & Anti-Duplication Test Suite...\n');

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
    // Test 1: Fetch F&B Catalog
    console.log('--- Test 1: Fetch F&B Catalog ---');
    const catalogRes = await apiRequest('GET', '/api/group-sessions/fnb/catalog');
    assert(catalogRes.status === 200, 'Catalog endpoint returns HTTP 200');
    assert(Array.isArray(catalogRes.data.data), 'Catalog data is an array');
    assert(catalogRes.data.data.length >= 4, 'Catalog contains at least 4 standard combos');
    const combo1 = catalogRes.data.data.find((c) => c.id === 'c1');
    assert(combo1 && combo1.price === 115000, 'Combo 1 is 115.000đ');

    // Test 2: Create Group Session with Host Tín
    console.log('\n--- Test 2: Setup Session with Tín, Minh, An ---');
    const hostUser = { userId: `usr_tin_${Date.now()}`, name: 'Tín' };
    const createRes = await apiRequest('POST', '/api/group-sessions', {
      hostUserId: hostUser.userId,
      hostName: hostUser.name,
      cinemaId: 'cin-nvq',
      cinemaName: 'Galaxy Cinema Nguyễn Văn Quá',
      movieId: 'mv-01',
      movieTitle: 'Quý Tử Vượt Giàu',
      showtimeId: `st_fnb_${Date.now()}`,
      showDate: '07/09/2026',
      showTime: '21:00',
      screenName: 'Phòng 3',
      name: 'Nhóm F&B Test',
      paymentMode: 'split',
      maxMembers: 4,
    });
    assert(createRes.status === 201, 'Group session created');
    const sessionId = createRes.data.data.session.id;
    const inviteCode = createRes.data.data.invite.code;

    // Join Minh
    const minhUser = { userId: `usr_minh_${Date.now()}`, name: 'Minh' };
    const joinMinh = await apiRequest('POST', `/api/invites/${inviteCode}/join`, minhUser);
    assert([200, 201].includes(joinMinh.status), 'Minh joined session (HTTP 200/201)');

    // Join An
    const anUser = { userId: `usr_an_${Date.now()}`, name: 'An' };
    const joinAn = await apiRequest('POST', `/api/invites/${inviteCode}/join`, anUser);
    assert([200, 201].includes(joinAn.status), 'An joined session (HTTP 200/201)');

    // Test 3: WebSocket Subscription & Listener for FNB_UPDATED
    console.log('\n--- Test 3: Realtime WebSocket Subscription ---');
    let wsReceivedFnbEvent = null;
    const ws = new WebSocket(WS_URL);
    await new Promise((resolve) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'SUBSCRIBE', sessionId, userId: minhUser.userId }));
        resolve();
      });
      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'FNB_UPDATED') {
            wsReceivedFnbEvent = msg;
          }
        } catch (e) {}
      });
    });
    assert(ws.readyState === WebSocket.OPEN, 'WebSocket connected and subscribed');

    // Test 4: An orders Combo 2
    console.log('\n--- Test 4: An Orders Combo 2 (134.000đ) ---');
    const anOrderRes = await apiRequest('POST', `/api/group-sessions/${sessionId}/fnb`, {
      userId: anUser.userId,
      items: [{ comboId: 'c2', comboName: 'Combo 2 Big Extra', quantity: 1, unitPrice: 134000 }],
    });
    assert(anOrderRes.status === 200, 'An F&B saved successfully');
    assert(anOrderRes.data.data.totalGroupAmount === 134000, 'Total group amount is 134.000đ');
    assert(anOrderRes.data.data.totalGroupItemsCount === 1, 'Total group item count is 1');

    // Wait for WS propagation
    await new Promise((r) => setTimeout(r, 200));
    assert(wsReceivedFnbEvent !== null, 'WebSocket received FNB_UPDATED event');
    assert(wsReceivedFnbEvent?.payload?.totalGroupAmount === 134000, 'WS payload contains updated group total');

    // Test 5: Tín orders Combo 1 + Combo 3
    console.log('\n--- Test 5: Tín Orders Combo 1 (115.000đ) + Combo 3 (149.000đ) ---');
    const tinOrderRes = await apiRequest('POST', `/api/group-sessions/${sessionId}/fnb`, {
      userId: hostUser.userId,
      items: [
        { comboId: 'c1', comboName: 'Combo 1 Big Extra', quantity: 1 },
        { comboId: 'c3', comboName: 'Combo Phô Mai', quantity: 1 },
      ],
    });
    assert(tinOrderRes.status === 200, 'Tín F&B saved successfully');
    // 134000 (An) + 115000 (Tin c1) + 149000 (Tin c3) = 398000
    assert(tinOrderRes.data.data.totalGroupAmount === 398000, 'Total group amount correctly aggregated to 398.000đ');
    assert(tinOrderRes.data.data.totalGroupItemsCount === 3, 'Total items count is 3');

    // Test 6: Verify Anti-duplication Group Summary (GET)
    console.log('\n--- Test 6: Verify Group F&B Summary Structure ---');
    const summaryRes = await apiRequest('GET', `/api/group-sessions/${sessionId}/fnb`);
    assert(summaryRes.status === 200, 'GET /:id/fnb returned HTTP 200');
    const summary = summaryRes.data.data;
    assert(summary.members.length === 3, 'Summary includes all 3 active members');

    const tinMember = summary.members.find((m) => m.userId === hostUser.userId);
    assert(tinMember && tinMember.totalAmount === 264000, 'Tín individual total is 264.000đ');
    assert(tinMember.items.length === 2, 'Tín has 2 combo items');

    const minhMember = summary.members.find((m) => m.userId === minhUser.userId);
    assert(minhMember && minhMember.totalAmount === 0, 'Minh chose no combo (0đ)');
    assert(minhMember.items.length === 0, 'Minh items array is empty');

    const anMember = summary.members.find((m) => m.userId === anUser.userId);
    assert(anMember && anMember.totalAmount === 134000, 'An individual total is 134.000đ');

    // Check aggregatedItems
    assert(summary.aggregatedItems.length === 3, 'Aggregated combos count is 3 unique combos (c1, c2, c3)');
    const aggC2 = summary.aggregatedItems.find((a) => a.comboId === 'c2');
    assert(aggC2 && aggC2.totalQuantity === 1 && aggC2.subtotal === 134000, 'Aggregated c2 has totalQuantity=1, subtotal=134.000đ');

    // Test 7: Tín modifies cart (Removes Combo 3, keeps Combo 1)
    console.log('\n--- Test 7: Tín Modifies Cart (Cancels Combo 3) ---');
    const tinUpdateRes = await apiRequest('POST', `/api/group-sessions/${sessionId}/fnb`, {
      userId: hostUser.userId,
      items: [{ comboId: 'c1', comboName: 'Combo 1 Big Extra', quantity: 1 }],
    });
    assert(tinUpdateRes.status === 200, 'Tín cart modified successfully');
    // An (134000) + Tin (115000) = 249000
    assert(tinUpdateRes.data.data.totalGroupAmount === 249000, 'Group total dynamically updated to 249.000đ');
    assert(tinUpdateRes.data.data.totalGroupItemsCount === 2, 'Group item count reduced to 2');

    ws.close();

    console.log(`\n========================================`);
    console.log(`🍿 [Phase 6 Result] ${passed}/${total} assertions PASSED!`);
    console.log(`========================================\n`);

    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('💥 [Phase 6 Error]:', err);
    process.exit(1);
  }
}

runPhase6Tests();
