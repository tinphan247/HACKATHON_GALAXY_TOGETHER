/**
 * Group Session API Routes
 * Mounts at: /api/group-sessions
 */

import { Router } from 'express';
import { SessionService } from '../services/session_service.js';

const router = Router();

// POST /api/group-sessions - Create group session
router.post('/', async (req, res, next) => {
  try {
    const result = await SessionService.createSession(req.body);
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/group-sessions/:id - Get session details and members
router.get('/:id', async (req, res, next) => {
  try {
    const session = await SessionService.getSession(req.params.id);
    res.json({
      success: true,
      data: session
    });
  } catch (err) {
    next(err);
  }
});

import { realtimeGateway } from '../realtime/gateway.js';

// POST /api/group-sessions/:id/leave - Member leaves session
router.post('/:id/leave', async (req, res, next) => {
  try {
    const { userId } = req.body;
    const result = await SessionService.leaveSession(req.params.id, userId);

    realtimeGateway.broadcast(req.params.id, 'GROUP_MEMBER_LEFT', {
      userId,
      member: result.member,
      session: result.session,
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/group-sessions/:id/cancel - Host cancels session
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const { actorUserId } = req.body;
    const result = await SessionService.cancelSession(req.params.id, actorUserId);

    realtimeGateway.broadcast(req.params.id, 'GROUP_CANCELLED', {
      actorUserId,
      session: result.session,
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/group-sessions/:id/seats - Get all active held seats for this session
router.get('/:id/seats', async (req, res, next) => {
  try {
    const seats = await SessionService.getSessionSeats(req.params.id);
    res.json({
      success: true,
      data: seats
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/group-sessions/:id/seats/hold - Hold a seat
router.post('/:id/seats/hold', async (req, res, next) => {
  try {
    const { showtimeId, seatId, seatCode, seatType, price, userId } = req.body;
    const result = await SessionService.holdSeat(req.params.id, {
      showtimeId,
      seatId,
      seatCode,
      seatType,
      price,
      userId
    });

    // Broadcast SEAT_HELD to all connected users in this session
    realtimeGateway.broadcast(req.params.id, 'SEAT_HELD', {
      seatId: result.seatId,
      seatCode: result.seatCode,
      memberId: result.memberId,
      memberName: result.memberName,
      userId: result.userId,
    });

    res.status(result.isNew ? 201 : 200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/group-sessions/:id/seats/release - Release a seat
router.post('/:id/seats/release', async (req, res, next) => {
  try {
    const { seatId, userId } = req.body;
    const result = await SessionService.releaseSeat(req.params.id, {
      seatId,
      userId
    });

    // Broadcast SEAT_RELEASED to all connected users in this session
    realtimeGateway.broadcast(req.params.id, 'SEAT_RELEASED', {
      seatId: result.seatId,
      memberId: result.memberId,
      memberName: result.memberName,
      userId: result.userId,
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

export default router;
