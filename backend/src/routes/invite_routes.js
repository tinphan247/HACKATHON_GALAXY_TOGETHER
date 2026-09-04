/**
 * Invite API Routes
 * Mounts at: /api/invites
 */

import { Router } from 'express';
import { SessionService } from '../services/session_service.js';
import { pool } from '../db.js';

const router = Router();

// GET /api/invites/:code - Preview invite info before joining
router.get('/:code', async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    const inviteRes = await pool.query(
      `SELECT i.code, i.qr_payload, i.expires_at, s.id as session_id, s.name as session_name,
              s.movie_title, s.cinema_name, s.show_date, s.show_time, s.screen_name,
              s.host_name, s.max_members, s.status,
              (SELECT count(*) FROM group_members gm WHERE gm.group_session_id = s.id AND gm.status != 'LEFT') as current_members
       FROM invites i
       JOIN group_sessions s ON i.group_session_id = s.id
       WHERE i.code = $1`,
      [code]
    );

    if (inviteRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Mã mời không tồn tại: ${code}`
      });
    }

    res.json({
      success: true,
      data: inviteRes.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

import { realtimeGateway } from '../realtime/gateway.js';

// POST /api/invites/:code/join - Join session via code or scanned QR
router.post('/:code/join', async (req, res, next) => {
  try {
    const { userId, name } = req.body;
    const result = await SessionService.joinByCode(req.params.code, { userId, name });

    // Emit Realtime Event to all subscribers in this session
    if (result && result.session?.id) {
      realtimeGateway.broadcast(result.session.id, 'GROUP_MEMBER_JOINED', {
        member: result.member,
        isNew: result.isNew,
        session: result.session,
      });
    }

    res.status(result.isNew ? 201 : 200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

export default router;
