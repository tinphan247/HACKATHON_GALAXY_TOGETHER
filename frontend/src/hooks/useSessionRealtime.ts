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
    onReconnected,
  });

  useEffect(() => {
    callbacksRef.current = {
      onMemberJoined,
      onMemberLeft,
      onSessionCancelled,
      onSeatHeld,
      onSeatReleased,
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
          callbacksRef.current.onSessionCancelled?.(event.payload);
          break;
        case 'SEAT_HELD':
          callbacksRef.current.onSeatHeld?.(event.payload);
          break;
        case 'SEAT_RELEASED':
          callbacksRef.current.onSeatReleased?.(event.payload);
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
