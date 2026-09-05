import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  ScreenId,
  BookingMode,
  CurrentUser,
  ShowtimeSelection,
  PaymentMode,
  DisplayMember,
  GroupSessionDetailResponseData,
  HeldSeatInfo,
  GroupFnBSummary,
  PaymentSummaryResponse,
  PaymentMethod,
  MemberPaymentInfo,
} from '../types/session';
import { groupSessionService } from '../services/groupSessionService';
import { storageService } from '../services/storageService';
import { getMemberColor, getMemberColorByKey } from '../constants/theme';
import { POLLING_INTERVAL_MS } from '../constants/config';
import { useToast } from './ToastContext';
import { useSessionRealtime } from '../hooks/useSessionRealtime';
import { realtimeService, type RealtimeStatus } from '../services/realtimeService';
import { movieRepository } from '../services/data/movieRepository';
import { theaterRepository } from '../services/data/theaterRepository';
import { showtimeRepository } from '../services/data/showtimeRepository';

interface GroupSessionContextType {
  currentScreen: ScreenId;
  goTo: (screen: ScreenId) => void;
  goBack: () => void;
  screenHistory: ScreenId[];

  // Booking Mode & Identity
  bookingMode: BookingMode;
  setBookingMode: (mode: BookingMode) => void;
  isGroupMode: boolean;
  startSoloBooking: (showtimeUpdate?: Partial<ShowtimeSelection>) => void;
  clearGroupSession: () => void;

  currentUser: CurrentUser | null;
  setCurrentUser: (u: CurrentUser) => void;
  sessionId: string | null;
  inviteCode: string | null;
  sessionData: GroupSessionDetailResponseData | null;
  displayMembers: DisplayMember[];
  isHost: boolean;

  // Selected Showtime & Data-Driven Selection State
  selectedShowtime: ShowtimeSelection;
  setSelectedShowtime: (s: ShowtimeSelection) => void;
  selectedMovieId: string;
  selectedDate: string;
  selectedTheaterId: string;
  selectMovie: (movieId: string) => Promise<void>;
  selectDate: (date: string) => Promise<void>;
  selectTheater: (theaterId: string) => Promise<void>;
  selectShowtimeById: (showtimeId: string) => Promise<void>;

  // Connection & Modes
  isLiveApi: boolean;
  isBackendHealthy: boolean;
  isPollingActive: boolean;
  realtimeStatus: RealtimeStatus;

  // Modal & Timer State
  showShareModal: boolean;
  setShowShareModal: (open: boolean) => void;
  isHoldTimerStarted: boolean;
  holdExpiresAt: Date | null;
  startHoldTimerAction: () => Promise<boolean>;

  // Actions
  createGroup: (name: string, memberCount: number, payMode: PaymentMode, hostName?: string) => Promise<boolean>;
  joinGroup: (code: string, memberName: string) => Promise<boolean>;
  leaveGroup: () => Promise<void>;
  simulateMemberJoin: (name: string) => Promise<void>;
  refreshSessionData: () => Promise<void>;
  resetToHome: () => void;

  // Realtime Seat State (Phase 5)
  heldSeats: Record<string, HeldSeatInfo>;
  loadSessionSeats: () => Promise<void>;
  mySeats: string[];
  toggleSeat: (seatId: string) => void;
  memberSeats: { tin: string[]; minh: string[]; an: string[]; huy: string[] };
  simulateSeatSelection: (memberKey: 'minh' | 'an' | 'huy', seats: string[]) => void;

  // Realtime F&B State (Phase 6)
  comboQty: Record<string, number>;
  updateComboQty: (key: string, delta: number) => void;
  comboPrices: Record<string, number>;
  groupFnBSummary: GroupFnBSummary | null;
  loadSessionFnB: () => Promise<void>;
  simulateMemberFnB: (memberName: string, comboId: string, qty: number) => Promise<void>;

  // Realtime Payment State (Phase 7)
  payStatus: Record<string, boolean>;
  paidCount: number;
  payForUser: (userKey: string) => void;
  paymentSummary: PaymentSummaryResponse | null;
  loadPaymentSummary: () => Promise<void>;
  payMyShare: (method?: PaymentMethod) => Promise<boolean>;
  payForMember: (userId: string, method?: PaymentMethod) => Promise<boolean>;
  payHostAllGroup: (method?: PaymentMethod) => Promise<boolean>;
  simulatePayment: (memberName: string, method?: PaymentMethod) => Promise<void>;
}

const DEFAULT_SHOWTIME: ShowtimeSelection = {
  movieId: 'mv-01',
  movieTitle: 'Quý Tử Vượt Giàu',
  cinemaId: 'cin-nvq',
  cinemaName: 'Galaxy Cinema Nguyễn Văn Quá',
  showDate: '07/09/2026',
  showTime: '21:00',
  screenName: 'Phòng 3',
};

const GroupSessionContext = createContext<GroupSessionContextType | undefined>(undefined);

