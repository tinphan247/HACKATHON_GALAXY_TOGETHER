/**
 * Automated Integration Tests for Phase 2: Group Session Backend API
 * Connects to Neon Serverless PostgreSQL and tests all Express endpoints
 */

import assert from 'assert';
import app from '../src/server.js';
import { pool } from '../src/db.js';

let server;
let baseUrl;

async function request(method, path, body = null) {
  const url = `${baseUrl}${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runIntegrationTests() {
  console.log("==================================================");
  console.log("🚀 STARTING INTEGRATION TESTS FOR PHASE 2 API");
  console.log("==================================================");

  // Start test server on random available port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test server running at ${baseUrl}`);
      resolve();
    });
  });

  try {
    // 1. Health Check
    console.log("\n[Test 1] Health Check & Neon DB Connectivity");
    const health = await request('GET', '/api/health');
    assert.strictEqual(health.status, 200, "Healthcheck should return 200");
    assert.strictEqual(health.data.database, 'connected', "DB should be connected");
    console.log("  ✓ /api/health returned 200 OK (DB connected)");

    // 2. Create Group Session
    console.log("\n[Test 2] Create Group Session (POST /api/group-sessions)");
    const createPayload = {
      showtimeId: "st-mai-2026-0905",
      cinemaId: "cin-nguyen-van-qua",
      cinemaName: "Galaxy Nguyễn Văn Quá",
      movieId: "mov-mai-2",
      movieTitle: "Mai 2",
      showDate: "2026-09-05",
      showTime: "19:30",
      screenName: "Screen 2",
      hostUserId: "user-tin-ops",
      hostName: "Phan Trung Tín",
      name: "Ops Team Galaxy Together",
      paymentMode: "split",
      maxMembers: 3 // Set to 3 to test capacity limit later
    };

    const createRes = await request('POST', '/api/group-sessions', createPayload);
    assert.strictEqual(createRes.status, 201, "Should create session with 201 Created");
    assert.strictEqual(createRes.data.success, true);
    
    const { session, host, invite } = createRes.data.data;
    assert.ok(session.id, "Session must have an ID");
    assert.strictEqual(session.status, "WAITING_FOR_MEMBERS");
    assert.strictEqual(session.max_members, 3);
    assert.strictEqual(host.role, "host");
    assert.strictEqual(host.color_slot, "m1"); // Host is m1 (Orange)
    assert.strictEqual(host.status, "JOINED");
    assert.ok(invite.code.startsWith("GTH-"), "Invite code should start with GTH-");
    console.log(`  ✓ Session created: ${session.id}`);
    console.log(`  ✓ Host: ${host.name} (Slot: ${host.color_slot})`);
    console.log(`  ✓ Invite Code: ${invite.code}`);

    const sessionId = session.id;
    const inviteCode = invite.code;

    // 3. Preview Invite (GET /api/invites/:code)
    console.log("\n[Test 3] Preview Invite Details (GET /api/invites/:code)");
    const previewRes = await request('GET', `/api/invites/${inviteCode}`);
    assert.strictEqual(previewRes.status, 200);
    assert.strictEqual(previewRes.data.data.movie_title, "Mai 2");
    assert.strictEqual(Number(previewRes.data.data.current_members), 1);
    console.log(`  ✓ Invite preview verified for: ${previewRes.data.data.session_name}`);

    // 4. Member 2 joins via invite code
    console.log("\n[Test 4] Member 2 Joins Session (POST /api/invites/:code/join)");
    const joinM2 = await request('POST', `/api/invites/${inviteCode}/join`, {
      userId: "user-minh-ops",
      name: "Minh"
    });
    assert.strictEqual(joinM2.status, 201);
    assert.strictEqual(joinM2.data.data.member.name, "Minh");
    assert.strictEqual(joinM2.data.data.member.color_slot, "m2"); // Member 2 is m2
    assert.strictEqual(joinM2.data.data.member.status, "JOINED");
    console.log(`  ✓ Member 2 joined: Minh (Slot: m2)`);

    // 5. Member 3 joins via invite code
    console.log("\n[Test 5] Member 3 Joins Session (POST /api/invites/:code/join)");
    const joinM3 = await request('POST', `/api/invites/${inviteCode}/join`, {
      userId: "user-an-ops",
      name: "An"
    });
    assert.strictEqual(joinM3.status, 201);
    assert.strictEqual(joinM3.data.data.member.name, "An");
    assert.strictEqual(joinM3.data.data.member.color_slot, "m3"); // Member 3 is m3
    console.log(`  ✓ Member 3 joined: An (Slot: m3)`);

    // 6. Idempotency Check: Member 2 joins again
    console.log("\n[Test 6] Idempotency: Member 2 Joins Again");
    const joinAgain = await request('POST', `/api/invites/${inviteCode}/join`, {
      userId: "user-minh-ops",
      name: "Minh"
    });
    assert.strictEqual(joinAgain.status, 200, "Should return 200 OK for duplicate join");
    assert.strictEqual(joinAgain.data.data.isNew, false);
    assert.strictEqual(joinAgain.data.data.member.color_slot, "m2");
    console.log(`  ✓ Idempotent: returned existing member record`);

    // 7. Capacity Constraint: Member 4 tries to join when maxMembers = 3
    console.log("\n[Test 7] Capacity Limit Enforcement (Max 3 Members)");
    const joinM4Full = await request('POST', `/api/invites/${inviteCode}/join`, {
      userId: "user-huy-ops",
      name: "Huy"
    });
    assert.strictEqual(joinM4Full.status, 409, "Should reject with 409 Conflict when session is full");
    console.log(`  ✓ Successfully rejected 4th member: ${joinM4Full.data.error}`);

    // 8. Fetch Full Session (GET /api/group-sessions/:id)
    console.log("\n[Test 8] Fetch Full Session Details (GET /api/group-sessions/:id)");
    const getRes = await request('GET', `/api/group-sessions/${sessionId}`);
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.data.data.members.length, 3);
    console.log(`  ✓ Session has 3 active members: ${getRes.data.data.members.map(m => m.name).join(', ')}`);

    // 9. Member 3 leaves session
    console.log("\n[Test 9] Member Leaves Session (POST /api/group-sessions/:id/leave)");
    const leaveRes = await request('POST', `/api/group-sessions/${sessionId}/leave`, {
      userId: "user-an-ops"
    });
    assert.strictEqual(leaveRes.status, 200);
    assert.strictEqual(leaveRes.data.data.success, true);
    console.log(`  ✓ Member An has left session`);

    // 10. Capacity slot reclaimed: Member 4 can now join!
    console.log("\n[Test 10] Slot Reclaimed: Member 4 can now join in place of Member 3");
    const joinM4AfterLeave = await request('POST', `/api/invites/${inviteCode}/join`, {
      userId: "user-huy-ops",
      name: "Huy"
    });
    assert.strictEqual(joinM4AfterLeave.status, 201);
    assert.strictEqual(joinM4AfterLeave.data.data.member.name, "Huy");
    assert.strictEqual(joinM4AfterLeave.data.data.member.color_slot, "m3"); // Slot m3 was reclaimed!
    console.log(`  ✓ Member Huy joined and took reclaimed slot: m3`);

    // 11. Authorization: Non-host cannot cancel session
    console.log("\n[Test 11] Authorization Check: Non-host Cannot Cancel");
    const imposterCancel = await request('POST', `/api/group-sessions/${sessionId}/cancel`, {
      actorUserId: "user-minh-ops"
    });
    assert.strictEqual(imposterCancel.status, 403, "Should return 403 Forbidden for non-host");
    console.log(`  ✓ Unauthorized cancel blocked: ${imposterCancel.data.error}`);

    // 12. Host cancels session
    console.log("\n[Test 12] Host Cancels Session");
    const hostCancel = await request('POST', `/api/group-sessions/${sessionId}/cancel`, {
      actorUserId: "user-tin-ops"
    });
    assert.strictEqual(hostCancel.status, 200);
    console.log(`  ✓ Session cancelled by host`);

    // 13. Verify cannot join cancelled session
    console.log("\n[Test 13] Cannot Join Cancelled Session");
    const joinCancelled = await request('POST', `/api/invites/${inviteCode}/join`, {
      userId: "user-late",
      name: "Late Guy"
    });
    assert.strictEqual(joinCancelled.status, 400, "Should return 400 when session is cancelled");
    console.log(`  ✓ Join to cancelled session blocked: ${joinCancelled.data.error}`);

    console.log("\n==================================================");
    console.log("🎉 ALL 13 INTEGRATION TESTS PASSED (100%)");
    console.log("==================================================");

  } catch (err) {
    console.error("\n❌ INTEGRATION TEST FAILED:", err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await pool.end();
    process.exit(0);
  }
}

runIntegrationTests();
