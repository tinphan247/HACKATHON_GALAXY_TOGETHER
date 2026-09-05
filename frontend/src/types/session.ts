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
  | 'screen-seats-solo'
  | 'screen-cinemas'
  | 'screen-cinetag'
  | 'screen-movies'
  | 'screen-account'
  | 'screen-not-found';

export type BookingMode = 'SOLO' | 'GROUP';

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
  moviePoster?: string;
  movieAgeRating?: string;
  cinemaId: string;
  cinemaName: string;
  showDate: string; // YYYY-MM-DD or display format
  showTime: string; // e.g. "17:30"
  showtimeId?: string;
  screenName: string;
  screenId?: string;
  format?: string;
  ticketPriceStandard?: number;
  ticketPriceVip?: number;
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

export interface FnBOrderItem {
  itemId?: string;
  comboId: string;
  comboName: string;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
}

export interface MemberFnBSummary {
  memberId: string;
  userId: string;
  memberName: string;
  role: string;
  colorSlot: string;
  isHost: boolean;
  totalAmount: number;
  items: FnBOrderItem[];
}

export interface AggregatedFnBItem {
  comboId: string;
  comboName: string;
  totalQuantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface GroupFnBSummary {
  sessionId: string;
  totalGroupAmount: number;
  totalGroupItemsCount: number;
  members: MemberFnBSummary[];
  aggregatedItems: AggregatedFnBItem[];
}

export type PaymentMethod = 'momo' | 'zalopay' | 'vnpay' | 'card';

export interface MemberPaymentInfo {
  memberId: string;
  userId: string;
  memberName: string;
  role: string;
  colorSlot: string;
  status: string;
  isHost: boolean;
  seats: Array<{ id: string; seatId: string; seatCode: string; price: number }>;
  seatAmount: number;
  fnbItems: FnBOrderItem[];
  fnbAmount: number;
  totalAmount: number;
  isPaid: boolean;
  payment?: {
    id: string;
    amount: number;
    paymentMethod: PaymentMethod;
    gatewayRef?: string;
    paidAt?: string;
  } | null;
}

export interface PaymentSummaryResponse {
  sessionId: string;
  sessionName: string;
  sessionStatus: string;
  paymentMode: 'split' | 'host_pays';
  hostUserId: string;
  totalSessionAmount: number;
  totalMembers: number;
  paidMembersCount: number;
  isAllPaid: boolean;
  isConfirmed: boolean;
  members: MemberPaymentInfo[];
}

export type { GroupSessionDetailResponseData, GroupMemberResponse };


