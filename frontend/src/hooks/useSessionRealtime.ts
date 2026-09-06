import { useEffect, useState, useRef } from 'react';
import { realtimeService, type RealtimeStatus, type RealtimeEvent } from '../services/realtimeService';

interface UseSessionRealtimeOptions {
  sessionId: string | null;
  userId?: string;
  onMemberJoined?: (payload: RealtimeEvent['payload']) => void;
  onMemberLeft?: (payload: RealtimeEvent['payload']) => void;
  onSessionCancelled?: (payload: RealtimeEvent['payload']) => void;
  onSeatHeld?: (payload: RealtimeEvent['payload']) => void;
  onSeatReleased?: (payload: RealtimeEvent['payload']) => void;
  onFnBUpdated?: (payload: RealtimeEvent['payload']) => void;
  onPaymentUpdated?: (payload: RealtimeEvent['payload']) => void;
  onSessionConfirmed?: (payload: RealtimeEvent['payload']) => void;
  onHoldTimerStarted?: (payload: RealtimeEvent['payload']) => void;
  onGroupPaymentSuccess?: (payload: RealtimeEvent['payload']) => void;
  onGroupTicketsIssued?: (payload: RealtimeEvent['payload']) => void;
  onReconnected?: () => void;
}

export function useSessionRealtime({
  sessionId,
  userId,
  onMemberJoined,
  onMemberLeft,
  onSessionCancelled,
  onSeatHeld,
  onSeatReleased,
  onFnBUpdated,
  onPaymentUpdated,
  onSessionConfirmed,
  onHoldTimerStarted,
  onGroupPaymentSuccess,
  onGroupTicketsIssued,
  onReconnected,
}: UseSessionRealtimeOptions) {
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(realtimeService.getStatus());
  const prevStatusRef = useRef<RealtimeStatus>(realtimeStatus);

  const callbacksRef = useRef({
    onMemberJoined,
    onMemberLeft,
    onSessionCancelled,
    onSeatHeld,
    onSeatReleased,
    onFnBUpdated,
    onPaymentUpdated,
    onSessionConfirmed,
    onHoldTimerStarted,
    onGroupPaymentSuccess,
    onGroupTicketsIssued,
    onReconnected,
  });

  useEffect(() => {
    callbacksRef.current = {
      onMemberJoined,
      onMemberLeft,
      onSessionCancelled,
      onSeatHeld,
      onSeatReleased,
      onFnBUpdated,
      onPaymentUpdated,
      onSessionConfirmed,
      onHoldTimerStarted,
      onGroupPaymentSuccess,
      onGroupTicketsIssued,
      onReconnected,
    };
  });

  useEffect(() => {
    const unsubStatus = realtimeService.onStatusChange((status) => {
      if (
        (prevStatusRef.current === 'RECONNECTING' || prevStatusRef.current === 'DISCONNECTED') &&
        status === 'CONNECTED'
      ) {
        callbacksRef.current.onReconnected?.();
      }
      prevStatusRef.current = status;
      setRealtimeStatus(status);
    });

    const unsubEvents = realtimeService.onEvent((event) => {
      switch (event.type) {
        case 'GROUP_MEMBER_JOINED':
          callbacksRef.current.onMemberJoined?.(event.payload);
          break;
        case 'GROUP_MEMBER_LEFT':
          callbacksRef.current.onMemberLeft?.(event.payload);
          break;
        case 'GROUP_CANCELLED':
        case 'GROUP_SESSION_EXPIRED':
          callbacksRef.current.onSessionCancelled?.(event.payload);
          break;
        case 'SEAT_HELD':
        case 'GROUP_MEMBER_SEAT_SELECTED':
          callbacksRef.current.onSeatHeld?.(event.payload);
          break;
        case 'SEAT_RELEASED':
        case 'GROUP_MEMBER_SEAT_RELEASED':
          callbacksRef.current.onSeatReleased?.(event.payload);
          break;
        case 'HOLD_TIMER_STARTED':
          callbacksRef.current.onHoldTimerStarted?.(event.payload);
          break;
        case 'FNB_UPDATED':
          callbacksRef.current.onFnBUpdated?.(event.payload);
          break;
        case 'PAYMENT_UPDATED':
        case 'GROUP_MEMBER_PAYMENT_COMPLETED':
          callbacksRef.current.onPaymentUpdated?.(event.payload);
          break;
        case 'SESSION_CONFIRMED':
        case 'GROUP_MEMBER_BOOKING_CONFIRMED':
          callbacksRef.current.onSessionConfirmed?.(event.payload);
          break;
        case 'GROUP_PAYMENT_SUCCESS':
          callbacksRef.current.onGroupPaymentSuccess?.(event.payload);
          break;
        case 'GROUP_TICKETS_ISSUED':
          callbacksRef.current.onGroupTicketsIssued?.(event.payload);
          break;
        default:
          break;
      }
    });

    if (sessionId) {
      realtimeService.connect(sessionId, userId);
    }

    return () => {
      unsubStatus();
      unsubEvents();
    };
  }, [sessionId, userId]);

  return {
    realtimeStatus,
    isConnected: realtimeStatus === 'CONNECTED',
    isReconnecting: realtimeStatus === 'RECONNECTING',
  };
}
