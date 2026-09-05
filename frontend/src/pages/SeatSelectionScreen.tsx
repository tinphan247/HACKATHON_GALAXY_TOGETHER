import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { useToast } from '../context/ToastContext';
import { StatusBar } from '../components/common/StatusBar';
import { Header } from '../components/common/Header';
import { CountdownBanner } from '../components/common/CountdownBanner';
import { GroupShareModal } from '../components/common/GroupShareModal';
import { getMemberColor } from '../constants/theme';
import { seatRepository } from '../services/data/seatRepository';
import { showtimeRepository } from '../services/data/showtimeRepository';
import { groupSessionService } from '../services/groupSessionService';
import type { SeatMapConfig, Showtime } from '../types/booking';

export const SeatSelectionScreen: React.FC = () => {
  const {
    goTo,
    goBack,
    isGroupMode,
    sessionData,
    currentUser,
    displayMembers,
    heldSeats,
    mySeats,
    toggleSeat,
    showShareModal,
    setShowShareModal,
    isHoldTimerStarted,
    holdExpiresAt,
    startHoldTimerAction,
    selectedShowtime,
    selectedMovieId,
    selectedDate,
    selectedTheaterId,
    selectShowtimeById,
  } = useGroupSession();
  const { showToast } = useToast();

  const [showtimeDropdownOpen, setShowtimeDropdownOpen] = useState(false);
  const [siblingShowtimes, setSiblingShowtimes] = useState<Showtime[]>([]);
  const [seatMapConfig, setSeatMapConfig] = useState<SeatMapConfig | null>(null);
  const [isLoadingSeats, setIsLoadingSeats] = useState<boolean>(true);
  const [dbOccupiedSeats, setDbOccupiedSeats] = useState<{ soldSeatIds: string[]; heldSeatIds: string[] }>({
    soldSeatIds: [],
    heldSeatIds: [],
  });

  // Active showtimeId
  const effectiveShowtimeId = sessionData?.showtime_id || selectedShowtime?.showtimeId || '';

  const refreshOccupiedSeats = useCallback(async (targetId: string) => {
    try {
      const resp = await groupSessionService.getShowtimeOccupiedSeats(targetId);
      if (resp) {
        setDbOccupiedSeats({
          soldSeatIds: resp.soldSeatIds || [],
          heldSeatIds: resp.heldSeatIds || [],
        });
      }
    } catch (err) {
      console.warn('Could not fetch showtime occupied seats:', err);
    }
  }, []);

  // 1. Fetch available times for the same movie + theater + date
  useEffect(() => {
    let isMounted = true;
    const movieId = sessionData?.movie_id || selectedShowtime?.movieId || selectedMovieId;
    const theaterId = sessionData?.cinema_id || selectedShowtime?.cinemaId || selectedTheaterId;
    const date = sessionData?.show_date || selectedShowtime?.showDate || selectedDate;

    if (movieId && theaterId && date) {
      showtimeRepository
        .getShowtimes({ movieId, date, theaterId })
        .then((list) => {
          if (isMounted) {
            setSiblingShowtimes(list);
          }
        })
        .catch(console.error);
    }
    return () => {
      isMounted = false;
    };
  }, [sessionData, selectedShowtime, selectedMovieId, selectedTheaterId, selectedDate]);

  // 2. Fetch dynamic seat map for current showtime & occupied seats
  useEffect(() => {
    let isMounted = true;
    setIsLoadingSeats(true);

    const targetId = effectiveShowtimeId || 'st-quytu-nvq-07-2100';

    const loadSeatMap = async () => {
      const [config] = await Promise.all([
        seatRepository.getSeatMapForShowtime(targetId),
        refreshOccupiedSeats(targetId),
      ]);

      if (!isMounted) return;
      setSeatMapConfig(config);
      setIsLoadingSeats(false);
    };

    loadSeatMap();

    // Periodic poll for occupied seats every 5s to keep UI updated
    const interval = setInterval(() => {
      refreshOccupiedSeats(targetId);
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [effectiveShowtimeId, refreshOccupiedSeats]);

  // Derive movie & theater details strictly from state / sessionData
  const movieTitle = sessionData?.movie_title || selectedShowtime?.movieTitle || 'Chi tiết phim';
  const cinemaName = sessionData?.cinema_name || selectedShowtime?.cinemaName || 'Galaxy Cinema';
  const showTime = sessionData?.show_time || selectedShowtime?.showTime || '21:00';
  const screenName = sessionData?.screen_name || selectedShowtime?.screenName || seatMapConfig?.screenRoom?.name || 'Phòng chiếu';
  const formatText = selectedShowtime?.format || '2D PHỤ ĐỀ';
  const ageRating = selectedShowtime?.movieAgeRating || 'T18';

  const rows = seatMapConfig?.screenRoom?.rows || ['O', 'N', 'M', 'L', 'K', 'J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
  const seatsPerRow = seatMapConfig?.screenRoom?.seatsPerRow || 10;

  // Combine mock sold seats with database sold seats
  const soldSeats = useMemo(() => {
    const mockSold = seatMapConfig?.soldSeatIds || ['A3', 'A4', 'B5', 'C2', 'D7', 'D8'];
    const dbSold = dbOccupiedSeats.soldSeatIds || [];
    return Array.from(new Set([...mockSold, ...dbSold]));
  }, [seatMapConfig, dbOccupiedSeats.soldSeatIds]);

  // Seats held by other customers outside our current group session
  const externalHeldSeats = useMemo(() => {
    const dbHeld = dbOccupiedSeats.heldSeatIds || [];
    return dbHeld.filter((sId) => !heldSeats[sId]);
  }, [dbOccupiedSeats.heldSeatIds, heldSeats]);

  const vipRows = seatMapConfig?.screenRoom?.vipRows || ['D', 'E', 'F'];

  const standardPrice = selectedShowtime?.ticketPriceStandard || 55000;
  const vipPrice = selectedShowtime?.ticketPriceVip || 65000;

  // Calculate dynamic total price based on individual seat types
  const { count, total } = useMemo(() => {
    let sum = 0;
    for (const s of mySeats) {
      const row = s.charAt(0);
      if (vipRows.includes(row)) {
        sum += vipPrice;
      } else {
        sum += standardPrice;
      }
    }
    return { count: mySeats.length, total: sum };
  }, [mySeats, vipRows, standardPrice, vipPrice]);

  const activeMembers = displayMembers.filter((m) => m.status !== 'EMPTY');
  const formatMoney = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  return (
    <div className="screen">
      <StatusBar />
      <Header
        title={cinemaName}
        onBack={goBack}
        rightAction={
          !isGroupMode ? (
            <button
              className="btn-group-booking-header"
              onClick={() => goTo('screen-create-group')}
            >
              Đặt nhóm
            </button>
          ) : (
            <button
              onClick={() => setShowShareModal(true)}
              title="Chia sẻ nhóm"
              aria-label="Chia sẻ nhóm"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                background: '#FFFFFF',
                color: '#0B3B60',
                border: '1px solid #CBD5E1',
                borderRadius: '50%',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
          )
        }
      />

      {/* Movie & Showtime Bar */}
      <div className="movie-showtime-bar">
        {/* Cột bên trái: Thông tin phim & Phân loại độ tuổi */}
        <div className="movie-info-col">
          <div className="movie-title-text" title={movieTitle}>
            {movieTitle}
          </div>
          <div className="movie-meta-row">
            <span className="badge-age-tag">{ageRating}</span>
            <span className="format-text">{formatText} • {screenName}</span>
          </div>
        </div>

        {/* Cột bên phải: Giờ chiếu (Showtime Selector) */}
        <div className="showtime-selector-container">
          <button
            type="button"
            className="showtime-selector-btn"
            onClick={() => setShowtimeDropdownOpen((prev) => !prev)}
            aria-label="Chọn giờ chiếu"
          >
            <span>{showTime}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {showtimeDropdownOpen && siblingShowtimes.length > 0 && (
            <div className="showtime-dropdown-menu">
              {siblingShowtimes.map((st) => (
                <div
                  key={st.id}
                  className={`showtime-dropdown-item ${st.startTime === showTime ? 'active' : ''}`}
                  onClick={async () => {
                    await selectShowtimeById(st.id);
                    setShowtimeDropdownOpen(false);
                  }}
                >
                  {st.startTime}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CountdownBanner
        isActive={isHoldTimerStarted}
        expiresAt={holdExpiresAt}
        initialSeconds={600}
        label="Thời gian giữ ghế:"
      />

      {/* Group Context Bar with Dynamic Member Avatars */}
      {isGroupMode && (
        <div className="group-ctx" style={{ padding: '7px 16px' }}>
          <div className="icon" style={{ fontSize: 14 }}>🎬</div>
          <div className="info">
            <div className="name" style={{ fontSize: 12 }}>
              {sessionData?.name || 'Phòng vé nhóm'} • Mỗi người chọn 1 ghế
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {activeMembers.map((m) => (
              <div
                key={m.slot}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: m.colorHex,
                  border: '2px solid white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'white',
                }}
                title={m.name}
              >
                {m.name ? m.name.charAt(0).toUpperCase() : 'M'}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="body">
        {isLoadingSeats ? (
          <div style={{ textAlign: 'center', padding: '60px 16px', color: 'var(--text-muted)' }}>
            Đang tải sơ đồ ghế...
          </div>
        ) : (
          <>
            {/* Seat Map */}
            <div className="seat-map-container">
              <div className="seat-grid">
                {rows.map((row, ri) => (
                  <React.Fragment key={row}>
                    {ri === 12 && <div className="aisle" />}
                    <div className="seat-row">
                      <div className="row-label">{row}</div>
                      {Array.from({ length: seatsPerRow }, (_, idx) => {
                        const c = idx + 1;
                        const seatId = `${row}${c}`;
                        const isSold = soldSeats.includes(seatId);
                        const isExternalHold = externalHeldSeats.includes(seatId);
                        const holdInfo = heldSeats[seatId];
                        const isMine = holdInfo && holdInfo.userId === currentUser?.userId;
                        const isOtherHold = holdInfo && !isMine;
                        const isVip = vipRows.includes(row);

                        let seatClass = 'seat';
                        let seatText = '';
                        const seatStyle: React.CSSProperties = {};

                        if (isSold) {
                          seatClass += ' sold';
                        } else if (isExternalHold) {
                          seatClass += ' sold held-external';
                          seatStyle.background = '#CBD5E1';
                          seatStyle.borderColor = '#94A3B8';
                          seatStyle.color = '#64748B';
                          seatText = '✕';
                        } else if (isMine) {
                          seatClass += ' my-seat';
                          seatText = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '✓';
                        } else if (isOtherHold) {
                          seatClass += ' held-other';
                          const member = sessionData?.members?.find(
                            (m) => m.user_id === holdInfo.userId || (holdInfo.memberName && m.name.toLowerCase() === holdInfo.memberName.toLowerCase())
                          );
                          const memberIdx = sessionData?.members?.findIndex(
                            (m) => m.user_id === holdInfo.userId || (holdInfo.memberName && m.name.toLowerCase() === holdInfo.memberName.toLowerCase())
                          ) ?? -1;
                          const assignedColor = getMemberColor(memberIdx >= 0 ? memberIdx : 1);
                          const bg = holdInfo.colorHex || assignedColor.hex;
                          const memberName = holdInfo.memberName || member?.name || 'Bạn khác';
                          seatText = memberName.charAt(0).toUpperCase();
                          seatStyle.background = bg;
                          seatStyle.borderColor = bg;
                          seatStyle.color = '#FFFFFF';
                        } else {
                          seatClass += ' available';
                          if (isVip) {
                            seatStyle.borderColor = 'var(--gold)';
                          }
                        }

                        const tooltipText = isSold
                          ? `Ghế ${seatId} - Đã bán`
                          : isExternalHold
                          ? `Ghế ${seatId} - Đang được người khác giữ`
                          : isMine
                          ? `Ghế ${seatId} - Bạn đang chọn (${isVip ? formatMoney(vipPrice) : formatMoney(standardPrice)})`
                          : isOtherHold
                          ? `Ghế ${seatId} - ${holdInfo.memberName || 'Bạn khác'} đang chọn`
                          : `Ghế ${seatId} - Còn trống (${isVip ? formatMoney(vipPrice) : formatMoney(standardPrice)})`;

                        return (
                          <div
                            key={seatId}
                            className={seatClass}
                            style={seatStyle}
                            title={tooltipText}
                            onClick={async () => {
                              if (isSold) {
                                showToast(`Ghế ${seatId} đã bán`);
                                return;
                              }
                              if (isExternalHold) {
                                showToast(`Ghế ${seatId} đang được người khác giữ, vui lòng chọn ghế khác`);
                                return;
                              }
                              if (isOtherHold) {
                                showToast(`Ghế ${seatId} đang được ${holdInfo.memberName || 'bạn khác'} chọn`);
                                return;
                              }
                              await toggleSeat(seatId);
                              refreshOccupiedSeats(effectiveShowtimeId || 'st-quytu-nvq-07-2100');
                            }}
                          >
                            {seatText}
                          </div>
                        );
                      })}
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Màn hình chiếu nằm ngay sát phía dưới hàng ghế A */}
              <div className="screen-indicator-bottom">
                <div className="screen-bar" />
                <div className="screen-label">MÀN HÌNH</div>
              </div>
            </div>

            {/* Dynamic Group Seat Summary (Inside scrollable body) */}
            {isGroupMode && (
              <div className="group-seat-summary">
                <div className="title">Vị trí nhóm ({activeMembers.length} người)</div>
                {activeMembers.map((m) => {
                  const memberHeld = Object.values(heldSeats)
                    .filter((s) => s.userId === m.userId || (m.name && s.memberName?.toLowerCase() === m.name.toLowerCase()))
                    .map((s) => s.seatCode || s.seatId);

                  return (
                    <div className="gss-row" key={m.slot}>
                      <div className="gss-dot" style={{ background: m.colorHex }} />
                      <span className="gss-name">
                        {m.name || `Thành viên ${m.slot + 1}`}
                        {m.userId === currentUser?.userId ? ' (Bạn)' : ''}:
                      </span>
                      <span className="gss-seats">
                        {memberHeld.length > 0 ? memberHeld.join(', ') : 'Đang chọn ghế...'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Docked 6-Item Legend */}
      <div className="seat-legend-docked">
        <div className="legend-item">
          <div className="legend-box" style={{ border: '1.5px solid #CBD5E1', background: '#FFFFFF' }} />
          <span>Ghế thường</span>
        </div>
        <div className="legend-item">
          <div className="legend-box legend-box-couple" style={{ border: '1.5px solid #EC4899', background: '#FDF2F8' }} />
          <span>Ghế đôi</span>
        </div>
        <div className="legend-item">
          <div className="legend-box" style={{ border: '1.5px solid #F59E0B', background: '#FFFBEB' }} />
          <span>Ghế VIP</span>
        </div>
        <div className="legend-item">
          <div className="legend-box legend-box-triple" style={{ border: '1.5px solid #8B5CF6', background: '#F5F3FF' }} />
          <span>Ghế ba</span>
        </div>
        <div className="legend-item">
          <div className="legend-box" style={{ background: '#CBD5E1', border: '1.5px solid #94A3B8' }} />
          <span>Đã bán</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-box"
            style={{
              background: '#F97316',
              border: '1.5px solid #EA580C',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            ✓
          </div>
          <span>Đang chọn</span>
        </div>
        {isGroupMode &&
          activeMembers.map((m) => (
            <div className="legend-item" key={m.slot}>
              <div
                className="legend-box"
                style={{
                  background: m.colorHex,
                  border: `1.5px solid ${m.colorHex}`,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {m.name ? m.name.charAt(0).toUpperCase() : 'M'}
              </div>
              <span>{m.userId === currentUser?.userId ? `${m.name} (Bạn)` : m.name}</span>
            </div>
          ))}
      </div>

      {/* Bottom Bar */}
      <div className="bottom-bar">
        <div className="info">
          <div className="label">
            {count > 0
              ? isGroupMode
                ? `Ghế của bạn: ${mySeats[0]}`
                : `${count}x ghế: ${mySeats.join(', ')}`
              : isGroupMode
              ? 'Chọn 1 ghế cho bạn'
              : 'Chưa chọn ghế'}
          </div>
          <div className="value">{count > 0 ? formatMoney(total) : '0đ'}</div>
        </div>
        <button
          className="cta-primary"
          disabled={count === 0}
          onClick={async () => {
            if (count === 0) {
              showToast('Vui lòng chọn ghế trước khi tiếp tục');
              return;
            }
            await startHoldTimerAction();
            goTo('screen-fnb');
          }}
        >
          Tiếp tục →
        </button>
      </div>

      {/* Group Share Modal */}
      {isGroupMode && (
        <GroupShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};
