import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  ScreenId,
  CurrentUser,
  ShowtimeSelection,
  PaymentMode,
  DisplayMember,
  GroupSessionDetailResponseData,
  HeldSeatInfo,
} from '../types/session';
import { groupSessionService } from '../services/groupSessionService';
import { storageService } from '../services/storageService';
import { getMemberColor } from '../constants/theme';
import { POLLING_INTERVAL_MS } from '../constants/config';
import { useToast } from './ToastContext';
import { useSessionRealtime } from '../hooks/useSessionRealtime';
import { realtimeService, type RealtimeStatus } from '../services/realtimeService';

interface GroupSessionContextType {
  currentScreen: ScreenId;
  goTo: (screen: ScreenId) => void;
  goBack: () => void;
  screenHistory: ScreenId[];

  // Session & User Identity
  currentUser: CurrentUser | null;
  setCurrentUser: (u: CurrentUser) => void;
  sessionId: string | null;
  inviteCode: string | null;
  sessionData: GroupSessionDetailResponseData | null;
  displayMembers: DisplayMember[];
  isHost: boolean;

  // Selected Showtime
  selectedShowtime: ShowtimeSelection;
  setSelectedShowtime: (s: ShowtimeSelection) => void;

  // Connection & Modes
  isLiveApi: boolean;
  isBackendHealthy: boolean;
  isPollingActive: boolean;
  realtimeStatus: RealtimeStatus;

  // Actions
  createGroup: (name: string, memberCount: number, payMode: PaymentMode, hostName?: string) => Promise<boolean>;
  joinGroup: (code: string, memberName: string) => Promise<boolean>;
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
  comboQty: Record<string, number>;
  updateComboQty: (key: string, delta: number) => void;
  comboPrices: Record<string, number>;
  payStatus: Record<string, boolean>;
  paidCount: number;
  payForUser: (userKey: string) => void;
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

  const [sessionId, setSessionId] = useState<string | null>(() => storageService.getSessionId());
  const [inviteCode, setInviteCode] = useState<string | null>(() => storageService.getInviteCode());
  const [sessionData, setSessionData] = useState<GroupSessionDetailResponseData | null>(null);

