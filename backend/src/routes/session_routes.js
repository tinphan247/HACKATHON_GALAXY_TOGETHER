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

    // If member swapped seat from a previously held seat, broadcast SEAT_RELEASED for the old seat
    if (result.releasedSeatId) {
      realtimeGateway.broadcast(req.params.id, 'SEAT_RELEASED', {
        seatId: result.releasedSeatId,
        memberId: result.memberId,
        memberName: result.memberName,
        userId: result.userId,
      });
    }

    // Broadcast SEAT_HELD to all connected users in this session
    realtimeGateway.broadcast(req.params.id, 'SEAT_HELD', {
      seatId: result.seatId,
      seatCode: result.seatCode,
      memberId: result.memberId,
      memberName: result.memberName,
      userId: result.userId,
      colorSlot: result.colorSlot,
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

// POST /api/group-sessions/:id/checkout - Start seat hold timer and advance to F&B/Payment
router.post('/:id/checkout', async (req, res, next) => {
  try {
    const durationMinutes = req.body?.durationMinutes || 10;
    const result = await SessionService.startSeatHoldTimer(req.params.id, durationMinutes);

    realtimeGateway.broadcast(req.params.id, 'HOLD_TIMER_STARTED', {
      sessionId: req.params.id,
      seatHoldStartedAt: result.seatHoldStartedAt,
      seatHoldExpiresAt: result.seatHoldExpiresAt,
      durationMinutes: result.durationMinutes,
      remainingSeconds: result.remainingSeconds,
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/group-sessions/fnb/catalog - Get standard cinema F&B combos
router.get('/fnb/catalog', (req, res) => {
  res.json({
    success: true,
    data: SessionService.getFnBCatalog()
  });
});

// GET /api/group-sessions/:id/fnb - Get Group F&B Summary (Anti-duplication)
router.get('/:id/fnb', async (req, res, next) => {
  try {
    const summary = await SessionService.getSessionFnBSummary(req.params.id);
    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/group-sessions/:id/fnb - Update individual member F&B and broadcast
router.post('/:id/fnb', async (req, res, next) => {
  try {
    const { userId, items } = req.body;
    const summary = await SessionService.updateMemberFnB(req.params.id, {
      userId,
      items
    });

    // Realtime WebSocket broadcast to all members in room
    realtimeGateway.broadcast(req.params.id, 'FNB_UPDATED', summary);

    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/group-sessions/:id/payments - Get full server-authoritative payment summary
router.get('/:id/payments', async (req, res, next) => {
  try {
    const summary = await SessionService.calculateSessionPaymentSummary(req.params.id);
    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/group-sessions/:id/payments/member - Pay for individual member (Split-Pay)
router.post('/:id/payments/member', async (req, res, next) => {
  try {
    const { userId, paymentMethod, payerUserId } = req.body;
    const result = await SessionService.processMemberPayment(req.params.id, {
      userId,
      paymentMethod,
      payerUserId
    });

    // Broadcast PAYMENT_UPDATED
    realtimeGateway.broadcast(req.params.id, 'PAYMENT_UPDATED', {
      memberId: result.memberId,
      memberName: result.memberName,
      userId: result.userId,
      payerUserId: result.payerUserId,
      amount: result.payment?.amount,
      paymentMethod: result.payment?.paymentMethod,
      isAllPaid: result.isAllPaid,
      isConfirmed: result.isConfirmed,
      summary: result.summary,
    });

    // If whole session is confirmed, broadcast SESSION_CONFIRMED
    if (result.isConfirmed) {
      realtimeGateway.broadcast(req.params.id, 'SESSION_CONFIRMED', {
        sessionId: req.params.id,
        totalAmount: result.summary?.totalSessionAmount,
        summary: result.summary,
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/group-sessions/:id/payments/host-all - Host pays for entire group
router.post('/:id/payments/host-all', async (req, res, next) => {
  try {
    const { hostUserId, paymentMethod } = req.body;
    const result = await SessionService.processHostPaysAll(req.params.id, {
      hostUserId,
      paymentMethod
    });

    // Broadcast PAYMENT_UPDATED & SESSION_CONFIRMED
    realtimeGateway.broadcast(req.params.id, 'PAYMENT_UPDATED', {
      isAllPaid: true,
      isConfirmed: true,
      summary: result.summary,
    });

    realtimeGateway.broadcast(req.params.id, 'SESSION_CONFIRMED', {
      sessionId: req.params.id,
      totalAmount: result.payment?.amount,
      paymentMethod: result.payment?.paymentMethod,
      summary: result.summary,
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


