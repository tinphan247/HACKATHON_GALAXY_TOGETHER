import React, { useState, useEffect, useMemo } from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { useToast } from '../context/ToastContext';
import { RealQrCode } from '../components/common/RealQrCode';
import { resolveMoviePoster, resolveMovieAgeRating } from '../utils/movieUtils';

const COMBO_NAMES: Record<string, string> = {
  c1: 'Combo 1 Big Extra',
  c2: 'Combo 2 Big Extra',
  c3: 'Combo 3',
  c4: 'Combo 4',
  c5: 'Combo 2 Big',
};

export const ETicketScreen: React.FC = () => {
  const {
    sessionData,
    inviteCode,
    currentUser,
    displayMembers,
    heldSeats,
    mySeats,
    comboQty,
    comboPrices,
    resetToHome,
    selectedShowtime,
    issuedTickets,
    paymentSummary,
    loadPaymentSummary,
    loadSessionTickets,
    isGroupMode,
  } = useGroupSession();

  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTicketUserId, setSelectedTicketUserId] = useState<string | null>(null);

  // Keep payment status and tickets fresh on entering screen
  useEffect(() => {
    if (isGroupMode) {
      loadPaymentSummary();
      loadSessionTickets();
    }
  }, [isGroupMode, loadPaymentSummary, loadSessionTickets]);

  const currentUserId = currentUser?.userId;

  // Active ticket determination: default to current user's ticket if in issuedTickets
  const activeTicket = useMemo(() => {
    if (!issuedTickets || issuedTickets.length === 0) return null;
    if (selectedTicketUserId) {
      return issuedTickets.find((t) => t.userId === selectedTicketUserId) || issuedTickets[0];
    }
    const mine = issuedTickets.find((t) => t.userId === currentUserId);
    return mine || issuedTickets[0];
  }, [issuedTickets, selectedTicketUserId, currentUserId]);

  const code = inviteCode || sessionData?.invite?.code || 'GLX-892';
  const mySeatStr = activeTicket ? activeTicket.seatCode : mySeats.length > 0 ? mySeats.join(', ') : 'G9';
  const mySeatCompact = activeTicket ? activeTicket.seatCode : mySeats.length > 0 ? mySeats.join('') : 'G9';
  const myName = activeTicket ? activeTicket.memberName : currentUser?.name || 'TÍN';
  const ticketPayload = activeTicket ? activeTicket.qrPayload : `GLX-TICKET:${code}:${myName.toUpperCase()}:${mySeatCompact}`;

  const ticketCodeDisplay = activeTicket
    ? activeTicket.ticketCode.replace('GLX-', '')
    : (code || '').replace(/\D/g, '').padEnd(6, '5').slice(0, 6) || '138055';

  const movieTitle = sessionData?.movie_title || selectedShowtime?.movieTitle || 'Chi tiết phim';
  const moviePoster = resolveMoviePoster(
    movieTitle,
    sessionData?.movie_id || selectedShowtime?.movieId,
    selectedShowtime?.moviePoster
  );
  const cinemaName = sessionData?.cinema_name || selectedShowtime?.cinemaName || 'Galaxy Cinema Nguyễn Văn Quá';
  const screenName = sessionData?.screen_name || selectedShowtime?.screenName || 'Rạp 3';
  const showDate = sessionData?.show_date || selectedShowtime?.showDate || '07/09/2026';
  const showTime = sessionData?.show_time || selectedShowtime?.showTime || '21:00';
  const ageRating = resolveMovieAgeRating(
    movieTitle,
    sessionData?.movie_id || selectedShowtime?.movieId,
    selectedShowtime?.movieAgeRating
  );
  const formatText = selectedShowtime?.format || '2D PHỤ ĐỀ';

  const standardPrice = selectedShowtime?.ticketPriceStandard || 55000;
  const vipPrice = selectedShowtime?.ticketPriceVip || 65000;
  const vipRows = ['D', 'E', 'F'];

  const seatTotal = mySeats.reduce((sum, s) => {
    const row = s.charAt(0);
    return sum + (vipRows.includes(row) ? vipPrice : standardPrice);
  }, 0);

  const fnbTotal = Object.keys(comboQty).reduce(
    (sum, k) => sum + (comboQty[k] || 0) * (comboPrices[k] || 0),
    0
  );
  const myTotal = seatTotal + fnbTotal || 100000;
  const formatMoney = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  // Format Show Date Time
  const formatShowDateTime = (dateStr?: string, timeStr?: string) => {
    const time = timeStr || '21:00';
    if (!dateStr) return `Suất ${time} - Thứ Hai, 07/09/2026`;
    try {
      let d: Date;
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        d = new Date(Number(year), Number(month) - 1, Number(day));
      } else {
        d = new Date(dateStr);
      }
      const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = daysOfWeek[d.getDay()] || 'Chủ Nhật';
      const dayFormatted = d.getDate().toString().padStart(2, '0');
      const monthFormatted = (d.getMonth() + 1).toString().padStart(2, '0');
      const yearFormatted = d.getFullYear();
      return `Suất ${time} - ${dayName}, ${dayFormatted}/${monthFormatted}/${yearFormatted}`;
    } catch {
      return `Suất ${time} - ${dateStr}`;
    }
  };

  // Selected combos list
  const selectedCombos = Object.entries(comboQty)
    .filter(([_, q]) => q > 0)
    .map(([id, q]) => `${q}x ${COMBO_NAMES[id] || id}`);
  const hasCombos = selectedCombos.length > 0;

  // Compute live payment status of all active members in group
  const activeMembers = useMemo(() => {
    return displayMembers.filter((m) => m.status !== 'EMPTY');
  }, [displayMembers]);

  const memberStatusList = useMemo(() => {
    return activeMembers.map((m) => {
      const isMe =
        m.userId === currentUserId ||
        Boolean(currentUser?.name && m.name && m.name.toLowerCase() === currentUser.name.toLowerCase());

      // Look up server payment record
      const summaryInfo = paymentSummary?.members?.find(
        (p) =>
          p.userId === m.userId ||
          Boolean(m.name && p.memberName?.toLowerCase() === m.name.toLowerCase())
      );

      // Seats for this member
      const memberSeatsHeld = Object.values(heldSeats)
        .filter(
          (s) =>
            s.userId === m.userId ||
            Boolean(m.name && s.memberName?.toLowerCase() === m.name.toLowerCase())
        )
        .map((s) => s.seatCode || s.seatId);

      const seatCodes = isMe && mySeats.length > 0 ? mySeats : memberSeatsHeld;
      const seatDesc = seatCodes.length > 0 ? seatCodes.join(', ') : '1 ghế';

      // Check if ticket exists in issuedTickets
      const memberTicket = issuedTickets.find(
        (t) =>
          t.userId === m.userId ||
          Boolean(m.name && t.memberName?.toLowerCase() === m.name.toLowerCase())
      );

      const isPaid =
        summaryInfo?.isPaid ??
        (memberTicket ? true : m.status === 'PAID');

      return {
        member: m,
        isMe,
        seatDesc,
        isPaid,
        amount: summaryInfo?.totalAmount,
        paymentMethod: summaryInfo?.payment?.paymentMethod,
        hasTicket: !!memberTicket,
      };
    });
  }, [activeMembers, currentUserId, currentUser, paymentSummary, heldSeats, mySeats, issuedTickets]);

  const paidCount = memberStatusList.filter((m) => m.isPaid).length;
  const totalMembersCount = Math.max(1, memberStatusList.length);
  const isAllPaid = paidCount >= totalMembersCount;

  const handleExportInvoice = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      showToast('Hoá đơn điện tử VAT đã được khởi tạo và gửi tới email của bạn!');
    }, 600);
  };

  const handleNudgeMember = (memberName: string) => {
    const inviteLink = `${window.location.origin}/join/${code}`;
    const text = `Phòng vé Galaxy Cinema [${code}]: Mình đã thanh toán xong vé rồi! Bạn ${memberName} vào thanh toán phần mình nhé: ${inviteLink}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`Đã sao chép lời nhắc thanh toán cho ${memberName}!`);
    } else {
      showToast(`Đã gửi nhắc nhở thanh toán tới ${memberName}!`);
    }
  };

  return (
    <div className="screen" style={{ background: '#F5F5F7' }}>
      {/* Top Header with circular Back button */}
      <div
        style={{
          padding: '14px 16px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          type="button"
          onClick={resetToHome}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
          aria-label="Quay lại"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>
          Vé Điện Tử
        </div>

        <div style={{ width: 40 }} />
      </div>

      {/* Main Body */}
      <div className="body" style={{ paddingBottom: 24, background: '#F5F5F7' }}>
        {/* Ticket Switcher Tabs (if multiple tickets issued) */}
        {issuedTickets && issuedTickets.length > 1 && (
          <div
            style={{
              padding: '0 16px 12px',
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {issuedTickets.map((t) => {
              const isSelected = activeTicket?.id === t.id;
              const isMine = t.userId === currentUserId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTicketUserId(t.userId)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 20,
                    border: isSelected ? '1.5px solid #F97316' : '1px solid #D1D5DB',
                    background: isSelected ? '#F97316' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#374151',
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: isSelected ? '0 2px 6px rgba(249,115,22,0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{t.memberName}</span>
                  {isMine && <span style={{ opacity: 0.85, fontSize: 10 }}>(Bạn)</span>}
                  <span style={{ fontSize: 11, opacity: isSelected ? 0.9 : 0.6 }}>• {t.seatCode}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Ticket Voucher Card */}
        <div className="ticket-voucher">
          {/* Movie Header */}
          <div className="ticket-movie-section">
            <div className="ticket-movie-header-row">
              <img
                src={moviePoster}
                alt={movieTitle}
                className="ticket-poster-thumb"
              />
              <div className="ticket-movie-info">
                <div className="ticket-movie-title">{movieTitle}</div>
                <div className="ticket-movie-tags">
                  <span className="ticket-tag-age">{ageRating}</span>
                  <span className="ticket-tag-format">{formatText}</span>
                </div>
              </div>
            </div>

            <div className="ticket-cinema-row">
              <div className="ticket-cinema-name">
                {cinemaName} - {screenName}
              </div>
              <div className="ticket-showtime-text">
                {formatShowDateTime(showDate, showTime)}
              </div>
            </div>
          </div>

          {/* QR Code & Seats Section */}
          <div className="ticket-qr-section">
            <RealQrCode value={ticketPayload} size={135} />
            <div
              style={{
                fontSize: 11,
                fontFamily: 'monospace',
                letterSpacing: '1px',
                color: '#6B7280',
                marginTop: 2,
              }}
            >
              {code} • {myName.toUpperCase()} • {mySeatCompact}
            </div>

            <div className="ticket-seat-section">
              <div className="ticket-seat-label">
                Ghế - <strong className="ticket-seat-value">{mySeatStr}</strong>
              </div>

              {/* Conditional Combo Section */}
              {hasCombos && (
                <div className="ticket-combo-row">
                  <span className="ticket-combo-label">Combo bắp nước - </span>
                  <span className="ticket-combo-value">{selectedCombos.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Notches with Dashed Line */}
          <div className="ticket-cutout-divider">
            <div className="ticket-notch ticket-notch-left" />
            <div className="ticket-cutout-line" />
            <div className="ticket-notch ticket-notch-right" />
          </div>

          {/* Note Box */}
          <div className="ticket-notice-text">
            Khách hàng vui lòng nhận vé giấy tại quầy vé để miễn phụ thu phí giữ xe qua đêm đối với suất chiếu kết thúc sau 23:01.
          </div>

          {/* 3-Column Ticket Stats */}
          <div className="ticket-stats-grid">
            <div className="ticket-stat-col">
              <div className="ticket-stat-label">Mã Vé</div>
              <div className="ticket-stat-value">{ticketCodeDisplay}</div>
            </div>
            <div className="ticket-stat-col">
              <div className="ticket-stat-label">Stars</div>
              <div className="ticket-stat-value">0</div>
            </div>
            <div className="ticket-stat-col">
              <div className="ticket-stat-label">Đã Thanh Toán</div>
              <div className="ticket-stat-value ticket-stat-price">{formatMoney(myTotal)}</div>
            </div>
          </div>
        </div>

        {/* Realtime Group Payment Status Card (When in group mode) */}
        {isGroupMode && memberStatusList.length > 0 && (
          <div style={{ margin: '14px 16px 12px' }}>
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 16,
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: '1px solid #E5E7EB',
              }}
            >
              {/* Header with Title & Progress Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                    Trạng thái thanh toán nhóm
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: isAllPaid ? '#DCFCE7' : '#FFEDD5',
                    color: isAllPaid ? '#15803D' : '#C2410C',
                    border: isAllPaid ? '1px solid #86EFAC' : '1px solid #FDBA74',
                  }}
                >
                  {paidCount}/{totalMembersCount} đã trả {isAllPaid ? '(Hoàn tất)' : ''}
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: 6,
                  background: '#E5E7EB',
                  borderRadius: 999,
                  overflow: 'hidden',
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.round((paidCount / totalMembersCount) * 100))}%`,
                    height: '100%',
                    background: isAllPaid
                      ? '#16A34A'
                      : 'linear-gradient(90deg, #F97316 0%, #16A34A 100%)',
                    borderRadius: 999,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {/* Status Note Banner */}
              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  fontSize: 11.5,
                  lineHeight: 1.45,
                  marginBottom: 14,
                  background: isAllPaid ? '#F0FDF4' : '#FFFBEB',
                  color: isAllPaid ? '#166534' : '#92400E',
                  border: isAllPaid ? '1px solid #BBF7D0' : '1px solid #FDE68A',
                }}
              >
                {isAllPaid
                  ? 'Toàn bộ nhóm đã thanh toán hoàn tất! Chúc các bạn có buổi xem phim vui vẻ!'
                  : 'Bạn đã có vé QR của mình để vào rạp. Hệ thống đang giữ ghế cho cả nhóm và chờ các bạn còn lại hoàn tất.'}
              </div>

              {/* Member Rows List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {memberStatusList.map((item, idx) => {
                  const m = item.member;
                  return (
                    <div
                      key={m.userId || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: item.isMe ? '#F9FAFB' : '#FFFFFF',
                        borderRadius: 10,
                        border: item.isMe ? '1px solid #E5E7EB' : '1px solid #F3F4F6',
                      }}
                    >
                      {/* Member Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: m.colorHex || '#F97316',
                            color: '#FFFFFF',
                            fontSize: 12,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textTransform: 'uppercase',
                          }}
                        >
                          {(m.name || 'M').charAt(0)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>
                              {m.name}
                            </span>
                            {item.isMe && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: '#F97316',
                                  background: '#FFF7ED',
                                  padding: '1px 5px',
                                  borderRadius: 6,
                                  border: '1px solid #FFEDD5',
                                }}
                              >
                                Bạn
                              </span>
                            )}
                            {m.isHost && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: '#B45309',
                                  background: '#FEF3C7',
                                  padding: '1px 5px',
                                  borderRadius: 6,
                                }}
                              >
                                Trưởng nhóm
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
                            Ghế: <strong style={{ color: '#374151' }}>{item.seatDesc}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Payment Status Badge & Nudge Button */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {item.isPaid ? (
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: '#15803D',
                              background: '#DCFCE7',
                              border: '1px solid #86EFAC',
                              padding: '4px 9px',
                              borderRadius: 14,
                              display: 'inline-block',
                            }}
                          >
                            Đã thanh toán
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span
                              style={{
                                fontSize: 11.5,
                                fontWeight: 600,
                                color: '#C2410C',
                                background: '#FFEDD5',
                                border: '1px solid #FDBA74',
                                padding: '4px 9px',
                                borderRadius: 14,
                                display: 'inline-block',
                              }}
                            >
                              Chờ thanh toán
                            </span>
                            <button
                              type="button"
                              onClick={() => handleNudgeMember(m.name || 'bạn')}
                              style={{
                                background: '#FFFFFF',
                                border: '1px solid #D1D5DB',
                                borderRadius: 12,
                                padding: '4px 8px',
                                fontSize: 10.5,
                                fontWeight: 600,
                                color: '#4B5563',
                                cursor: 'pointer',
                              }}
                              title="Gửi link nhắc bạn thanh toán"
                            >
                              Nhắc bạn
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Action Buttons */}
      <div className="ticket-actions-row">
        <button
          type="button"
          className="btn-ticket-outline"
          onClick={handleExportInvoice}
          disabled={isExporting}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          {isExporting ? 'Đang xuất...' : 'Xuất Hoá Đơn'}
        </button>

        <button
          type="button"
          className="btn-ticket-solid"
          onClick={resetToHome}
        >
          Về trang chủ
        </button>
      </div>
    </div>
  );
};