  const [selectedShowtime, setSelectedShowtime] = useState<ShowtimeSelection>(DEFAULT_SHOWTIME);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);
  const [isLiveApi, setIsLiveApi] = useState<boolean>(true);
  const [isPollingActive, setIsPollingActive] = useState<boolean>(false);

  // Realtime Seat State (Phase 5)
  const [heldSeats, setHeldSeats] = useState<Record<string, HeldSeatInfo>>({});
  const [comboQty, setComboQty] = useState<Record<string, number>>({ c1: 0, c2: 0, c3: 0, c4: 0 });
  const comboPrices: Record<string, number> = { c1: 115000, c2: 134000, c3: 149000, c4: 229000 };
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
      seats.forEach((s: { seat_id: string; seat_code: string; user_id: string; member_name: string }) => {
        seatMap[s.seat_id] = {
          seatId: s.seat_id,
          seatCode: s.seat_code,
          userId: s.user_id,
          memberName: s.member_name,
        };
      });
      setHeldSeats(seatMap);
    } catch (e) {
      console.warn('Failed to load session seats:', e);
    }
  }, [sessionId]);

  const loadSessionSeatsRef = useRef(loadSessionSeats);
  const refreshSessionDataRef = useRef(refreshSessionData);
  useEffect(() => {
    loadSessionSeatsRef.current = loadSessionSeats;
    refreshSessionDataRef.current = refreshSessionData;
  });

  // Initial load of session and seats
  useEffect(() => {
    if (sessionId) {
      refreshSessionDataRef.current();
      loadSessionSeatsRef.current();
    }
  }, [sessionId]);

  // Reload seats when entering seat selection screen
  useEffect(() => {
    if (sessionId && currentScreen === 'screen-seats') {
      loadSessionSeatsRef.current();
    }
  }, [sessionId, currentScreen]);

  // Phase 4: Realtime WebSocket Collaboration
  const { realtimeStatus } = useSessionRealtime({
    sessionId,
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
      setHeldSeats((prev) => ({
        ...prev,
        [seatId]: {
          seatId,
          seatCode: payload.seatCode || seatId,
          userId: payload.userId || '',
          memberName: payload.memberName || '',
          colorKey: payload.colorKey,
          colorHex: payload.colorHex,
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
    onReconnected: () => {
      refreshSessionDataRef.current();
      loadSessionSeatsRef.current();
    },
  });

  // Cross-screen Session Polling: Keeps session members & seats synchronized across screens
  const isFetchingRef = useRef(false);
  useEffect(() => {
    if (!sessionId) {
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

        const resp = await groupSessionService.createSession({
          showtimeId: selectedShowtime.showTime,
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

        showToast('✓ Tạo nhóm thành công!');
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể tạo nhóm';
        showToast(`✕ ${msg}`);
        return false;
      }
    },
    [currentUser, selectedShowtime, showToast, refreshSessionData, loadSessionSeats, setCurrentUser]
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

        setSessionId(resp.session.id);
        storageService.setSessionId(resp.session.id);
        setInviteCode(code);
        storageService.setInviteCode(code);

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

  // Derive mySeats dynamically from heldSeats
  const mySeats = Object.values(heldSeats)
    .filter((s) => s.userId === currentUser?.userId)
    .map((s) => s.seatId);

  // Realtime & REST Toggle Seat
  const toggleSeat = useCallback(
    async (seatId: string) => {
      if (!sessionId || !currentUser) {
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

        const myHeldCount = Object.values(heldSeats).filter((s) => s.userId === currentUser.userId).length;
        if (myHeldCount >= 4) {
          showToast('Tối đa 4 ghế mỗi người');
          return;
        }

        // Find color slot for current user
        const myIndex = sessionData?.members?.findIndex((m) => m.user_id === currentUser.userId) ?? 0;
        const color = getMemberColor(myIndex >= 0 ? myIndex : 0);

        // Optimistic hold
        setHeldSeats((prev) => ({
          ...prev,
          [seatId]: {
            seatId,
            seatCode: seatId,
            userId: currentUser.userId,
            memberName: currentUser.name,
            colorKey: color.key,
            colorHex: color.hex,
            heldAt: new Date().toISOString(),
          },
        }));

        realtimeService.holdSeat(seatId, currentUser.userId, currentUser.name, color.key, color.hex);

        try {
          await groupSessionService.holdSeat(sessionId, {
            showtimeId: selectedShowtime.showTime,
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
    [sessionId, currentUser, heldSeats, sessionData, selectedShowtime, showToast, loadSessionSeats]
  );

  const simulateSeatSelection = useCallback(
    async (memberKey: 'minh' | 'an' | 'huy', seats: string[]) => {
      const targetName = memberKey.charAt(0).toUpperCase() + memberKey.slice(1);
      const member = sessionData?.members?.find((m) => m.name.toLowerCase().includes(memberKey));
      const simUserId = member?.user_id || `usr_sim_${memberKey}`;
      const simIndex = memberKey === 'minh' ? 1 : memberKey === 'an' ? 2 : 3;
      const color = getMemberColor(simIndex);

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
              showtimeId: selectedShowtime.showTime,
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

  const updateComboQty = useCallback((key: string, delta: number) => {
    setComboQty((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta),
    }));
  }, []);

  const payForUser = useCallback((userKey: string) => {
    setPayStatus((prev) => {
      if (prev[userKey]) return prev;
      setPaidCount((c) => c + 1);
      return { ...prev, [userKey]: true };
    });
  }, []);

  const resetToHome = useCallback(() => {
    storageService.clearAll();
    setSessionId(null);
    setInviteCode(null);
    setSessionData(null);
    setHeldSeats({});
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
        currentUser,
        setCurrentUser,
        sessionId,
        inviteCode,
        sessionData,
        displayMembers,
        isHost,
        selectedShowtime,
        setSelectedShowtime,
        isLiveApi,
        isBackendHealthy,
        isPollingActive,
        realtimeStatus,
        createGroup,
        joinGroup,
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
        payStatus,
        paidCount,
        payForUser,
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
