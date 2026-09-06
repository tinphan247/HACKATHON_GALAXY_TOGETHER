import { API_BASE_URL } from '../constants/config';
import type { GroupMemberResponse } from '../types/api';

export type RealtimeStatus = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

export interface RealtimeEvent {
  type:
    | 'GROUP_MEMBER_JOINED'
    | 'GROUP_MEMBER_LEFT'
    | 'GROUP_CANCELLED'
    | 'SEAT_HELD'
    | 'SEAT_RELEASED'
    | 'HOLD_TIMER_STARTED'
    | 'GROUP_MEMBER_SEAT_SELECTED'
    | 'GROUP_MEMBER_SEAT_RELEASED'
    | 'GROUP_MEMBER_PAYMENT_COMPLETED'
    | 'GROUP_MEMBER_BOOKING_CONFIRMED'
    | 'GROUP_SESSION_EXPIRED'
    | 'FNB_UPDATED'
    | 'PAYMENT_UPDATED'
    | 'SESSION_CONFIRMED'
    | 'GROUP_PAYMENT_SUCCESS'
    | 'GROUP_TICKETS_ISSUED'
    | 'CONNECTED'
    | 'SUBSCRIBED'
    | 'PONG';
  sessionId?: string;
  payload?: {
    member?: GroupMemberResponse;
    isNew?: boolean;
    userId?: string;
    payerUserId?: string;
    actorUserId?: string;
    session?: unknown;
    seatId?: string;
    seatCode?: string;
    memberId?: string;
    memberName?: string;
    colorKey?: string;
    colorHex?: string;
    colorSlot?: string;
    // Hold Timer payload
    expiresAt?: string;
    startedAt?: string;
    seatHoldStartedAt?: string;
    seatHoldExpiresAt?: string;
    durationMinutes?: number;
    remainingSeconds?: number;
    // F&B Summary payload
    totalGroupAmount?: number;
    totalGroupItemsCount?: number;
    members?: unknown[];
    aggregatedItems?: unknown[];
    // Payment payload
    amount?: number;
    paymentMethod?: string;
    isAllPaid?: boolean;
    isConfirmed?: boolean;
    summary?: unknown;
    // Group Payment & Ticket payload
    groupSessionId?: string;
    groupOrderId?: string;
    paymentId?: string;
    status?: string;
    paidBy?: string;
    totalAmount?: number;
    tickets?: any[];
  };
  timestamp?: string;
}

type EventListener = (event: RealtimeEvent) => void;
type StatusListener = (status: RealtimeStatus) => void;

class RealtimeService {
  private socket: WebSocket | null = null;
  private currentSessionId: string | null = null;
  private currentUserId: string | null = null;
  private status: RealtimeStatus = 'DISCONNECTED';
  private eventListeners: Set<EventListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private pingInterval: number | null = null;
  private shouldReconnect = true;

  private getWsUrl(sessionId?: string, userId?: string): string {
    const httpUrl = API_BASE_URL.replace(/^http/, 'ws');
    const params = new URLSearchParams();
    if (sessionId) params.set('sessionId', sessionId);
    if (userId) params.set('userId', userId);
    const queryString = params.toString();
    return `${httpUrl}/ws${queryString ? '?' + queryString : ''}`;
  }

  public connect(sessionId: string, userId?: string) {
    const isNewSession = this.currentSessionId !== sessionId;
    this.currentSessionId = sessionId;
    if (userId) this.currentUserId = userId;
    this.shouldReconnect = true;

    // If socket exists but points to a different session, close it and reconnect to new session
    if (this.socket && isNewSession) {
      this.disconnect();
      this.shouldReconnect = true;
      this.currentSessionId = sessionId;
      if (userId) this.currentUserId = userId;
      this.initSocket();
      return;
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.send({ type: 'SUBSCRIBE', sessionId, userId });
      return;
    }

    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      return; // Will auto-subscribe onopen
    }

    this.initSocket();
  }

  private initSocket() {
    if (!this.currentSessionId) return;

    this.setStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');
    const wsUrl = this.getWsUrl(this.currentSessionId, this.currentUserId || undefined);

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');
        this.startPing();
        if (this.currentSessionId) {
          this.send({
            type: 'SUBSCRIBE',
            sessionId: this.currentSessionId,
            userId: this.currentUserId,
          });
        }
      };

      this.socket.onmessage = (evt) => {
        try {
          const data: RealtimeEvent = JSON.parse(evt.data);
          this.notifyEventListeners(data);
        } catch (err) {
          console.error('[RealtimeService] Parse error:', err);
        }
      };

      this.socket.onclose = () => {
        this.stopPing();
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        } else {
          this.setStatus('DISCONNECTED');
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[RealtimeService] Socket error:', err);
      };
    } catch (err) {
      console.error('[RealtimeService] Connection failed:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    this.setStatus('RECONNECTING');
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    // Exponential backoff capped at 10s
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    this.reconnectTimer = window.setTimeout(() => {
      this.initSocket();
    }, delay);
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.send({ type: 'PING' });
      }
    }, 25000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.currentSessionId = null;
    this.setStatus('DISCONNECTED');
  }

  public send(data: object) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  public holdSeat(seatId: string, userId: string, memberName: string, colorKey?: string, colorHex?: string) {
    this.send({
      type: 'SEAT_HOLD',
      seatId,
      userId,
      memberName,
      colorKey,
      colorHex,
    });
  }

  public releaseSeat(seatId: string, userId: string, memberName: string) {
    this.send({
      type: 'SEAT_RELEASE',
      seatId,
      userId,
      memberName,
    });
  }

  public onEvent(callback: EventListener): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  public onStatusChange(callback: StatusListener): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  private notifyEventListeners(event: RealtimeEvent) {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[RealtimeService] Listener error:', err);
      }
    }
  }

  private setStatus(status: RealtimeStatus) {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  public getStatus(): RealtimeStatus {
    return this.status;
  }
}

export const realtimeService = new RealtimeService();
