import React, { useMemo } from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { StatusBar } from '../components/common/StatusBar';
import { Header } from '../components/common/Header';

const COMBO_DETAILS: Record<string, { name: string; price: number; desc?: string }> = {
  c1: { name: 'Combo 1 Big Extra', price: 115000, desc: '1 Bắp lớn + 1 Nước lớn + 1 Snack' },
  c2: { name: 'Combo 2 Big Extra', price: 134000, desc: '1 Bắp lớn + 2 Nước lớn + 1 Snack' },
  c3: { name: 'Combo 3', price: 149000, desc: '1 Bắp phô mai + 2 Nước lớn' },
  c4: { name: 'Combo 4', price: 229000, desc: '2 Bắp lớn + 4 Nước lớn + 2 Snack' },
  c5: { name: 'Combo 2 Big', price: 109000, desc: '1 Bắp lớn + 2 Nước vừa' },
};

export const GroupOrderConfirmationScreen: React.FC = () => {
  const {
    goTo,
    goBack,
    sessionData,
    currentUser,
    displayMembers,
    heldSeats,
    mySeats,
    comboQty,
    comboPrices,
    groupFnBSummary,
    selectedShowtime,
    isGroupMode,
  } = useGroupSession();

  const isHostPays =
    isGroupMode &&
    ((sessionData?.payment_mode as string) === 'host_pays' ||
      sessionData?.payment_mode === 'HOST_PAYS_ALL');

  const isHost = currentUser?.isHost ?? true;
  const activeMembers = displayMembers.filter((m) => m.status !== 'EMPTY');

  // Dynamic movie & theater data from state/session
  const movieTitle = sessionData?.movie_title || selectedShowtime?.movieTitle || 'Vé đã chọn';
  const moviePoster = selectedShowtime?.moviePoster || '/posters/poster_quytuvuotgiau.jpg';
  const cinemaName = sessionData?.cinema_name || selectedShowtime?.cinemaName || 'Galaxy Cinema';
  const showTime = sessionData?.show_time || selectedShowtime?.showTime || '21:00';
  const showDate = sessionData?.show_date || selectedShowtime?.showDate || '07/09/2026';
  const screenName = sessionData?.screen_name || selectedShowtime?.screenName || 'Rạp 3';
  const formatText = selectedShowtime?.format || '2D PHỤ ĐỀ';
  const ageRating = selectedShowtime?.movieAgeRating || 'T16';

  const standardPrice = selectedShowtime?.ticketPriceStandard || 55000;
  const vipPrice = selectedShowtime?.ticketPriceVip || 65000;
  const vipRows = ['D', 'E', 'F'];

  const formatMoney = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  // Compute order details per active member
  const memberOrders = useMemo(() => {
    return activeMembers.map((m) => {
      const isMe = m.userId === currentUser?.userId;

      // Seats calculation
      const memberSeatsHeld = Object.values(heldSeats).filter(
        (s) =>
          s.userId === m.userId ||
          (m.name && s.memberName?.toLowerCase() === m.name.toLowerCase())
      );

      const seatCodes = isMe
        ? mySeats.length > 0
          ? mySeats
          : memberSeatsHeld.map((s) => s.seatCode || s.seatId)
        : memberSeatsHeld.map((s) => s.seatCode || s.seatId);

      const seatItems = seatCodes.map((code) => {
        const row = code.charAt(0);
        const isVip = vipRows.includes(row);
        const price = isVip ? vipPrice : standardPrice;
        return {
          seatCode: code,
          seatType: isVip ? 'Vé 2D VIP' : 'Vé 2D Chuẩn',
          price,
        };
      });

      const seatTotal = seatItems.reduce((sum, it) => sum + it.price, 0);

      // F&B calculation
      let fnbItems: Array<{ id: string; name: string; quantity: number; unitPrice: number; subtotal: number }> = [];

      if (isMe) {
        fnbItems = Object.entries(comboQty)
          .filter(([_, q]) => q > 0)
          .map(([id, q]) => {
            const unitPrice = comboPrices[id] || COMBO_DETAILS[id]?.price || 100000;
            return {
              id,
              name: COMBO_DETAILS[id]?.name || `Combo ${id.toUpperCase()}`,
              quantity: q,
              unitPrice,
              subtotal: q * unitPrice,
            };
          });
      } else {
        const memberFnb = groupFnBSummary?.members?.find(
          (f) =>
            f.userId === m.userId ||
            (m.name && f.memberName?.toLowerCase() === m.name.toLowerCase())
        );

        if (memberFnb && memberFnb.items) {
          fnbItems = memberFnb.items
            .filter((it) => it.quantity > 0)
            .map((it) => ({
              id: it.comboId,
              name: it.comboName || COMBO_DETAILS[it.comboId]?.name || `Combo ${it.comboId}`,
              quantity: it.quantity,
              unitPrice: it.unitPrice || COMBO_DETAILS[it.comboId]?.price || 100000,
              subtotal: (it.unitPrice || COMBO_DETAILS[it.comboId]?.price || 100000) * it.quantity,
            }));
        }
      }

      const fnbTotal = fnbItems.reduce((sum, it) => sum + it.subtotal, 0);
      const memberSubtotal = seatTotal + fnbTotal;

      return {
        member: m,
        isMe,
        seatItems,
        seatTotal,
        fnbItems,
        fnbTotal,
        subtotal: memberSubtotal,
      };
    });
  }, [
    activeMembers,
    currentUser,
    heldSeats,
    mySeats,
    vipRows,
    vipPrice,
    standardPrice,
    comboQty,
    comboPrices,
    groupFnBSummary,
  ]);

  // Total group amount
  const groupSubtotal = useMemo(() => {
    return memberOrders.reduce((sum, order) => sum + order.subtotal, 0);
  }, [memberOrders]);

  const discount = 0;
  const groupTotal = Math.max(0, groupSubtotal - discount);

  return (
    <div className="screen" style={{ background: '#F8FAFC' }}>
      <StatusBar />
      <Header title="Xác nhận đơn hàng" onBack={goBack} />

      <div className="body" style={{ paddingBottom: isHost ? 100 : 40 }}>
        {/* Movie Summary Card */}
        <div
          style={{
            margin: '14px 16px 12px',
            background: '#FFFFFF',
            borderRadius: 14,
            padding: 14,
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <img
            src={moviePoster}
            alt={movieTitle}
            style={{
              width: 58,
              height: 80,
              borderRadius: 8,
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: 4,
                lineHeight: 1.3,
              }}
            >
              {movieTitle}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: '#F1F5F9',
                  color: '#475569',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                {formatText}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: '#FEF3C7',
                  color: '#D97706',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                {ageRating}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              {cinemaName} • {screenName}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#F97316', marginTop: 2 }}>
              {showTime} • {showDate}
            </div>
          </div>
        </div>

        {/* Section Heading */}
        <div
          style={{
            padding: '4px 16px 8px',
            fontSize: 13,
            fontWeight: 700,
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Đơn hàng của nhóm ({activeMembers.length} thành viên)
        </div>

        {/* Member Orders List */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {memberOrders.map(({ member, isMe, seatItems, fnbItems, subtotal }) => {
            return (
              <div
                key={member.userId || member.slot}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 14,
                  border: isMe ? '1.5px solid #FDBA74' : '1px solid #E2E8F0',
                  padding: 14,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                {/* Member Header Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 10,
                    borderBottom: '1px solid #F1F5F9',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: member.colorHex,
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {member.name ? member.name.charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                        {member.name} {isMe ? '(Bạn)' : ''}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>
                        {member.isHost ? '👑 Chủ nhóm' : 'Thành viên'}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 800, color: '#F97316' }}>
                    {formatMoney(subtotal)}
                  </div>
                </div>

                {/* Seats detail */}
                <div style={{ marginBottom: 8 }}>
                  {seatItems.length > 0 ? (
                    seatItems.map((st, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 12.5,
                          color: '#334155',
                          padding: '3px 0',
                        }}
                      >
                        <span>
                          Ghế <strong>{st.seatCode}</strong> ({st.seatType})
                        </span>
                        <span style={{ fontWeight: 600 }}>{formatMoney(st.price)}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                      Chưa chọn ghế
                    </div>
                  )}
                </div>

                {/* Combos detail */}
                <div>
                  {fnbItems.length > 0 ? (
                    fnbItems.map((cb, cIdx) => (
                      <div
                        key={cIdx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 12,
                          color: '#475569',
                          padding: '3px 0',
                        }}
                      >
                        <span>
                          {cb.quantity}x {cb.name}
                        </span>
                        <span style={{ fontWeight: 600 }}>{formatMoney(cb.subtotal)}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 11.5, color: '#94A3B8', padding: '2px 0' }}>
                      Không chọn combo
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pricing Summary Card */}
        <div
          style={{
            margin: '16px 16px 0',
            background: '#FFFFFF',
            borderRadius: 14,
            padding: 16,
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              color: '#64748B',
              marginBottom: 8,
            }}
          >
            <span>Tạm tính</span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>{formatMoney(groupSubtotal)}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              color: '#64748B',
              marginBottom: 10,
            }}
          >
            <span>Giảm giá</span>
            <span style={{ fontWeight: 600, color: '#16A34A' }}>0đ</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 10,
              borderTop: '1.5px dashed #E2E8F0',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
              TỔNG THANH TOÁN
            </span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#F97316' }}>
              {formatMoney(groupTotal)}
            </span>
          </div>
        </div>

        {/* Member-specific Waiting Status Card (Only in HOST_PAYS mode) */}
        {!isHost && isHostPays && (
          <div
            style={{
              margin: '18px 16px 0',
              background: '#FFFBEB',
              border: '1.5px solid #FDE68A',
              borderRadius: 14,
              padding: 16,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>⏳</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#B45309', marginBottom: 4 }}>
              Đang chờ chủ nhóm thanh toán
            </div>
            <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
              Chủ nhóm đang xem lại đơn và sẽ thanh toán toàn bộ vé & bắp nước cho cả nhóm. Vé điện tử QR của bạn sẽ tự động hiển thị ngay tại đây khi thanh toán hoàn tất.
            </div>
          </div>
        )}

        {/* Split-Pay Mode: Action to proceed to individual payment */}
        {!isHostPays && (
          <div style={{ margin: '18px 16px 0' }}>
            <button
              type="button"
              className="cta-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: 15,
                fontWeight: 700,
                background: '#F97316',
                color: '#FFFFFF',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => goTo('screen-payment')}
            >
              Tiến hành thanh toán phần của bạn →
            </button>
          </div>
        )}
      </div>

      {/* Host-only Sticky Bottom CTA Bar (Only in HOST_PAYS mode) */}
      {isHost && isHostPays && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            padding: '12px 16px 18px',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
            zIndex: 50,
          }}
        >
          <button
            type="button"
            className="cta-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: 15,
              fontWeight: 700,
              background: '#F97316',
              color: '#FFFFFF',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            onClick={() => goTo('screen-payment')}
          >
            <span>Thanh toán</span>
            <span>·</span>
            <span>{formatMoney(groupTotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const ConfirmedScreen = GroupOrderConfirmationScreen;