export const GroupSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  const [screenHistory, setScreenHistory] = useState<ScreenId[]>(['screen-home']);
  const currentScreen = screenHistory[screenHistory.length - 1];

  const goTo = useCallback((screen: ScreenId) => {
    setScreenHistory((prev) => [...prev, screen]);
  }, []);

  const goBack = useCallback(() => {
    setScreenHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  // Identity & Session State
  const [currentUser, setCurrentUserState] = useState<CurrentUser | null>(() => {
    return storageService.getCurrentUser() || {
      userId: `usr_host_${Date.now()}`,
      name: 'Tín',
      isHost: true,
    };
  });

  const setCurrentUser = useCallback((u: CurrentUser) => {
    setCurrentUserState(u);
    storageService.setCurrentUser(u);
  }, []);

  // Booking Mode & Session State
  const [bookingMode, setBookingMode] = useState<BookingMode>('SOLO');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<GroupSessionDetailResponseData | null>(null);

  // Active Group Mode: strictly true only when explicitly in GROUP mode AND sessionId is present
  const isGroupMode = bookingMode === 'GROUP' && !!sessionId;

  const [selectedMovieId, setSelectedMovieId] = useState<string>('mv-01');
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-07');
  const [selectedTheaterId, setSelectedTheaterId] = useState<string>('cin-nvq');
  const [selectedShowtime, setSelectedShowtime] = useState<ShowtimeSelection>(DEFAULT_SHOWTIME);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);
  const [isLiveApi, setIsLiveApi] = useState<boolean>(true);
  const [isPollingActive, setIsPollingActive] = useState<boolean>(false);

  // Group Share Modal & Hold Timer State
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [isHoldTimerStarted, setIsHoldTimerStarted] = useState<boolean>(false);
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [soloSeats, setSoloSeats] = useState<string[]>([]);

  // Cascading Selection: Select Movie
  const selectMovie = useCallback(async (movieId: string) => {
    console.log('[DataFlow] Selecting movie:', movieId);
    setSelectedMovieId(movieId);

    // Reset downstream selections: seats, solo holds, group state
    setSoloSeats([]);
    setHeldSeats({});
    setComboQty({ c1: 0, c2: 0, c3: 0, c4: 0 });

    const movie = await movieRepository.getMovieById(movieId);
    const availableDates = await showtimeRepository.getAvailableDatesForMovie(movieId);
    const nextDate = availableDates.length > 0 ? availableDates[0].date : '2026-09-07';
    setSelectedDate(nextDate);

    const availableTheaters = await showtimeRepository.getTheatersForMovieAndDate(movieId, nextDate);
    const nextTheater = availableTheaters.length > 0 ? availableTheaters[0] : null;
    const nextTheaterId = nextTheater ? nextTheater.id : 'cin-nvq';
    setSelectedTheaterId(nextTheaterId);

    let nextShowtime = null;
    if (nextTheater) {
      const showtimes = await showtimeRepository.getShowtimes({
        movieId,
        date: nextDate,
        theaterId: nextTheaterId,
      });
      nextShowtime = showtimes.length > 0 ? showtimes[0] : null;
    }

    setSelectedShowtime({
      movieId,
      movieTitle: movie?.title || 'Phim Galaxy',
      moviePoster: movie?.poster || '/posters/poster_quytuvuotgiau.jpg',
      movieAgeRating: movie?.ageRating || 'K',
      cinemaId: nextTheaterId,
      cinemaName: nextTheater?.name || 'Galaxy Cinema',
      showDate: nextDate,
      showTime: nextShowtime?.startTime || '21:00',
      showtimeId: nextShowtime?.id || '',
      screenName: nextShowtime?.screenName || 'Phòng 3',
      screenId: nextShowtime?.screenId || '',
      format: nextShowtime?.format || '2D PHỤ ĐỀ',
      ticketPriceStandard: nextShowtime?.ticketPriceStandard || 55000,
      ticketPriceVip: nextShowtime?.ticketPriceVip || 65000,
    });
  }, []);

  // Cascading Selection: Select Date
  const selectDate = useCallback(async (date: string) => {
    console.log('[DataFlow] Selecting date:', date);
    setSelectedDate(date);

    // Reset downstream: seats
    setSoloSeats([]);
    setHeldSeats({});

    const availableTheaters = await showtimeRepository.getTheatersForMovieAndDate(selectedMovieId, date);
    let targetTheaterId = selectedTheaterId;
    let targetTheater = availableTheaters.find((t) => t.id === targetTheaterId);

    if (!targetTheater && availableTheaters.length > 0) {
      targetTheater = availableTheaters[0];
      targetTheaterId = targetTheater.id;
      setSelectedTheaterId(targetTheaterId);
    }

    if (targetTheater) {
      const showtimes = await showtimeRepository.getShowtimes({
        movieId: selectedMovieId,
        date,
        theaterId: targetTheaterId,
      });
      const nextShowtime = showtimes.length > 0 ? showtimes[0] : null;

      setSelectedShowtime((prev) => ({
        ...prev,
        showDate: date,
        cinemaId: targetTheaterId,
        cinemaName: targetTheater?.name || prev.cinemaName,
        showTime: nextShowtime?.startTime || '21:00',
        showtimeId: nextShowtime?.id || '',
        screenName: nextShowtime?.screenName || prev.screenName,
        screenId: nextShowtime?.screenId || prev.screenId,
        format: nextShowtime?.format || prev.format,
        ticketPriceStandard: nextShowtime?.ticketPriceStandard || prev.ticketPriceStandard,
        ticketPriceVip: nextShowtime?.ticketPriceVip || prev.ticketPriceVip,
      }));
    } else {
      setSelectedShowtime((prev) => ({
        ...prev,
        showDate: date,
        showtimeId: '',
      }));
    }
  }, [selectedMovieId, selectedTheaterId]);

  // Cascading Selection: Select Theater
  const selectTheater = useCallback(async (theaterId: string) => {
    console.log('[DataFlow] Selecting theater:', theaterId);
    setSelectedTheaterId(theaterId);

    // Reset downstream: seats
    setSoloSeats([]);
    setHeldSeats({});

    const theater = await theaterRepository.getTheaterById(theaterId);
    const showtimes = await showtimeRepository.getShowtimes({
      movieId: selectedMovieId,
      date: selectedDate,
      theaterId,
    });
    const nextShowtime = showtimes.length > 0 ? showtimes[0] : null;

    setSelectedShowtime((prev) => ({
      ...prev,
      cinemaId: theaterId,
      cinemaName: theater?.name || prev.cinemaName,
      showTime: nextShowtime?.startTime || '21:00',
      showtimeId: nextShowtime?.id || '',
      screenName: nextShowtime?.screenName || prev.screenName,
      screenId: nextShowtime?.screenId || prev.screenId,
      format: nextShowtime?.format || prev.format,
      ticketPriceStandard: nextShowtime?.ticketPriceStandard || prev.ticketPriceStandard,
      ticketPriceVip: nextShowtime?.ticketPriceVip || prev.ticketPriceVip,
    }));
  }, [selectedMovieId, selectedDate]);

  // Cascading Selection: Select Showtime By ID
  const selectShowtimeById = useCallback(async (showtimeId: string) => {
    console.log('[DataFlow] Selecting showtime by ID:', showtimeId);
    const st = await showtimeRepository.getShowtimeById(showtimeId);
    if (!st) return;

    // Reset downstream: seats
    setSoloSeats([]);
    setHeldSeats({});

    const movie = await movieRepository.getMovieById(st.movieId);
    const theater = await theaterRepository.getTheaterById(st.theaterId);

    setSelectedMovieId(st.movieId);
    setSelectedDate(st.date);
    setSelectedTheaterId(st.theaterId);

    setSelectedShowtime({
      movieId: st.movieId,
      movieTitle: movie?.title || 'Phim Galaxy',
      moviePoster: movie?.poster || '/posters/poster_quytuvuotgiau.jpg',
      movieAgeRating: movie?.ageRating || 'K',
      cinemaId: st.theaterId,
      cinemaName: theater?.name || 'Galaxy Cinema',
      showDate: st.date,
      showTime: st.startTime,
      showtimeId: st.id,
      screenName: st.screenName,
      screenId: st.screenId,
      format: st.format,
      ticketPriceStandard: st.ticketPriceStandard,
      ticketPriceVip: st.ticketPriceVip,
    });
  }, []);

  // Start Solo Booking: explicitly clears any group state and switches to SOLO mode
  const startSoloBooking = useCallback((showtimeUpdate?: Partial<ShowtimeSelection>) => {
    console.log('[BookingMode] Initialized SOLO booking mode');
    setBookingMode('SOLO');
    setSessionId(null);
    setInviteCode(null);
    setSessionData(null);
    setHeldSeats({});
    setShowShareModal(false);
    setIsHoldTimerStarted(false);
    setHoldExpiresAt(null);
    setSoloSeats([]);
    storageService.removeSessionId();
    storageService.removeInviteCode();
    if (showtimeUpdate) {
      setSelectedShowtime((prev) => ({
        ...prev,
        ...showtimeUpdate,
      }));
    }
  }, []);

  // Clear Group Session: reset back to clean SOLO mode
  const clearGroupSession = useCallback(() => {
    console.log('[BookingMode] Cleared group session to SOLO mode');
    setBookingMode('SOLO');
    setSessionId(null);
    setInviteCode(null);
    setSessionData(null);
    setHeldSeats({});
    setShowShareModal(false);
    setSoloSeats([]);
    storageService.removeSessionId();
    storageService.removeInviteCode();
  }, []);

  // Realtime Seat & F&B State (Phase 5 & 6)
  const [heldSeats, setHeldSeats] = useState<Record<string, HeldSeatInfo>>({});
  const [comboQty, setComboQty] = useState<Record<string, number>>({ c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 });
  const comboPrices: Record<string, number> = { c1: 115000, c2: 134000, c3: 149000, c4: 229000, c5: 109000 };
  const [groupFnBSummary, setGroupFnBSummary] = useState<GroupFnBSummary | null>(null);

  // Realtime Payment State (Phase 7)
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummaryResponse | null>(null);

  const [payStatus, setPayStatus] = useState<Record<string, boolean>>({
    tin: false,
    minh: true,
    an: false,
    huy: false,
  });
  const [paidCount, setPaidCount] = useState<number>(1);

  // Check health on mount
  useEffect(() => {
    groupSessionService
      .checkHealth()
      .then(() => {
        setIsBackendHealthy(true);
        setIsLiveApi(true);
      })
      .catch(() => {
        setIsBackendHealthy(false);
        setIsLiveApi(false);
      });
  }, []);

  // Fetch session data if sessionId exists
  const refreshSessionData = useCallback(async (targetId?: string) => {
    const id = targetId || sessionId;
    if (!id) return;
    try {
      const data = await groupSessionService.getSession(id);
      setSessionData(data);
      if (data.invite?.code) {
        setInviteCode(data.invite.code);
        storageService.setInviteCode(data.invite.code);
      }
      if ((data as unknown as { seat_hold_expires_at?: string }).seat_hold_expires_at) {
        setIsHoldTimerStarted(true);
        setHoldExpiresAt(new Date((data as unknown as { seat_hold_expires_at: string }).seat_hold_expires_at));
      }
      setIsBackendHealthy(true);
    } catch {
      setIsBackendHealthy(false);
    }
  }, [sessionId]);

  // Load session seats from REST API
  const loadSessionSeats = useCallback(async (targetId?: string) => {
    const id = targetId || sessionId;
    if (!id) return;
    try {
      const seats = await groupSessionService.getSessionSeats(id);
      const seatMap: Record<string, HeldSeatInfo> = {};
      seats.forEach((s: { seat_id: string; seat_code: string; user_id: string; member_name: string; color_slot?: string }) => {
        const color = s.color_slot ? getMemberColorByKey(s.color_slot) : undefined;
        seatMap[s.seat_id] = {
          seatId: s.seat_id,
          seatCode: s.seat_code,
          userId: s.user_id,
          memberName: s.member_name,
          colorKey: color?.key,
          colorHex: color?.hex,
        };
      });
      setHeldSeats(seatMap);
    } catch (e) {
      console.warn('Failed to load session seats:', e);
    }
  }, [sessionId]);

  // Load session F&B summary from REST API (Phase 6)
  const loadSessionFnB = useCallback(async (targetId?: string) => {
    const id = targetId || sessionId;
    if (!id) return;
    try {
      const summary = await groupSessionService.getSessionFnB(id);
      setGroupFnBSummary(summary);
    } catch (e) {
      console.warn('Failed to load session F&B summary:', e);
    }
  }, [sessionId]);

  // Load session Payment summary from REST API (Phase 7)
  const loadPaymentSummary = useCallback(async (targetId?: string) => {
    const id = targetId || sessionId;
    if (!id) return;
    try {
      const summary = await groupSessionService.getPaymentSummary(id);
      setPaymentSummary(summary);
      if (summary.members) {
        const nextStatus: Record<string, boolean> = {};
        summary.members.forEach((m: MemberPaymentInfo) => {
          const key = m.userId === currentUser?.userId
            ? 'tin'
            : m.memberName.toLowerCase().includes('minh')
            ? 'minh'
            : m.memberName.toLowerCase().includes('an')
            ? 'an'
            : m.memberName.toLowerCase().includes('huy')
            ? 'huy'
            : m.userId;
          nextStatus[key] = m.isPaid;
        });
        setPayStatus(nextStatus);
        setPaidCount(summary.paidMembersCount);
      }
    } catch (e) {
      console.warn('Failed to load session payment summary:', e);
    }
  }, [sessionId, currentUser]);

  const loadSessionSeatsRef = useRef(loadSessionSeats);
  const loadSessionFnBRef = useRef(loadSessionFnB);
  const loadPaymentSummaryRef = useRef(loadPaymentSummary);
  const refreshSessionDataRef = useRef(refreshSessionData);
  useEffect(() => {
    loadSessionSeatsRef.current = loadSessionSeats;
    loadSessionFnBRef.current = loadSessionFnB;
    loadPaymentSummaryRef.current = loadPaymentSummary;
    refreshSessionDataRef.current = refreshSessionData;
  });

  // Initial load of session, seats, F&B and payments (Only in active GROUP mode)
  useEffect(() => {
    if (isGroupMode && sessionId) {
      refreshSessionDataRef.current();
      loadSessionSeatsRef.current();
      loadSessionFnBRef.current();
      loadPaymentSummaryRef.current();
    }
  }, [isGroupMode, sessionId]);

  // Reload seats, F&B or Payment when entering respective screens (Only in active GROUP mode)
  useEffect(() => {
    if (isGroupMode && sessionId) {
      if (currentScreen === 'screen-seats') {
        loadSessionSeatsRef.current();
      } else if (currentScreen === 'screen-fnb') {
        loadSessionFnBRef.current();
      } else if (currentScreen === 'screen-payment') {
        loadPaymentSummaryRef.current();
      }
    }
  }, [isGroupMode, sessionId, currentScreen]);

  // Phase 4 & 6: Realtime WebSocket Collaboration (Connected ONLY when in active GROUP mode)
  const { realtimeStatus } = useSessionRealtime({
    sessionId: isGroupMode ? sessionId : null,
    userId: currentUser?.userId,
    onMemberJoined: (payload) => {
      if (!payload?.member) return;
      const newMember = payload.member;
      setSessionData((prev) => {
        if (!prev) return prev;
        const exists = prev.members.some((m) => m.user_id === newMember.user_id || m.id === newMember.id);
        if (exists) {
          return {
            ...prev,
            members: prev.members.map((m) => (m.user_id === newMember.user_id ? newMember : m)),
          };
        }
        return {
          ...prev,
          members: [...prev.members, newMember],
        };
      });
      refreshSessionDataRef.current();
      showToast(`⚡ ${newMember.name} vừa tham gia nhóm! (Realtime WS)`);
    },
    onMemberLeft: (payload) => {
      const leftUserId = payload?.userId || payload?.member?.user_id;
      if (!leftUserId) return;
      setSessionData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.filter((m) => m.user_id !== leftUserId),
        };
      });
      refreshSessionDataRef.current();
      showToast('ℹ️ Một thành viên đã rời nhóm.');
    },
    onSeatHeld: (payload) => {
      if (!payload?.seatId) return;
      const seatId = payload.seatId;
      const color = payload.colorSlot ? getMemberColorByKey(payload.colorSlot) : undefined;
      setHeldSeats((prev) => ({
        ...prev,
        [seatId]: {
          seatId,
          seatCode: payload.seatCode || seatId,
          userId: payload.userId || '',
          memberName: payload.memberName || '',
          colorKey: color?.key || payload.colorKey,
          colorHex: color?.hex || payload.colorHex,
          heldAt: new Date().toISOString(),
        },
      }));
      if (payload.userId !== currentUser?.userId) {
        showToast(`💺 ${payload.memberName || 'Một bạn'} vừa chọn ghế ${payload.seatCode || seatId}`);
      }
    },
    onSeatReleased: (payload) => {
      if (!payload?.seatId) return;
      const seatId = payload.seatId;
      setHeldSeats((prev) => {
        const next = { ...prev };
        delete next[seatId];
        return next;
      });
      if (payload.userId !== currentUser?.userId) {
        showToast(`💺 ${payload.memberName || 'Một bạn'} đã bỏ chọn ghế ${seatId}`);
      }
    },
    onFnBUpdated: (payload) => {
      if (!payload) return;
      setGroupFnBSummary(payload as unknown as GroupFnBSummary);
      showToast('🍿 Bắp nước nhóm vừa được cập nhật!');
    },
    onPaymentUpdated: (payload) => {
      if (!payload) return;
      loadPaymentSummaryRef.current();
      refreshSessionDataRef.current();
      const methodStr = payload.paymentMethod ? ` qua ví ${payload.paymentMethod.toUpperCase()}` : '';
      showToast(`💳 ${payload.memberName || 'Một bạn'} đã thanh toán thành công${methodStr}!`);
    },
    onHoldTimerStarted: (payload) => {
      setIsHoldTimerStarted(true);
      if (payload?.expiresAt) {
        setHoldExpiresAt(new Date(payload.expiresAt as string));
      } else {
        setHoldExpiresAt(new Date(Date.now() + 10 * 60 * 1000));
      }
      showToast('⏱️ Đếm ngược giữ ghế 10 phút đã bắt đầu!');
    },
    onSessionConfirmed: () => {
      refreshSessionDataRef.current();
      loadPaymentSummaryRef.current();
      showToast('🎉 Toàn bộ nhóm đã thanh toán thành công! Đang chuyển sang vé...');
      setSessionData((prev) => (prev ? { ...prev, status: 'CONFIRMED' } : prev));
      goTo('screen-confirmed');
    },
    onReconnected: () => {
      refreshSessionDataRef.current();
      loadSessionSeatsRef.current();
      loadSessionFnBRef.current();
      loadPaymentSummaryRef.current();
    },
  });

  // Cross-screen Session Polling: Runs ONLY when in active GROUP mode
  const isFetchingRef = useRef(false);
  useEffect(() => {
    if (!isGroupMode || !sessionId) {
      setIsPollingActive(false);
      return;
    }

    setIsPollingActive(true);
    const pollInterval = realtimeStatus === 'CONNECTED' ? 5000 : POLLING_INTERVAL_MS;

    const intervalId = setInterval(async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const freshData = await groupSessionService.getSession(sessionId);
        setSessionData((prev) => {
          if (
            !prev ||
            prev.members.length !== freshData.members.length ||
            prev.status !== freshData.status
          ) {
            if (prev && freshData.members.length > prev.members.length && realtimeStatus !== 'CONNECTED') {
              const newestMember = freshData.members[freshData.members.length - 1];
              showToast(`🎉 ${newestMember.name} vừa tham gia nhóm!`);
            }
            return freshData;
          }
          return prev;
        });

        if (currentScreen === 'screen-seats') {
          loadSessionSeatsRef.current();
        }
        setIsBackendHealthy(true);
      } catch {
        setIsBackendHealthy(false);
      } finally {
        isFetchingRef.current = false;
      }
    }, pollInterval);

    return () => {
      clearInterval(intervalId);
      setIsPollingActive(false);
    };
  }, [sessionId, currentScreen, showToast, realtimeStatus]);

  // Create Group Action
  const createGroup = useCallback(
    async (name: string, memberCount: number, payMode: PaymentMode, hostName?: string): Promise<boolean> => {
      try {
        const finalHostName = hostName?.trim() || currentUser?.name || 'Tín';
        const hostUser = {
          userId: currentUser?.userId || `usr_host_${Date.now()}`,
          name: finalHostName,
          isHost: true,
        };

        const effectiveShowtimeId = selectedShowtime.showtimeId || selectedShowtime.showTime;
        const resp = await groupSessionService.createSession({
          showtimeId: effectiveShowtimeId,
          cinemaId: selectedShowtime.cinemaId,
          cinemaName: selectedShowtime.cinemaName,
          movieId: selectedShowtime.movieId,
          movieTitle: selectedShowtime.movieTitle,
          showDate: selectedShowtime.showDate,
          showTime: selectedShowtime.showTime,
          screenName: selectedShowtime.screenName,
          hostUserId: hostUser.userId,
          hostName: hostUser.name,
          name: name.trim() || 'Galaxy Together Group',
          paymentMode: payMode,
          maxMembers: memberCount,
        });

        const newSessionId = resp.session.id;
        const code = resp.invite.code;

        // ONLY on API Success, switch booking mode to GROUP
        setBookingMode('GROUP');
        setSessionId(newSessionId);
        setInviteCode(code);
        storageService.setSessionId(newSessionId);
        storageService.setInviteCode(code);

        setCurrentUser({
          userId: hostUser.userId,
          name: hostUser.name,
          isHost: true,
        });

        // Immediately fetch full session detail from API
        await refreshSessionData(newSessionId);
        await loadSessionSeats(newSessionId);

        // If host previously selected seats, only carry over the 1st seat for group mode (1 seat per member)
        if (soloSeats.length > 0) {
          const firstSeat = soloSeats[0];
          setSoloSeats([firstSeat]);
          try {
            await groupSessionService.holdSeat(newSessionId, {
              showtimeId: effectiveShowtimeId,
              seatId: firstSeat,
              seatCode: firstSeat,
              userId: hostUser.userId,
            });
            await loadSessionSeats(newSessionId);
          } catch (e) {
            console.warn('Could not auto-hold solo seat in group:', e);
          }
        }

        setShowShareModal(true);
        goTo('screen-seats');
        showToast('✓ Tạo nhóm thành công! Đang ở màn hình chọn ghế');
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể tạo nhóm';
        showToast(`✕ ${msg}`);
        return false;
      }
    },
    [currentUser, selectedShowtime, showToast, refreshSessionData, loadSessionSeats, setCurrentUser, soloSeats, goTo]
  );

  // Join Group Action
  const joinGroup = useCallback(
    async (code: string, memberName: string): Promise<boolean> => {
      try {
        const guestId = `usr_guest_${Date.now()}`;
        const finalName = memberName.trim() || 'Thành viên';
        const resp = await groupSessionService.joinByCode(code, {
          userId: guestId,
          name: finalName,
        });

        // ONLY on API Success, switch booking mode to GROUP
        setBookingMode('GROUP');
        setSessionId(resp.session.id);
        storageService.setSessionId(resp.session.id);
        setInviteCode(code);
        storageService.setInviteCode(code);

        // Sync showtime from joined session if present
        if (resp.session.show_time) {
          const syncShowTime = resp.session.show_time;
          setSelectedShowtime((prev) => ({
            ...prev,
            showtimeId: resp.session.showtime_id || prev.showtimeId,
            showTime: syncShowTime,
            showDate: resp.session.show_date || prev.showDate,
            movieTitle: resp.session.movie_title || prev.movieTitle,
            cinemaName: resp.session.cinema_name || prev.cinemaName,
          }));
        }

        setCurrentUser({
          userId: guestId,
          name: finalName,
          isHost: false,
        });

        showToast(`✓ Bạn đã tham gia nhóm "${resp.session.name}"!`);
        await refreshSessionData(resp.session.id);
        await loadSessionSeats(resp.session.id);
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể tham gia nhóm';
        showToast(`✕ ${msg}`);
        return false;
      }
    },
    [showToast, refreshSessionData, loadSessionSeats, setCurrentUser]
  );

  // Leave Group Action: leaves backend session and resets frontend state to SOLO
  const leaveGroup = useCallback(async () => {
    if (sessionId && currentUser?.userId) {
      try {
        await groupSessionService.leaveSession(sessionId, currentUser.userId);
      } catch (err) {
        console.warn('Failed to call leaveSession backend API:', err);
      }
    }
    clearGroupSession();
    goTo('screen-showtimes');
    showToast('Bạn đã rời khỏi nhóm đặt vé');
  }, [sessionId, currentUser, clearGroupSession, goTo, showToast]);

  // Simulation Member Join (Calls Real API)
  const simulateMemberJoin = useCallback(
    async (name: string) => {
      if (!inviteCode) {
        showToast('Chưa có mã mời nhóm');
        return;
      }

      try {
        const simUserId = `usr_sim_${name.toLowerCase()}_${Date.now()}`;
        await groupSessionService.joinByCode(inviteCode, {
          userId: simUserId,
          name: name,
        });
        showToast(`✓ ${name} đã tham gia thành công (Live API)!`);
        await refreshSessionData();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi mô phỏng tham gia';
        showToast(`✕ ${msg}`);
      }
    },
    [inviteCode, showToast, refreshSessionData]
  );

  // Derive mySeats dynamically from heldSeats (in Group mode) or soloSeats (in Solo mode)
  const mySeats = isGroupMode
    ? Object.values(heldSeats)
        .filter((s) => s.userId === currentUser?.userId)
        .map((s) => s.seatId)
    : soloSeats;

  // Realtime & REST Toggle Seat
  const toggleSeat = useCallback(
    async (seatId: string) => {
      // 1. Solo Mode (isGroupMode is false)
      if (!isGroupMode) {
        setSoloSeats((prev) => {
          if (prev.includes(seatId)) {
            const next = prev.filter((s) => s !== seatId);
            setHeldSeats((hPrev) => {
              const hNext = { ...hPrev };
              delete hNext[seatId];
              return hNext;
            });
            return next;
          } else {
            if (prev.length >= 8) {
              showToast('Tối đa 8 ghế mỗi lần đặt');
              return prev;
            }
            setHeldSeats((hPrev) => ({
              ...hPrev,
              [seatId]: {
                seatId,
                seatCode: seatId,
                userId: currentUser?.userId || 'usr_solo',
                memberName: currentUser?.name || 'Bạn',
                colorKey: 'orange',
                colorHex: '#F97316',
                heldAt: new Date().toISOString(),
              },
            }));
            return [...prev, seatId];
          }
        });
        return;
      }

      // 2. Group Mode (isGroupMode is true)
      if (!currentUser || !sessionId) {
        showToast('Chưa kết nối nhóm');
        return;
      }

      const existingHold = heldSeats[seatId];
      const isMine = existingHold?.userId === currentUser.userId;

      if (isMine) {
        // Optimistic release
        setHeldSeats((prev) => {
          const next = { ...prev };
          delete next[seatId];
          return next;
        });

        realtimeService.releaseSeat(seatId, currentUser.userId, currentUser.name);

        try {
          await groupSessionService.releaseSeat(sessionId, {
            seatId,
            userId: currentUser.userId,
          });
        } catch (err) {
          console.error('Failed to release seat via API:', err);
          await loadSessionSeats();
        }
      } else {
        if (existingHold) {
          showToast(`Ghế ${seatId} đang được ${existingHold.memberName || 'người khác'} giữ!`);
          return;
        }

        // Swapping seat: if user already has a held seat, release old one and hold new one
        const myOldSeat = Object.values(heldSeats).find((s) => s.userId === currentUser.userId);
        if (myOldSeat) {
          realtimeService.releaseSeat(myOldSeat.seatId, currentUser.userId, currentUser.name);
        }

        // Find color slot for current user
        const myIndex = sessionData?.members?.findIndex((m) => m.user_id === currentUser.userId) ?? 0;
        const color = getMemberColor(myIndex >= 0 ? myIndex : 0);

        // Optimistic hold with swap
        setHeldSeats((prev) => {
          const next: Record<string, HeldSeatInfo> = {};
          for (const [k, v] of Object.entries(prev)) {
            if (v.userId !== currentUser.userId) {
              next[k] = v;
            }
          }
          next[seatId] = {
            seatId,
            seatCode: seatId,
            userId: currentUser.userId,
            memberName: currentUser.name,
            colorKey: color.key,
            colorHex: color.hex,
            heldAt: new Date().toISOString(),
          };
          return next;
        });

        realtimeService.holdSeat(seatId, currentUser.userId, currentUser.name, color.key, color.hex);

        const effectiveShowtimeId = sessionData?.showtime_id || selectedShowtime.showtimeId || selectedShowtime.showTime;
        try {
          await groupSessionService.holdSeat(sessionId, {
            showtimeId: effectiveShowtimeId,
            seatId,
            seatCode: seatId,
            userId: currentUser.userId,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Không thể giữ ghế này';
          showToast(`✕ ${msg}`);
          await loadSessionSeats();
        }
      }
    },
    [isGroupMode, sessionId, currentUser, heldSeats, sessionData, selectedShowtime, showToast, loadSessionSeats]
  );

  const startHoldTimerAction = useCallback(async (): Promise<boolean> => {
    setIsHoldTimerStarted(true);
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    setHoldExpiresAt(expires);

    if (isGroupMode && sessionId) {
      try {
        await groupSessionService.startHoldTimer(sessionId, 10);
        return true;
      } catch (e) {
        console.warn('Failed to start hold timer on backend:', e);
        return false;
      }
    }
    return true;
  }, [isGroupMode, sessionId]);

  const simulateSeatSelection = useCallback(
    async (memberKey: 'minh' | 'an' | 'huy', seats: string[]) => {
      const targetName = memberKey.charAt(0).toUpperCase() + memberKey.slice(1);
      const member = sessionData?.members?.find((m) => m.name.toLowerCase().includes(memberKey));
      const simUserId = member?.user_id || `usr_sim_${memberKey}`;
      const simIndex = memberKey === 'minh' ? 1 : memberKey === 'an' ? 2 : 3;
      const color = getMemberColor(simIndex);

      const effectiveShowtimeId = sessionData?.showtime_id || selectedShowtime.showtimeId || selectedShowtime.showTime;

      for (const seatId of seats) {
        realtimeService.holdSeat(seatId, simUserId, targetName, color.key, color.hex);
        setHeldSeats((prev) => ({
          ...prev,
          [seatId]: {
            seatId,
            seatCode: seatId,
            userId: simUserId,
            memberName: targetName,
            colorKey: color.key,
            colorHex: color.hex,
            heldAt: new Date().toISOString(),
          },
        }));

        if (sessionId && member) {
          try {
            await groupSessionService.holdSeat(sessionId, {
              showtimeId: effectiveShowtimeId,
              seatId,
              seatCode: seatId,
              userId: member.user_id,
            });
          } catch (e) {
            console.warn('Simulation hold seat error:', e);
          }
        }
      }
      showToast(`🎮 ${targetName} đã chọn ghế: ${seats.join(', ')}`);
    },
    [sessionId, sessionData, selectedShowtime, showToast]
  );

  const memberSeats = {
    tin: Object.values(heldSeats).filter((s) => s.userId === currentUser?.userId || s.memberName?.toLowerCase().includes('tín')).map((s) => s.seatId),
    minh: Object.values(heldSeats).filter((s) => s.memberName?.toLowerCase().includes('minh')).map((s) => s.seatId),
    an: Object.values(heldSeats).filter((s) => s.memberName?.toLowerCase().includes('an')).map((s) => s.seatId),
    huy: Object.values(heldSeats).filter((s) => s.memberName?.toLowerCase().includes('huy')).map((s) => s.seatId),
  };

  const updateComboQty = useCallback(
    (key: string, delta: number) => {
      setComboQty((prev) => {
        const nextQty = Math.max(0, (prev[key] || 0) + delta);
        const updated = { ...prev, [key]: nextQty };

        // Realtime REST update to backend
        if (sessionId && currentUser) {
          const items = Object.entries(updated)
            .filter(([_, q]) => q > 0)
            .map(([comboId, quantity]) => ({
              comboId,
              quantity,
              unitPrice: comboPrices[comboId] || 0,
            }));

          groupSessionService
            .updateMemberFnB(sessionId, {
              userId: currentUser.userId,
              items,
            })
            .then((summary) => {
              setGroupFnBSummary(summary);
            })
            .catch((e) => console.warn('Failed to sync F&B update:', e));
        }

        return updated;
      });
    },
    [sessionId, currentUser, comboPrices]
  );

  const simulateMemberFnB = useCallback(
    async (memberName: string, comboId: string, qty: number) => {
      if (!sessionId || !sessionData) return;
      const target = sessionData.members.find((m) =>
        m.name.toLowerCase().includes(memberName.toLowerCase())
      );
      if (!target) {
        showToast(`⚠️ ${memberName} chưa tham gia phòng`);
        return;
      }

      try {
        const items = qty > 0 ? [{ comboId, quantity: qty, unitPrice: comboPrices[comboId] || 0 }] : [];
        const summary = await groupSessionService.updateMemberFnB(sessionId, {
          userId: target.user_id,
          items,
        });
        setGroupFnBSummary(summary);
        showToast(`🥤 ${target.name} đã cập nhật bắp nước!`);
      } catch (e) {
        console.warn('Simulation F&B error:', e);
      }
    },
    [sessionId, sessionData, comboPrices, showToast]
  );

  const payForUser = useCallback((userKey: string) => {
    setPayStatus((prev) => {
      if (prev[userKey]) return prev;
      setPaidCount((c) => c + 1);
      return { ...prev, [userKey]: true };
    });
  }, []);

  const payMyShare = useCallback(
    async (method: PaymentMethod = 'momo'): Promise<boolean> => {
      if (!sessionId || !currentUser) return false;
      try {
        const resp = await groupSessionService.payMember(sessionId, {
          userId: currentUser.userId,
          paymentMethod: method,
        });
        showToast(`✓ Bạn đã thanh toán thành công qua ${method.toUpperCase()}!`);
        await loadPaymentSummaryRef.current();
        if (resp.data?.isConfirmed) {
          goTo('screen-confirmed');
        }
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi thanh toán';
        showToast(`✕ ${msg}`);
        return false;
      }
    },
    [sessionId, currentUser, goTo, showToast]
  );

  const payForMember = useCallback(
    async (targetUserId: string, method: PaymentMethod = 'momo'): Promise<boolean> => {
      if (!sessionId || !currentUser) return false;
      try {
        const resp = await groupSessionService.payMember(sessionId, {
          userId: targetUserId,
          payerUserId: currentUser.userId,
          paymentMethod: method,
        });
        showToast(`✓ Đã thanh toán thành công cho bạn bè qua ${method.toUpperCase()}!`);
        await loadPaymentSummaryRef.current();
        if (resp.data?.isConfirmed) {
          goTo('screen-confirmed');
        }
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi thanh toán';
        showToast(`✕ ${msg}`);
        return false;
      }
    },
    [sessionId, currentUser, goTo, showToast]
  );

  const payHostAllGroup = useCallback(
    async (method: PaymentMethod = 'momo'): Promise<boolean> => {
      if (!sessionId || !currentUser) return false;
      try {
        await groupSessionService.payHostAll(sessionId, {
          hostUserId: currentUser.userId,
          paymentMethod: method,
        });
        showToast(`🎉 Trưởng nhóm đã thanh toán toàn bộ đơn qua ${method.toUpperCase()}!`);
        await loadPaymentSummaryRef.current();
        goTo('screen-confirmed');
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi thanh toán gộp';
        showToast(`✕ ${msg}`);
        return false;
      }
    },
    [sessionId, currentUser, goTo, showToast]
  );

  const simulatePayment = useCallback(
    async (memberName: string, method: PaymentMethod = 'momo') => {
      if (!sessionId || !sessionData) return;
      const target = sessionData.members.find((m) =>
        m.name.toLowerCase().includes(memberName.toLowerCase())
      );
      if (!target) {
        showToast(`⚠️ ${memberName} chưa tham gia phòng`);
        return;
      }
      try {
        const resp = await groupSessionService.payMember(sessionId, {
          userId: target.user_id,
          paymentMethod: method,
        });
        showToast(`💳 ${target.name} đã thanh toán thành công (Live API)!`);
        await loadPaymentSummaryRef.current();
        if (resp.data?.isConfirmed) {
          goTo('screen-confirmed');
        }
      } catch (e) {
        console.warn('Simulation payment error:', e);
      }
    },
    [sessionId, sessionData, goTo, showToast]
  );

  const resetToHome = useCallback(() => {
    storageService.clearAll();
    setBookingMode('SOLO');
    setSessionId(null);
    setInviteCode(null);
    setSessionData(null);
    setHeldSeats({});
    setGroupFnBSummary(null);
    setPaymentSummary(null);
    setShowShareModal(false);
    setIsHoldTimerStarted(false);
    setHoldExpiresAt(null);
    setSoloSeats([]);
    setScreenHistory(['screen-home']);
  }, []);

  // Compute display members with color slot mapping
  const maxMembers = sessionData?.max_members || 4;
  const currentMembers = sessionData?.members || [];

  const displayMembers: DisplayMember[] = Array.from({ length: maxMembers }).map((_, index) => {
    const member = currentMembers[index];
    const color = getMemberColor(index);

    if (member) {
      return {
        slot: index,
        colorKey: color.key,
        colorHex: color.hex,
        userId: member.user_id,
        name: member.name,
        isHost: member.is_host,
        status: member.status,
      };
    }

    return {
      slot: index,
      colorKey: color.key,
      colorHex: color.hex,
      isHost: false,
      status: 'EMPTY',
    };
  });

  const isHost = currentUser?.isHost ?? true;

  return (
    <GroupSessionContext.Provider
      value={{
        currentScreen,
        goTo,
        goBack,
        screenHistory,
        bookingMode,
        setBookingMode,
        isGroupMode,
        startSoloBooking,
        clearGroupSession,
        currentUser,
        setCurrentUser,
        sessionId,
        inviteCode,
        sessionData,
        displayMembers,
        isHost,
        selectedShowtime,
        setSelectedShowtime,
        selectedMovieId,
        selectedDate,
        selectedTheaterId,
        selectMovie,
        selectDate,
        selectTheater,
        selectShowtimeById,
        isLiveApi,
        isBackendHealthy,
        isPollingActive,
        realtimeStatus,
        showShareModal,
        setShowShareModal,
        isHoldTimerStarted,
        holdExpiresAt,
        startHoldTimerAction,
        createGroup,
        joinGroup,
        leaveGroup,
        simulateMemberJoin,
        refreshSessionData,
        resetToHome,
        heldSeats,
        loadSessionSeats,
        mySeats,
        toggleSeat,
        memberSeats,
        simulateSeatSelection,
        comboQty,
        updateComboQty,
        comboPrices,
        groupFnBSummary,
        loadSessionFnB,
        simulateMemberFnB,
        payStatus,
        paidCount,
        payForUser,
        paymentSummary,
        loadPaymentSummary,
        payMyShare,
        payForMember,
        payHostAllGroup,
        simulatePayment,
      }}
    >
      {children}
    </GroupSessionContext.Provider>
  );
};

export const useGroupSession = (): GroupSessionContextType => {
  const context = useContext(GroupSessionContext);
  if (!context) {
    throw new Error('useGroupSession must be used within a GroupSessionProvider');
  }
  return context;
};
