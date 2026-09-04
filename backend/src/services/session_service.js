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
   * Hold a seat atomically for a member
   */
  static async holdSeat(sessionId, { showtimeId, seatId, seatCode, seatType = 'standard', price = 55000, userId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

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
        "SELECT id, name, role, (role = 'host') as is_host FROM group_members WHERE group_session_id = $1 AND user_id = $2 AND status != $3",
        [sessionId, userId, 'LEFT']
      );
      if (memberRes.rows.length === 0) {
        const error = new Error('Member not found in session');
        error.statusCode = 403;
        throw error;
      }
      const member = memberRes.rows[0];

      // 3. Check if seat is already held or sold
      const conflictRes = await client.query(
        `SELECT id, group_member_id FROM seat_holds 
         WHERE showtime_id = $1 AND seat_id = $2 AND status IN ('held', 'sold') FOR UPDATE`,
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
            isNew: false
          };
        }
        const error = new Error(`Ghế ${seatCode || seatId} vừa được người khác chọn`);
        error.statusCode = 409;
        throw error;
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
    const res = await pool.query(
      `SELECT sh.id, sh.seat_id, sh.seat_code, sh.seat_type, sh.price, sh.status,
              gm.id as member_id, gm.user_id, gm.name as member_name, gm.role,
              (gm.role = 'host') as is_host
       FROM seat_holds sh
       JOIN group_members gm ON sh.group_member_id = gm.id
       WHERE sh.group_session_id = $1 AND sh.status = 'held'
       ORDER BY sh.held_at ASC`,
      [sessionId]
    );

    return res.rows;
  }
}
