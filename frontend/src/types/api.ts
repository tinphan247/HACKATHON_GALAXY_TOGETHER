/**
 * Backend REST API Types matching Phase 2 Express implementation
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateSessionRequest {
  showtimeId: string;
  cinemaId: string;
  cinemaName: string;
  movieId: string;
  movieTitle: string;
  showDate: string;
  showTime: string;
  screenName: string;
  hostUserId: string;
  hostName: string;
  name: string;
  paymentMode: 'split' | 'host_pays';
  maxMembers: number;
}

export interface CreateSessionResponseData {
  session: {
    id: string;
    showtime_id: string;
    cinema_id: string;
    cinema_name: string;
    movie_id: string;
    movie_title: string;
    show_date: string;
    show_time: string;
    screen_name: string;
    host_user_id: string;
    name: string;
    status: 'LOBBY' | 'SEAT_SELECTION' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
    payment_mode: 'SPLIT_EQUAL' | 'HOST_PAYS_ALL';
    max_members: number;
    created_at: string;
    expires_at: string;
  };
  host: {
    id: string;
    group_session_id: string;
    user_id: string;
    name: string;
    is_host: boolean;
    status: 'JOINED' | 'SELECTING' | 'READY' | 'PAID' | 'LEFT';
    joined_at: string;
  };
  invite: {
    code: string;
    expiresAt: string;
  };
}

export interface GroupMemberResponse {
  id: string;
  group_session_id: string;
  user_id: string;
  name: string;
  role?: 'host' | 'member';
  color_slot?: string;
  is_host: boolean;
  status: 'JOINED' | 'SELECTING' | 'READY' | 'PAID' | 'LEFT';
  joined_at: string;
  avatar_url?: string;
}

export interface GroupSessionDetailResponseData {
  id: string;
  showtime_id: string;
  cinema_id: string;
  cinema_name: string;
  movie_id: string;
  movie_title: string;
  show_date: string;
  show_time: string;
  screen_name: string;
  host_user_id: string;
  name: string;
  status: 'LOBBY' | 'SEAT_SELECTION' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
  payment_mode: 'SPLIT_EQUAL' | 'HOST_PAYS_ALL';
  max_members: number;
  created_at: string;
  expires_at: string;
  members: GroupMemberResponse[];
  invite?: {
    code: string;
    qr_payload: string;
    expires_at: string;
  };
}

export interface InvitePreviewResponseData {
  code: string;
  qr_payload: string;
  expires_at: string;
  session_id: string;
  session_name: string;
  movie_title: string;
  cinema_name: string;
  show_date: string;
  show_time: string;
  screen_name: string;
  host_name: string;
  max_members: number;
  status: string;
  current_members: string | number;
}

export interface JoinInviteRequest {
  userId?: string;
  name: string;
}

export interface JoinInviteResponseData {
  session: {
    id: string;
    name: string;
    status: string;
    payment_mode: string;
    max_members: number;
    show_time?: string;
    show_date?: string;
    movie_title?: string;
    cinema_name?: string;
  };
  member: GroupMemberResponse;
  isNew: boolean;
}
