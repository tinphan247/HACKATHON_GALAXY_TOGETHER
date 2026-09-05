/**
 * Group Session Domain Service
 * Phase 2: Group Session Backend
 */

import { pool } from '../db.js';
import crypto from 'crypto';
import { generateInviteCode, generateQRPayload } from '../utils/code_generator.js';

const COLOR_PALETTE = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'];

export class SessionService {
  /**
   * Creates a new Group Session with the host as first member and an active invite code
   */
  static async createSession(data) {
    const {
      showtimeId,
      cinemaId,
      cinemaName,
      movieId,
      movieTitle,
      showDate,
      showTime,
      screenName,
      hostUserId,
      hostName,
      name,
      paymentMode = 'split',
      maxMembers = 4
    } = data;

    if (!showtimeId || !cinemaId || !movieId || !hostUserId || !hostName || !name) {
      const error = new Error("Missing required fields for creating group session");
      error.statusCode = 400;
      throw error;
    }

    if (maxMembers < 2 || maxMembers > 8) {
      const error = new Error("maxMembers must be between 2 and 8");
      error.statusCode = 400;
      throw error;
    }

    // Normalize paymentMode (accept 'split', 'host_pays', 'SPLIT_EQUAL', 'HOST_PAYS_ALL')
    let finalPaymentMode = (paymentMode || 'split').toLowerCase();
    if (finalPaymentMode.includes('host')) finalPaymentMode = 'host_pays';
    else if (finalPaymentMode.includes('split')) finalPaymentMode = 'split';

    if (!['split', 'host_pays'].includes(finalPaymentMode)) {
      const error = new Error("paymentMode must be 'split' or 'host_pays'");
      error.statusCode = 400;
      throw error;
    }

    const sessionId = crypto.randomUUID();
    const hostMemberId = crypto.randomUUID();
    const inviteId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes invite window

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert Group Session
      const sessionQuery = `
        INSERT INTO group_sessions (
          id, showtime_id, cinema_id, cinema_name, movie_id, movie_title,
          show_date, show_time, screen_name, host_user_id, host_name, name,
          payment_mode, max_members, status, expires_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'WAITING_FOR_MEMBERS', $15, NOW(), NOW()
        ) RETURNING *;
      `;
      const sessionRes = await client.query(sessionQuery, [
        sessionId,
        showtimeId,
        cinemaId,
        cinemaName,
        movieId,
        movieTitle,
        showDate,
        showTime,
        screenName,
        hostUserId,
        hostName,
        name.trim(),
        finalPaymentMode,
        maxMembers,
        expiresAt
      ]);

      // 2. Insert Host as first member (m1 = Orange)
      const hostMemberQuery = `
        INSERT INTO group_members (
          id, group_session_id, user_id, name, role, color_slot, status, joined_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 'host', 'm1', 'JOINED', NOW(), NOW()
        ) RETURNING *;
      `;
      const hostRes = await client.query(hostMemberQuery, [
        hostMemberId,
        sessionId,
        hostUserId,
        hostName
      ]);

      // 3. Generate unique invite code & insert
      let inviteCode = generateInviteCode();
      let insertedInvite = false;
      let attempts = 0;

      while (!insertedInvite && attempts < 5) {
        try {
          const qrPayload = generateQRPayload(sessionId, inviteCode, expiresAt);
          const inviteQuery = `
            INSERT INTO invites (id, group_session_id, code, qr_payload, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING *;
          `;
          await client.query(inviteQuery, [inviteId, sessionId, inviteCode, qrPayload, expiresAt]);
          insertedInvite = true;
        } catch (e) {
          if (e.code === '23505') { // Unique constraint violation on code
            inviteCode = generateInviteCode();
            attempts++;
          } else {
            throw e;
          }
        }
      }

      await client.query('COMMIT');

      return {
        session: sessionRes.rows[0],
        host: hostRes.rows[0],
        invite: {
          code: inviteCode,
          expiresAt: expiresAt.toISOString()
        }
      };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves full session details, members, and invite status
   */
  static async getSession(sessionId) {
    const sessionRes = await pool.query(
      `SELECT * FROM group_sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      const error = new Error(`Group session not found: ${sessionId}`);
      error.statusCode = 404;
      throw error;
    }

    const session = sessionRes.rows[0];

    // Get members
    const membersRes = await pool.query(
      `SELECT * FROM group_members WHERE group_session_id = $1 ORDER BY joined_at ASC`,
      [sessionId]
    );

    // Get active invite
    const inviteRes = await pool.query(
      `SELECT code, qr_payload, expires_at FROM invites WHERE group_session_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [sessionId]
    );

    return {
      ...session,
      members: membersRes.rows,
      invite: inviteRes.rows[0] || null
    };
  }

  /**
   * Member joins session via 6-char code or scanned QR
   */
  static async joinByCode(code, { userId, name }) {
    if (!code || !userId || !name) {
      const error = new Error("code, userId, and name are required to join session");
      error.statusCode = 400;
      throw error;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Look up invite
      const inviteRes = await client.query(
        `SELECT * FROM invites WHERE code = $1`,
        [code.toUpperCase().trim()]
      );

      if (inviteRes.rows.length === 0) {
        const error = new Error(`Invalid invite code: ${code}`);
        error.statusCode = 404;
        throw error;
      }

      const invite = inviteRes.rows[0];
      const sessionId = invite.group_session_id;

      // 2. Lock and fetch session
      const sessionRes = await client.query(
        `SELECT * FROM group_sessions WHERE id = $1 FOR UPDATE`,
        [sessionId]
      );

      if (sessionRes.rows.length === 0) {
        const error = new Error("Session not found");
        error.statusCode = 404;
        throw error;
      }

      const session = sessionRes.rows[0];

      if (['CANCELLED', 'EXPIRED', 'FAILED'].includes(session.status)) {
        const error = new Error(`Cannot join session with status: ${session.status}`);
        error.statusCode = 400;
        throw error;
      }

      // Check if user is already a member
      const existingMemberRes = await client.query(
        `SELECT * FROM group_members WHERE group_session_id = $1 AND user_id = $2`,
        [sessionId, userId]
      );

      if (existingMemberRes.rows.length > 0) {
        const member = existingMemberRes.rows[0];
        // If was left, reactivate
        if (member.status === 'LEFT') {
          await client.query(
            `UPDATE group_members SET status = 'JOINED', updated_at = NOW() WHERE id = $1`,
            [member.id]
          );
          member.status = 'JOINED';
        }
        await client.query('COMMIT');
        return { session, member, isNew: false };
      }

      // Check capacity
      const activeMembersRes = await client.query(
        `SELECT color_slot FROM group_members WHERE group_session_id = $1 AND status != 'LEFT'`,
        [sessionId]
      );

      if (activeMembersRes.rows.length >= session.max_members) {
        const error = new Error(`Group session has reached maximum capacity of ${session.max_members} members`);
        error.statusCode = 409;
        throw error;
      }

      // Assign next available color slot
      const usedSlots = new Set(activeMembersRes.rows.map(r => r.color_slot));
      const nextSlot = COLOR_PALETTE.find(slot => !usedSlots.has(slot)) || 'm2';

      const newMemberId = crypto.randomUUID();
      const insertMemberQuery = `
        INSERT INTO group_members (
          id, group_session_id, user_id, name, role, color_slot, status, joined_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 'member', $5, 'JOINED', NOW(), NOW()
        ) RETURNING *;
      `;

      const newMemberRes = await client.query(insertMemberQuery, [
        newMemberId,
        sessionId,
        userId,
        name.trim(),
        nextSlot
      ]);

      await client.query('COMMIT');

      return {
        session,
        member: newMemberRes.rows[0],
        isNew: true
      };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Member leaves session
   */
  static async leaveSession(sessionId, userId) {
    if (!sessionId || !userId) {
      const error = new Error("sessionId and userId are required");
      error.statusCode = 400;
      throw error;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const memberRes = await client.query(
        `SELECT * FROM group_members WHERE group_session_id = $1 AND user_id = $2`,
        [sessionId, userId]
      );

      if (memberRes.rows.length === 0) {
        const error = new Error("Member not found in this session");
        error.statusCode = 404;
        throw error;
      }

      const member = memberRes.rows[0];

      if (member.role === 'host') {
        const error = new Error("Host cannot leave session. Cancel session instead.");
        error.statusCode = 400;
        throw error;
      }

      // Mark status as LEFT
      await client.query(
        `UPDATE group_members SET status = 'LEFT', updated_at = NOW() WHERE id = $1`,
        [member.id]
      );

      // Release any seat holds
      await client.query(
        `UPDATE seat_holds SET status = 'released' WHERE group_session_id = $1 AND group_member_id = $2 AND status = 'held'`,
        [sessionId, member.id]
      );

      await client.query('COMMIT');

      return { success: true, message: `Member ${member.name} has left the group` };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Host cancels the entire group session
   */
  static async cancelSession(sessionId, actorUserId) {
    if (!sessionId || !actorUserId) {
      const error = new Error("sessionId and actorUserId are required");
      error.statusCode = 400;
      throw error;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const sessionRes = await client.query(
        `SELECT * FROM group_sessions WHERE id = $1 FOR UPDATE`,
        [sessionId]
      );

      if (sessionRes.rows.length === 0) {
        const error = new Error("Session not found");
        error.statusCode = 404;
        throw error;
      }

      const session = sessionRes.rows[0];

      if (session.host_user_id !== actorUserId) {
        const error = new Error("Unauthorized: Only the host can cancel the session");
        error.statusCode = 403;
        throw error;
      }

      if (session.status === 'CONFIRMED') {
        const error = new Error("Cannot cancel a confirmed session without refund flow");
        error.statusCode = 400;
        throw error;
      }

      // Update session status to CANCELLED
      await client.query(
        `UPDATE group_sessions SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
        [sessionId]
      );

      // Release all held seats
      await client.query(
        `UPDATE seat_holds SET status = 'released' WHERE group_session_id = $1 AND status = 'held'`,
        [sessionId]
      );

      await client.query('COMMIT');

      return { success: true, message: "Group session has been cancelled" };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Automatically release any expired seat holds
   */
  static async cleanupExpiredHolds() {
    try {
      const res = await pool.query(
        `UPDATE seat_holds SET status = 'released' WHERE status = 'held' AND expires_at <= NOW()`
      );
      return res.rowCount;
    } catch (err) {
      console.error('Failed to clean up expired seat holds:', err);
      return 0;
    }
  }

  /**
   * Hold a seat atomically for a member
   */
  static async holdSeat(sessionId, { showtimeId, seatId, seatCode, seatType = 'standard', price = 55000, userId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 0. Clean up any expired holds immediately within transaction so they don't block new holds
      await client.query(
        `UPDATE seat_holds SET status = 'released' WHERE status = 'held' AND expires_at <= NOW()`
      );

      // 1. Verify session exists and is active
      const sessionRes = await client.query(
        'SELECT id, status, expires_at, showtime_id FROM group_sessions WHERE id = $1',
        [sessionId]
      );
      if (sessionRes.rows.length === 0) {
        const error = new Error('Session not found');
        error.statusCode = 404;
        throw error;
      }
      const session = sessionRes.rows[0];
      const actualShowtimeId = showtimeId || session.showtime_id;

      // 2. Find member
      const memberRes = await client.query(
        "SELECT id, name, role, color_slot, (role = 'host') as is_host FROM group_members WHERE group_session_id = $1 AND user_id = $2 AND status != $3",
        [sessionId, userId, 'LEFT']
      );
      if (memberRes.rows.length === 0) {
        const error = new Error('Member not found in session');
        error.statusCode = 403;
        throw error;
      }
      const member = memberRes.rows[0];

      // 3. Check if seat is actively held or sold
      const conflictRes = await client.query(
        `SELECT id, group_member_id FROM seat_holds 
         WHERE showtime_id = $1 AND seat_id = $2 AND (status = 'sold' OR (status = 'held' AND expires_at > NOW())) FOR UPDATE`,
        [actualShowtimeId, seatId]
      );

      if (conflictRes.rows.length > 0) {
        const conflict = conflictRes.rows[0];
        if (conflict.group_member_id === member.id) {
          // Idempotent: already held by this member
          await client.query('COMMIT');
          return {
            id: conflict.id,
            seatId,
            seatCode: seatCode || seatId,
            memberId: member.id,
            memberName: member.name,
            userId,
            colorSlot: member.color_slot,
            isNew: false
          };
        }
        const error = new Error(`Ghế ${seatCode || seatId} vừa được người khác chọn`);
        error.statusCode = 409;
        throw error;
      }

      // 3.5 Check if member already has another held seat in this session and release it (swapping seat)
      const prevHoldRes = await client.query(
        `SELECT id, seat_id, seat_code FROM seat_holds WHERE group_session_id = $1 AND group_member_id = $2 AND status = 'held' AND seat_id != $3`,
        [sessionId, member.id, seatId]
      );
      let releasedSeatId = null;
      if (prevHoldRes.rows.length > 0) {
        releasedSeatId = prevHoldRes.rows[0].seat_id;
        await client.query(
          `UPDATE seat_holds SET status = 'released' WHERE id = $1`,
          [prevHoldRes.rows[0].id]
        );
      }

      // 4. Insert seat hold
      const holdId = crypto.randomUUID();
      await client.query(
        `INSERT INTO seat_holds (
          id, showtime_id, seat_id, seat_code, seat_type, price,
          group_session_id, group_member_id, status, held_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'held', NOW(), $9)
        RETURNING *`,
        [
          holdId,
          actualShowtimeId,
          seatId,
          seatCode || seatId,
          seatType,
          price,
          sessionId,
          member.id,
          session.expires_at || new Date(Date.now() + 15 * 60 * 1000)
        ]
      );

      await client.query('COMMIT');

      return {
        id: holdId,
        seatId,
        seatCode: seatCode || seatId,
        memberId: member.id,
        memberName: member.name,
        userId,
        colorSlot: member.color_slot,
        releasedSeatId,
        isNew: true
      };
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        const conflictErr = new Error(`Ghế ${seatCode || seatId} vừa được người khác chọn`);
        conflictErr.statusCode = 409;
        throw conflictErr;
      }
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Start seat hold countdown timer when user clicks 'Tiếp tục' in SeatSelectionScreen
   */
  static async startSeatHoldTimer(sessionId, durationMinutes = 10) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const sessionRes = await client.query(
        'SELECT id, status, seat_hold_started_at, seat_hold_expires_at FROM group_sessions WHERE id = $1 FOR UPDATE',
        [sessionId]
      );

      if (sessionRes.rows.length === 0) {
        const error = new Error('Session not found');
        error.statusCode = 404;
        throw error;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

      const updateSessionQuery = `
        UPDATE group_sessions
        SET seat_hold_started_at = COALESCE(seat_hold_started_at, $1),
            seat_hold_expires_at = $2,
            expires_at = $2,
            status = CASE WHEN status IN ('CREATED', 'WAITING_FOR_MEMBERS', 'SELECTING') THEN 'PAYMENT' ELSE status END,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *;
      `;
      const updatedRes = await client.query(updateSessionQuery, [now, expiresAt, sessionId]);

      // Also update expires_at on active held seats
      await client.query(
        `UPDATE seat_holds SET expires_at = $1 WHERE group_session_id = $2 AND status = 'held'`,
        [expiresAt, sessionId]
      );

      await client.query('COMMIT');

      const updated = updatedRes.rows[0];
      return {
        sessionId,
        seatHoldStartedAt: updated.seat_hold_started_at,
        seatHoldExpiresAt: updated.seat_hold_expires_at,
        durationMinutes,
        remainingSeconds: Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000)),
        status: updated.status,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Release a seat held by a member
   */
  static async releaseSeat(sessionId, { seatId, userId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const memberRes = await client.query(
        'SELECT id, name FROM group_members WHERE group_session_id = $1 AND user_id = $2',
        [sessionId, userId]
      );
      if (memberRes.rows.length === 0) {
        const error = new Error('Member not found');
        error.statusCode = 404;
        throw error;
      }
      const member = memberRes.rows[0];

      await client.query(
        `UPDATE seat_holds SET status = 'released' 
         WHERE group_session_id = $1 AND group_member_id = $2 AND seat_id = $3 AND status = 'held'`,
        [sessionId, member.id, seatId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        seatId,
        memberId: member.id,
        memberName: member.name,
        userId
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get all active held seats for a session
   */
  static async getSessionSeats(sessionId) {
    // Release any expired holds first
    await this.cleanupExpiredHolds();

    const res = await pool.query(
      `SELECT sh.id, sh.seat_id, sh.seat_code, sh.seat_type, sh.price, sh.status,
              gm.id as member_id, gm.user_id, gm.name as member_name, gm.role, gm.color_slot,
              (gm.role = 'host') as is_host
       FROM seat_holds sh
       JOIN group_members gm ON sh.group_member_id = gm.id
       WHERE sh.group_session_id = $1 AND sh.status = 'held' AND (sh.expires_at IS NULL OR sh.expires_at > NOW())
       ORDER BY sh.held_at ASC`,
      [sessionId]
    );

    return res.rows;
  }

  /**
   * Get all occupied (sold or actively held) seats for a specific showtime across all sessions
   */
  static async getShowtimeOccupiedSeats(showtimeId) {
    await this.cleanupExpiredHolds();

    const res = await pool.query(
      `SELECT seat_id, status, group_session_id, expires_at
       FROM seat_holds
       WHERE showtime_id = $1 AND (status = 'sold' OR (status = 'held' AND (expires_at IS NULL OR expires_at > NOW())))`,
      [showtimeId]
    );

    const soldSeatIds = [];
    const heldSeatIds = [];
    const holdsMap = {};

    for (const row of res.rows) {
      if (row.status === 'sold') {
        if (!soldSeatIds.includes(row.seat_id)) {
          soldSeatIds.push(row.seat_id);
        }
      } else if (row.status === 'held') {
        if (!heldSeatIds.includes(row.seat_id)) {
          heldSeatIds.push(row.seat_id);
        }
        holdsMap[row.seat_id] = {
          seatId: row.seat_id,
          sessionId: row.group_session_id,
          expiresAt: row.expires_at,
        };
      }
    }

    return {
      showtimeId,
      soldSeatIds,
      heldSeatIds,
      holdsMap
    };
  }

  /**
   * Standard F&B Catalog for Galaxy Cinema
   */
  static getFnBCatalog() {
    return [
      { id: 'c2', name: 'Combo 2 Big Extra', desc: '1 Bắp rang bơ lớn 60oz + 2 Nước ngọt có gas 32oz + 1 snack khoai tây giòn rụm', price: 134000, image: '/combos/combo_2_big_extra.jpg' },
      { id: 'c1', name: 'Combo 1 Big Extra', desc: '1 Bắp rang bơ lớn 60oz + 1 Nước ngọt có gas 32oz + 1 snack thơm ngon', price: 115000, image: '/combos/combo_1_big_extra.jpg' },
      { id: 'c3', name: 'Combo 3', desc: '1 Bắp rang bơ phô mai thơm lừng 60oz + 2 Nước ngọt có gas 32oz mát lạnh', price: 149000, image: '/combos/combo_cheese.jpg' },
      { id: 'c4', name: 'Combo 4', desc: '2 Bắp rang bơ khổng lồ + 4 Nước ngọt có gas 32oz + 2 Snack chia sẻ cùng bạn bè', price: 229000, image: '/combos/combo_group_4.jpg' },
      { id: 'c5', name: 'Combo 2 Big', desc: '1 Bắp rang bơ lớn 60oz + 2 Nước ngọt có gas 22oz vừa vặn cho cặp đôi', price: 109000, image: '/combos/combo_2_big.jpg' },
    ];
  }

  /**
   * Update individual member F&B selection
   */
  static async updateMemberFnB(sessionId, { userId, items }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify member
      const memberRes = await client.query(
        "SELECT id, name, role, color_slot FROM group_members WHERE group_session_id = $1 AND user_id = $2 AND status != 'LEFT'",
        [sessionId, userId]
      );
      if (memberRes.rows.length === 0) {
        const error = new Error('Member not found in session');
        error.statusCode = 404;
        throw error;
      }
      const member = memberRes.rows[0];

      // 2. Find or create draft fnb_order
      let orderRes = await client.query(
        "SELECT id, total_amount FROM fnb_orders WHERE group_session_id = $1 AND group_member_id = $2 AND status = 'draft'",
        [sessionId, member.id]
      );

      let orderId;
      if (orderRes.rows.length > 0) {
        orderId = orderRes.rows[0].id;
        // Clear previous items
        await client.query('DELETE FROM fnb_order_items WHERE fnb_order_id = $1', [orderId]);
      } else {
        orderId = crypto.randomUUID();
        await client.query(
          "INSERT INTO fnb_orders (id, group_session_id, group_member_id, total_amount, status) VALUES ($1, $2, $3, 0, 'draft')",
          [orderId, sessionId, member.id]
        );
      }

      // Catalog lookup for server-side price validation
      const catalog = this.getFnBCatalog().reduce((acc, cur) => {
        acc[cur.id] = cur;
        return acc;
      }, {});

      // 3. Insert new items and compute total
      let totalAmount = 0;
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const qty = parseInt(item.quantity, 10);
          if (qty > 0) {
            const catalogItem = catalog[item.comboId];
            const unitPrice = catalogItem ? catalogItem.price : Number(item.unitPrice || 0);
            const comboName = catalogItem ? catalogItem.name : (item.comboName || item.comboId);
            const subtotal = qty * unitPrice;
            totalAmount += subtotal;

            const itemId = crypto.randomUUID();
            await client.query(
              `INSERT INTO fnb_order_items (id, fnb_order_id, combo_id, combo_name, quantity, unit_price, subtotal)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [itemId, orderId, item.comboId, comboName, qty, unitPrice, subtotal]
            );
          }
        }
      }

      // 4. Update order total
      await client.query(
        'UPDATE fnb_orders SET total_amount = $1, updated_at = NOW() WHERE id = $2',
        [totalAmount, orderId]
      );

      await client.query('COMMIT');

      // Return full session F&B summary
      return await this.getSessionFnBSummary(sessionId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get Group F&B Summary (Anti-duplication aggregate)
   */
  static async getSessionFnBSummary(sessionId) {
    const rows = await pool.query(
      `SELECT gm.id as member_id, gm.user_id, gm.name as member_name, gm.role, gm.color_slot,
              (gm.role = 'host') as is_host,
              fo.id as order_id, fo.total_amount, fo.status as order_status,
              foi.id as item_id, foi.combo_id, foi.combo_name, foi.quantity, foi.unit_price, foi.subtotal
       FROM group_members gm
       LEFT JOIN fnb_orders fo ON fo.group_session_id = gm.group_session_id AND fo.group_member_id = gm.id AND fo.status IN ('draft', 'submitted', 'paid')
       LEFT JOIN fnb_order_items foi ON foi.fnb_order_id = fo.id
       WHERE gm.group_session_id = $1 AND gm.status != 'LEFT'
       ORDER BY gm.joined_at ASC, foi.created_at ASC`,
      [sessionId]
    );

    const membersMap = new Map();
    const aggregateMap = new Map();
    let totalGroupAmount = 0;
    let totalGroupItemsCount = 0;

    for (const r of rows.rows) {
      if (!membersMap.has(r.member_id)) {
        membersMap.set(r.member_id, {
          memberId: r.member_id,
          userId: r.user_id,
          memberName: r.member_name,
          role: r.role,
          colorSlot: r.color_slot,
          isHost: r.is_host,
          orderId: r.order_id || null,
          totalAmount: Number(r.total_amount || 0),
          items: [],
        });
      }

      if (r.item_id && r.quantity > 0) {
        const member = membersMap.get(r.member_id);
        const itemObj = {
          itemId: r.item_id,
          comboId: r.combo_id,
          comboName: r.combo_name,
          quantity: Number(r.quantity),
          unitPrice: Number(r.unit_price),
          subtotal: Number(r.subtotal),
        };
        member.items.push(itemObj);

        // Aggregate across group
        totalGroupItemsCount += Number(r.quantity);
        if (!aggregateMap.has(r.combo_id)) {
          aggregateMap.set(r.combo_id, {
            comboId: r.combo_id,
            comboName: r.combo_name,
            totalQuantity: 0,
            unitPrice: Number(r.unit_price),
            subtotal: 0,
          });
        }
        const agg = aggregateMap.get(r.combo_id);
        agg.totalQuantity += Number(r.quantity);
        agg.subtotal += Number(r.subtotal);
      }
    }

    const membersList = Array.from(membersMap.values());
    for (const m of membersList) {
      totalGroupAmount += m.totalAmount;
    }

    return {
      sessionId,
      totalGroupAmount,
      totalGroupItemsCount,
      members: membersList,
      aggregatedItems: Array.from(aggregateMap.values()),
    };
  }

  /**
   * Calculate full payment breakdown for session (Server-Authoritative)
   */
  static async calculateSessionPaymentSummary(sessionId) {
    const sessionRes = await pool.query(
      'SELECT id, name, status, payment_mode, expires_at, host_user_id FROM group_sessions WHERE id = $1',
      [sessionId]
    );
    if (sessionRes.rows.length === 0) {
      const error = new Error('Session not found');
      error.statusCode = 404;
      throw error;
    }
    const session = sessionRes.rows[0];

    // 1. Get members
    const membersRes = await pool.query(
      "SELECT id, user_id, name, role, color_slot, status FROM group_members WHERE group_session_id = $1 AND status != 'LEFT' ORDER BY joined_at ASC",
      [sessionId]
    );
    const members = membersRes.rows;

    // 2. Get seats
    const seatsRes = await pool.query(
      "SELECT id, seat_id, seat_code, price, group_member_id FROM seat_holds WHERE group_session_id = $1 AND status IN ('held', 'sold')",
      [sessionId]
    );
    const seats = seatsRes.rows;

    // 3. Get F&B orders & items
    const fnbRes = await pool.query(
      `SELECT fo.group_member_id, fo.total_amount as order_total, foi.combo_id, foi.combo_name, foi.quantity, foi.unit_price, foi.subtotal
       FROM fnb_orders fo
       LEFT JOIN fnb_order_items foi ON foi.fnb_order_id = fo.id
       WHERE fo.group_session_id = $1 AND fo.status IN ('draft', 'submitted', 'paid')`,
      [sessionId]
    );

    // 4. Get payments
    const paymentsRes = await pool.query(
      "SELECT id, group_member_id, amount, payment_method, gateway_ref, status, paid_at FROM payments WHERE group_session_id = $1 AND status = 'success'",
      [sessionId]
    );
    const payments = paymentsRes.rows;

    // Group F&B by member
    const fnbMap = new Map();
    for (const r of fnbRes.rows) {
      if (!fnbMap.has(r.group_member_id)) {
        fnbMap.set(r.group_member_id, {
          totalAmount: Number(r.order_total || 0),
          items: [],
        });
      }
      if (r.combo_id) {
        fnbMap.get(r.group_member_id).items.push({
          comboId: r.combo_id,
          comboName: r.combo_name,
          quantity: Number(r.quantity),
          unitPrice: Number(r.unit_price),
          subtotal: Number(r.subtotal),
        });
      }
    }

    // Group payments by member
    const paymentMap = new Map();
    let hostGroupPayment = null;
    for (const p of payments) {
      if (p.group_member_id) {
        paymentMap.set(p.group_member_id, p);
      } else {
        hostGroupPayment = p;
      }
    }

    // Build member breakdowns
    let totalSessionAmount = 0;
    let paidMembersCount = 0;

    const memberBreakdowns = members.map((m) => {
      const memberSeats = seats.filter((s) => s.group_member_id === m.id);
      const seatAmount = memberSeats.reduce((sum, s) => sum + Number(s.price || 55000), 0);
      const memberFnb = fnbMap.get(m.id) || { totalAmount: 0, items: [] };
      const fnbAmount = memberFnb.totalAmount;
      const memberTotal = seatAmount + fnbAmount;
      totalSessionAmount += memberTotal;

      const memberPayment = paymentMap.get(m.id) || hostGroupPayment;
      const isPaid = m.status === 'PAID' || m.status === 'CONFIRMED' || !!memberPayment || session.status === 'CONFIRMED';

      if (isPaid) {
        paidMembersCount++;
      }

      return {
        memberId: m.id,
        userId: m.user_id,
        memberName: m.name,
        role: m.role,
        colorSlot: m.color_slot,
        status: m.status,
        isHost: m.role === 'host',
        seats: memberSeats.map((s) => ({
          id: s.id,
          seatId: s.seat_id,
          seatCode: s.seat_code,
          price: Number(s.price || 55000),
        })),
        seatAmount,
        fnbItems: memberFnb.items,
        fnbAmount,
        totalAmount: memberTotal,
        isPaid,
        payment: memberPayment
          ? {
              id: memberPayment.id,
              amount: Number(memberPayment.amount),
              paymentMethod: memberPayment.payment_method,
              gatewayRef: memberPayment.gateway_ref,
              paidAt: memberPayment.paid_at,
            }
          : null,
      };
    });

    const isAllPaid = members.length > 0 && paidMembersCount >= members.length;

    return {
      sessionId: session.id,
      sessionName: session.name,
      sessionStatus: session.status,
      paymentMode: session.payment_mode,
      hostUserId: session.host_user_id,
      totalSessionAmount,
      totalMembers: members.length,
      paidMembersCount,
      isAllPaid,
      isConfirmed: session.status === 'CONFIRMED',
      members: memberBreakdowns,
    };
  }

  /**
   * Process payment for an individual member (Split-Pay)
   */
  static async processMemberPayment(sessionId, { userId, paymentMethod = 'momo', payerUserId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify session
      const sessionRes = await client.query(
        'SELECT id, status, payment_mode, host_user_id FROM group_sessions WHERE id = $1 FOR UPDATE',
        [sessionId]
      );
      if (sessionRes.rows.length === 0) {
        const err = new Error('Session not found');
        err.statusCode = 404;
        throw err;
      }
      const session = sessionRes.rows[0];

      // 2. Verify member
      const memberRes = await client.query(
        "SELECT id, name, role, color_slot, status FROM group_members WHERE group_session_id = $1 AND user_id = $2 AND status != 'LEFT'",
        [sessionId, userId]
      );
      if (memberRes.rows.length === 0) {
        const err = new Error('Member not found in session');
        err.statusCode = 404;
        throw err;
      }
      const member = memberRes.rows[0];

      // 3. Compute member amount (Server-authoritative)
      const seatsRes = await client.query(
        "SELECT price FROM seat_holds WHERE group_session_id = $1 AND group_member_id = $2 AND status IN ('held', 'sold')",
        [sessionId, member.id]
      );
      const seatTotal = seatsRes.rows.reduce((sum, s) => sum + Number(s.price || 55000), 0);

      const fnbRes = await client.query(
        "SELECT total_amount FROM fnb_orders WHERE group_session_id = $1 AND group_member_id = $2 AND status IN ('draft', 'submitted', 'paid')",
        [sessionId, member.id]
      );
      const fnbTotal = fnbRes.rows.reduce((sum, f) => sum + Number(f.total_amount || 0), 0);

      const memberTotal = seatTotal + fnbTotal;

      // 4. Check if already paid (idempotent)
      const existingPayRes = await client.query(
        "SELECT id, amount, payment_method, gateway_ref, paid_at FROM payments WHERE group_session_id = $1 AND group_member_id = $2 AND status = 'success'",
        [sessionId, member.id]
      );
      if (existingPayRes.rows.length > 0) {
        await client.query('COMMIT');
        const summary = await this.calculateSessionPaymentSummary(sessionId);
        return {
          success: true,
          isNew: false,
          payment: existingPayRes.rows[0],
          isAllPaid: summary.isAllPaid,
          isConfirmed: summary.isConfirmed,
          summary,
        };
      }

      // 5. Insert payment record
      const paymentId = crypto.randomUUID();
      const subOrderId = `SUB_GLX_${Date.now()}_${member.color_slot || 'm1'}`;
      const gatewayRef = `TRANS_${paymentMethod.toUpperCase()}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

      await client.query(
        `INSERT INTO payments (
          id, group_session_id, group_member_id, sub_order_id, amount,
          payment_method, gateway_ref, status, paid_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'success', NOW())`,
        [paymentId, sessionId, member.id, subOrderId, memberTotal, paymentMethod, gatewayRef]
      );

      // 6. Update member status to PAID
      await client.query(
        "UPDATE group_members SET status = 'PAID', sub_order_id = $1, updated_at = NOW() WHERE id = $2",
        [subOrderId, member.id]
      );

      // 7. Update member's F&B orders to paid
      await client.query(
        "UPDATE fnb_orders SET status = 'paid', sub_order_id = $1, updated_at = NOW() WHERE group_session_id = $2 AND group_member_id = $3",
        [subOrderId, sessionId, member.id]
      );

      // 8. Check if all members are now PAID
      const unpaidCountRes = await client.query(
        "SELECT count(*) FROM group_members WHERE group_session_id = $1 AND status NOT IN ('PAID', 'CONFIRMED') AND status != 'LEFT'",
        [sessionId]
      );
      const unpaidCount = parseInt(unpaidCountRes.rows[0].count, 10);
      const isAllPaid = unpaidCount === 0;

      if (isAllPaid) {
        // Confirm entire session
        await client.query(
          "UPDATE group_sessions SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1",
          [sessionId]
        );
        // Mark all held seats as sold
        await client.query(
          "UPDATE seat_holds SET status = 'sold' WHERE group_session_id = $1 AND status = 'held'",
          [sessionId]
        );
        // Create or update group_bookings
        const totalSessionRes = await client.query(
          "SELECT sum(amount) as total FROM payments WHERE group_session_id = $1 AND status = 'success'",
          [sessionId]
        );
        const bookingTotal = Number(totalSessionRes.rows[0].total || memberTotal);
        const bookingId = crypto.randomUUID();
        await client.query(
          `INSERT INTO group_bookings (id, group_session_id, total_amount, status)
           VALUES ($1, $2, $3, 'confirmed')
           ON CONFLICT (group_session_id) DO UPDATE SET total_amount = $3, status = 'confirmed'`,
          [bookingId, sessionId, bookingTotal]
        );
      }

      await client.query('COMMIT');

      const summary = await this.calculateSessionPaymentSummary(sessionId);

      return {
        success: true,
        isNew: true,
        payment: {
          id: paymentId,
          amount: memberTotal,
          paymentMethod,
          gatewayRef,
          paidAt: new Date().toISOString(),
        },
        memberId: member.id,
        memberName: member.name,
        userId,
        payerUserId: payerUserId || userId,
        isAllPaid: summary.isAllPaid,
        isConfirmed: summary.isConfirmed,
        summary,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Process host payment for entire group (Host-Pays)
   */
  static async processHostPaysAll(sessionId, { hostUserId, paymentMethod = 'momo' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify session & host
      const sessionRes = await client.query(
        'SELECT id, status, host_user_id, name FROM group_sessions WHERE id = $1 FOR UPDATE',
        [sessionId]
      );
      if (sessionRes.rows.length === 0) {
        const err = new Error('Session not found');
        err.statusCode = 404;
        throw err;
      }
      const session = sessionRes.rows[0];
      if (session.host_user_id !== hostUserId) {
        const err = new Error('Unauthorized: Only Host can pay for the entire group');
        err.statusCode = 403;
        throw err;
      }

      // 2. Compute total for all members (seats + fnb)
      const seatsRes = await client.query(
        "SELECT sum(price) as seat_sum FROM seat_holds WHERE group_session_id = $1 AND status IN ('held', 'sold')",
        [sessionId]
      );
      const seatTotal = Number(seatsRes.rows[0].seat_sum || 0);

      const fnbRes = await client.query(
        "SELECT sum(total_amount) as fnb_sum FROM fnb_orders WHERE group_session_id = $1 AND status IN ('draft', 'submitted', 'paid')",
        [sessionId]
      );
      const fnbTotal = Number(fnbRes.rows[0].fnb_sum || 0);

      const totalAmount = seatTotal + fnbTotal;

      // 3. Insert single payment row for entire group
      const paymentId = crypto.randomUUID();
      const subOrderId = `HOST_GLX_${Date.now()}`;
      const gatewayRef = `TRANS_HOST_${paymentMethod.toUpperCase()}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

      await client.query(
        `INSERT INTO payments (
          id, group_session_id, group_member_id, sub_order_id, amount,
          payment_method, gateway_ref, status, paid_at
        ) VALUES ($1, $2, NULL, $3, $4, $5, $6, 'success', NOW())`,
        [paymentId, sessionId, subOrderId, totalAmount, paymentMethod, gatewayRef]
      );

      // 4. Mark all members as PAID
      await client.query(
        "UPDATE group_members SET status = 'PAID', sub_order_id = $1, updated_at = NOW() WHERE group_session_id = $2 AND status != 'LEFT'",
        [subOrderId, sessionId]
      );

      // 5. Mark session as CONFIRMED
      await client.query(
        "UPDATE group_sessions SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1",
        [sessionId]
      );

      // 6. Mark all seats as sold
      await client.query(
        "UPDATE seat_holds SET status = 'sold' WHERE group_session_id = $1 AND status = 'held'",
        [sessionId]
      );

      // 7. Mark all F&B as paid
      await client.query(
        "UPDATE fnb_orders SET status = 'paid', sub_order_id = $1, updated_at = NOW() WHERE group_session_id = $2",
        [subOrderId, sessionId]
      );

      // 8. Create group_booking
      const bookingId = crypto.randomUUID();
      await client.query(
        `INSERT INTO group_bookings (id, group_session_id, total_amount, status)
         VALUES ($1, $2, $3, 'confirmed')
         ON CONFLICT (group_session_id) DO UPDATE SET total_amount = $3, status = 'confirmed'`,
        [bookingId, sessionId, totalAmount]
      );

      await client.query('COMMIT');

      const summary = await this.calculateSessionPaymentSummary(sessionId);

      return {
        success: true,
        payment: {
          id: paymentId,
          amount: totalAmount,
          paymentMethod,
          gatewayRef,
          paidAt: new Date().toISOString(),
        },
        isAllPaid: true,
        isConfirmed: true,
        summary,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
