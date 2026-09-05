import { apiClient } from '../api/client';
import type {
  CreateSessionRequest,
  CreateSessionResponseData,
  GroupSessionDetailResponseData,
  InvitePreviewResponseData,
  JoinInviteRequest,
  JoinInviteResponseData,
} from '../types/api';

export const groupSessionService = {
  /**
   * Health check
   */
  async checkHealth(): Promise<{ status: string; database: string }> {
    return apiClient<{ status: string; database: string }>('/api/health');
  },

  /**
   * Create a new group session (Host)
   */
  async createSession(req: CreateSessionRequest): Promise<CreateSessionResponseData> {
    return apiClient<CreateSessionResponseData>('/api/group-sessions', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /**
   * Get session details with member list
   */
  async getSession(sessionId: string): Promise<GroupSessionDetailResponseData> {
    return apiClient<GroupSessionDetailResponseData>(`/api/group-sessions/${sessionId}`, {
      method: 'GET',
    });
  },

  /**
   * Preview invite metadata before joining
   */
  async previewInvite(code: string): Promise<InvitePreviewResponseData> {
    return apiClient<InvitePreviewResponseData>(`/api/invites/${code.toUpperCase().trim()}`, {
      method: 'GET',
    });
  },

  /**
   * Join group session via invite code or scanned QR
   */
  async joinByCode(code: string, req: JoinInviteRequest): Promise<JoinInviteResponseData> {
    return apiClient<JoinInviteResponseData>(`/api/invites/${code.toUpperCase().trim()}/join`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /**
   * Leave session
   */
  async leaveSession(sessionId: string, userId: string): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>(`/api/group-sessions/${sessionId}/leave`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  /**
   * Cancel session (Host only)
   */
  async cancelSession(sessionId: string, actorUserId: string): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>(`/api/group-sessions/${sessionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ actorUserId }),
    });
  },

  /**
   * Get all active held seats for a session
   */
  async getSessionSeats(sessionId: string): Promise<Array<{
    seat_id: string;
    seat_code: string;
    seat_type: string;
    user_id: string;
    member_name: string;
  }>> {
    return apiClient<Array<{
      seat_id: string;
      seat_code: string;
      seat_type: string;
      user_id: string;
      member_name: string;
    }>>(`/api/group-sessions/${sessionId}/seats`, {
      method: 'GET',
    });
  },

  /**
   * Get all occupied (sold or active held) seats for a showtime across all sessions
   */
  async getShowtimeOccupiedSeats(showtimeId: string): Promise<{
    showtimeId: string;
    soldSeatIds: string[];
    heldSeatIds: string[];
    holdsMap: Record<string, { seatId: string; sessionId: string; expiresAt: string }>;
  }> {
    return apiClient<{
      showtimeId: string;
      soldSeatIds: string[];
      heldSeatIds: string[];
      holdsMap: Record<string, { seatId: string; sessionId: string; expiresAt: string }>;
    }>(`/api/group-sessions/showtimes/${encodeURIComponent(showtimeId)}/occupied-seats`, {
      method: 'GET',
    });
  },

  /**
   * Hold a seat
   */
  async holdSeat(
    sessionId: string,
    req: { showtimeId?: string; seatId: string; seatCode?: string; seatType?: string; price?: number; userId: string }
  ): Promise<{ id: string; seatId: string; memberName: string; isNew: boolean }> {
    return apiClient<{ id: string; seatId: string; memberName: string; isNew: boolean }>(
      `/api/group-sessions/${sessionId}/seats/hold`,
      {
        method: 'POST',
        body: JSON.stringify(req),
      }
    );
  },

  /**
   * Release a held seat
   */
  async releaseSeat(sessionId: string, req: { seatId: string; userId: string }): Promise<{ success: boolean; seatId: string }> {
    return apiClient<{ success: boolean; seatId: string }>(
      `/api/group-sessions/${sessionId}/seats/release`,
      {
        method: 'POST',
        body: JSON.stringify(req),
      }
    );
  },

  /**
   * Get Group F&B Summary (Anti-duplication)
   */
  async getSessionFnB(sessionId: string) {
    return apiClient<any>(`/api/group-sessions/${sessionId}/fnb`, {
      method: 'GET',
    });
  },

  /**
   * Update individual member F&B
   */
  async updateMemberFnB(
    sessionId: string,
    req: { userId: string; items: Array<{ comboId: string; comboName?: string; quantity: number; unitPrice?: number }> }
  ) {
    return apiClient<any>(`/api/group-sessions/${sessionId}/fnb`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /**
   * Get full session payment summary (Server-authoritative)
   */
  async getPaymentSummary(sessionId: string) {
    return apiClient<any>(`/api/group-sessions/${sessionId}/payments`, {
      method: 'GET',
    });
  },

  /**
   * Pay for individual member (Split-Pay)
   */
  async payMember(
    sessionId: string,
    req: { userId: string; paymentMethod?: string; payerUserId?: string }
  ) {
    return apiClient<any>(`/api/group-sessions/${sessionId}/payments/member`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /**
   * Host pays for entire group (Host-Pays)
   */
  async payHostAll(
    sessionId: string,
    req: { hostUserId: string; paymentMethod?: string }
  ) {
    return apiClient<any>(`/api/group-sessions/${sessionId}/payments/host-all`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /**
   * Start seat hold countdown timer when user clicks 'Tiếp tục' in SeatSelectionScreen
   */
  async startHoldTimer(sessionId: string, durationMinutes = 10) {
    return apiClient<{
      sessionId: string;
      seatHoldStartedAt: string;
      seatHoldExpiresAt: string;
      durationMinutes: number;
      remainingSeconds: number;
      status: string;
    }>(`/api/group-sessions/${sessionId}/checkout`, {
      method: 'POST',
      body: JSON.stringify({ durationMinutes }),
    });
  },
};


