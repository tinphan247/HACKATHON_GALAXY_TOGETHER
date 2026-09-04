import type { GroupMemberResponse, GroupSessionDetailResponseData } from './api';

export type ScreenId =
  | 'screen-home'
  | 'screen-showtimes'
  | 'screen-create-group'
  | 'screen-invite'
  | 'screen-lobby'
  | 'screen-seats'
  | 'screen-fnb'
  | 'screen-payment'
  | 'screen-confirmed'
  | 'screen-ticket'
  | 'screen-seats-solo';

export interface CurrentUser {
  userId: string;
  name: string;
  isHost: boolean;
}

export type MemberColorKey = 'm1' | 'm2' | 'm3' | 'm4';

export interface DisplayMember {
  slot: number; // 0 (host) to max_members - 1
  colorKey: MemberColorKey;
  colorHex: string;
  userId?: string;
  name?: string;
  isHost: boolean;
  status: 'JOINED' | 'SELECTING' | 'READY' | 'PAID' | 'LEFT' | 'EMPTY';
}

export interface ShowtimeSelection {
  movieId: string;
  movieTitle: string;
  cinemaId: string;
  cinemaName: string;
  showDate: string;
  showTime: string;
  screenName: string;
}

export type PaymentMode = 'split' | 'host_pays';

export interface HeldSeatInfo {
  seatId: string;
  seatCode: string;
  userId: string;
  memberName: string;
  colorKey?: MemberColorKey | string;
  colorHex?: string;
  isMine?: boolean;
  heldAt?: string;
}

export type { GroupSessionDetailResponseData, GroupMemberResponse };
