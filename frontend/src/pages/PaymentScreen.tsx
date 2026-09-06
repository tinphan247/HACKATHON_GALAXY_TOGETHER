import React, { useState, useEffect, useMemo } from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { useToast } from '../context/ToastContext';
import { StatusBar } from '../components/common/StatusBar';
import { CountdownBanner } from '../components/common/CountdownBanner';
import type { PaymentMethod } from '../types/session';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  desc: string;
  iconBg: string;
  iconText: string;
}

const COMBO_NAMES: Record<string, string> = {
  c1: 'Combo 1 Big Extra',
  c2: 'Combo 2 Big Extra',
  c3: 'Combo 3',
  c4: 'Combo 4',
  c5: 'Combo 2 Big',
};

const PAYMENT_OPTIONS: PaymentMethodOption[] = [
  {
    id: 'card',
    name: 'OnePay - Visa, Master, JCB,... / ATM / QR Ngân hàng / Apple Pay',
    desc: 'Thẻ thanh toán quốc tế & thẻ ghi nợ nội địa',
    iconBg: '#006699',
    iconText: 'OnePay',
  },
  {
    id: 'zalopay',
    name: 'Ví ShopeePay - Giảm đến 20% tối đa 50K',
    desc: 'Ưu đãi liên kết ví ShopeePay',
    iconBg: '#EE4D2D',
    iconText: 'Shopee',
  },
  {
    id: 'zalopay',
    name: 'Zalopay - Nhập mã GIAM8K ưu đãi bạn mới',
    desc: 'Mở app Zalopay hoặc Zalo quét mã tức thì',
    iconBg: '#0088FF',
    iconText: 'Zalo',
  },
  {
    id: 'card',
    name: 'HSBC/Payoo - ATM/VISA/MASTER/JCB/QRCODE - Ưu đãi 30% khi thanh toán bằng thẻ JCB',
    desc: 'Cổng thanh toán Payoo liên kết thẻ tín dụng',
    iconBg: '#003366',
    iconText: 'Payoo',
  },
  {
    id: 'momo',
    name: 'Ví MoMo - Thanh toán nhanh chóng tiện lợi',
    desc: 'Xác nhận 1 chạm trên ứng dụng MoMo',
    iconBg: '#A50064',
    iconText: 'MoMo',
  },
];

export const PaymentScreen: React.FC = () => {
  const {
    goTo,
    goBack,
    currentUser,
    isGroupMode,
    sessionData,
    displayMembers,
    heldSeats,
    mySeats,
    comboQty,
    comboPrices,
    groupFnBSummary,
    selectedShowtime,
    holdExpiresAt,
    payHostAllGroup,
    payMyShare,
    paymentSummary,
    loadPaymentSummary,
    paymentStatus,
  } = useGroupSession();

  const { showToast } = useToast();

  const isHostPays =
    isGroupMode &&
    ((sessionData?.payment_mode as string) === 'host_pays' ||
      sessionData?.payment_mode === 'HOST_PAYS_ALL');

  const isSplitMode = isGroupMode && !isHostPays;
  const isHost = currentUser?.isHost ?? true;

  // Role Guard: In HOST_PAYS mode, only Host pays, Member is redirected back to ConfirmedScreen
  useEffect(() => {
    if (isGroupMode && isHostPays && !isHost) {
      goTo('screen-confirmed');
    }
  }, [isGroupMode, isHostPays, isHost, goTo]);

  // In Split-Pay mode, keep payment summary fresh
  useEffect(() => {
    if (isSplitMode) {
      loadPaymentSummary();
    }
  }, [isSplitMode, loadPaymentSummary]);

  const [selectedMethodIndex, setSelectedMethodIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarsApplied, setIsStarsApplied] = useState(false);

  const activeMembers = displayMembers.filter((m) => m.status !== 'EMPTY');
  const totalMembersCount = Math.max(1, activeMembers.length);

  // Dynamic movie & cinema information
  const movieTitle = sessionData?.movie_title || selectedShowtime?.movieTitle || 'Hope Vùng Tử Địa';
  const moviePoster = selectedShowtime?.moviePoster || '/posters/poster_quytuvuotgiau.jpg';
  const cinemaName = sessionData?.cinema_name || selectedShowtime?.cinemaName || 'Galaxy Cinema Nguyễn Văn Quá';
  const screenName = sessionData?.screen_name || selectedShowtime?.screenName || 'RAP 4';
  const showTime = sessionData?.show_time || selectedShowtime?.showTime || '20:15';
  const showDate = sessionData?.show_date || selectedShowtime?.showDate || '06/09/2026';
  const formatText = selectedShowtime?.format || '2D PHỤ ĐỀ';
  const ageRating = selectedShowtime?.movieAgeRating || 'T16';

  const standardPrice = selectedShowtime?.ticketPriceStandard || 55000;
  const vipPrice = selectedShowtime?.ticketPriceVip || 65000;
  const vipRows = ['D', 'E', 'F'];

  const formatMoney = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  // Format Show Date with Day of Week
  const formatShowDateTime = (dateStr?: string, timeStr?: string) => {
    const time = timeStr || '20:15';
    if (!dateStr) return `${time} - Chủ Nhật, 06/09/2026`;
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
      return `${time} - ${dayName}, ${dayFormatted}/${monthFormatted}/${yearFormatted}`;
    } catch {
      return `${time} - ${dateStr}`;
    }
  };

  // Payment status of current user in Split Mode
  const myPaymentInfo = useMemo(() => {
    if (!paymentSummary || !currentUser) return null;
    return paymentSummary.members?.find(
      (m) =>
        m.userId === currentUser.userId ||
        (currentUser.name && m.memberName?.toLowerCase() === currentUser.name.toLowerCase())
    );
  }, [paymentSummary, currentUser]);

  const hasPaidMyShare = myPaymentInfo?.isPaid ?? false;
  const paidCount = paymentSummary?.paidMembersCount ?? 0;
  const isAllPaid = paymentSummary?.isAllPaid ?? false;

  // ---------------------------------------------------------
  // 1. Current user's individual order items (Seats + Combos)
  // ---------------------------------------------------------
  const mySeatsHeld = useMemo(() => {
    return Object.values(heldSeats).filter(
      (s) =>
        s.userId === currentUser?.userId ||
        (currentUser?.name && s.memberName?.toLowerCase() === currentUser.name.toLowerCase())
    );
  }, [heldSeats, currentUser]);

  const mySeatCodes = useMemo(() => {
    if (mySeats.length > 0) return mySeats;
    const codes = mySeatsHeld.map((s) => s.seatCode || s.seatId);
    if (codes.length > 0) return codes;
    if (myPaymentInfo && myPaymentInfo.seats?.length) {
      return myPaymentInfo.seats.map((s) => s.seatCode || s.seatId);
    }
    return [];
  }, [mySeats, mySeatsHeld, myPaymentInfo]);

  const mySeatItems = useMemo(() => {
    return mySeatCodes.map((code) => {
      const row = code.charAt(0);
      const isVip = vipRows.includes(row);
      const price = isVip ? vipPrice : standardPrice;
      return {
        seatCode: code,
        seatType: isVip ? 'VIP' : 'Standard',
        price,
      };
    });
  }, [mySeatCodes, vipRows, vipPrice, standardPrice]);

  const myFnbItems = useMemo(() => {
    const local = Object.entries(comboQty)
      .filter(([_, q]) => q > 0)
      .map(([id, q]) => ({
        id,
        name: COMBO_NAMES[id] || `Combo ${id.toUpperCase()}`,
        quantity: q,
        unitPrice: comboPrices[id] || 100000,
        subtotal: q * (comboPrices[id] || 100000),
      }));
    if (local.length > 0) return local;

    if (myPaymentInfo && myPaymentInfo.fnbItems?.length) {
      return myPaymentInfo.fnbItems
        .filter((it) => it.quantity > 0)
        .map((it) => ({
          id: it.comboId,
          name: it.comboName || COMBO_NAMES[it.comboId] || `Combo ${it.comboId}`,
          quantity: it.quantity,
          unitPrice: it.unitPrice || 100000,
          subtotal: (it.unitPrice || 100000) * it.quantity,
        }));
    }
    return [];
  }, [comboQty, comboPrices, myPaymentInfo]);

  const mySeatTotal = useMemo(() => mySeatItems.reduce((s, it) => s + it.price, 0), [mySeatItems]);
  const myFnbTotal = useMemo(() => myFnbItems.reduce((s, it) => s + it.subtotal, 0), [myFnbItems]);
  const mySubtotal = useMemo(() => {
    const sum = mySeatTotal + myFnbTotal;
    if (sum > 0) return sum;
    return myPaymentInfo?.totalAmount || 0;
  }, [mySeatTotal, myFnbTotal, myPaymentInfo]);

  // ---------------------------------------------------------
  // 2. All members' order items (Used ONLY by Host in HOST_PAYS)
  // ---------------------------------------------------------
  const memberOrderDetails = useMemo(() => {
    if (!isHostPays || !isHost) return [];

    return activeMembers.map((m) => {
      const isMe = m.userId === currentUser?.userId;

      // Seats
      const memberSeatsHeld = Object.values(heldSeats).filter(
        (s) =>
          s.userId === m.userId ||
          (m.name && s.memberName?.toLowerCase() === m.name.toLowerCase())
      );

      const seatCodes = isMe
        ? mySeatCodes.length > 0
          ? mySeatCodes
          : memberSeatsHeld.map((s) => s.seatCode || s.seatId)
        : memberSeatsHeld.map((s) => s.seatCode || s.seatId);

      const seatItems = seatCodes.map((code) => {
        const row = code.charAt(0);
        const isVip = vipRows.includes(row);
        const price = isVip ? vipPrice : standardPrice;
        return {
          seatCode: code,
          seatType: isVip ? 'VIP' : 'Standard',
          price,
        };
      });

      // F&B
      let fnbItems: Array<{ id: string; name: string; quantity: number; unitPrice: number; subtotal: number }> = [];

      if (isMe) {
        fnbItems = myFnbItems;
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
              name: it.comboName || COMBO_NAMES[it.comboId] || `Combo ${it.comboId}`,
              quantity: it.quantity,
              unitPrice: it.unitPrice || 100000,
              subtotal: (it.unitPrice || 100000) * it.quantity,
            }));
        }
      }

      const memberSeatTotal = seatItems.reduce((s, it) => s + it.price, 0);
      const memberFnbTotal = fnbItems.reduce((s, it) => s + it.subtotal, 0);

      return {
        member: m,
        isMe,
        seatItems,
        fnbItems,
        subtotal: memberSeatTotal + memberFnbTotal,
      };
    });
  }, [
    isHostPays,
    isHost,
    activeMembers,
    currentUser,
    heldSeats,
    mySeatCodes,
    vipRows,
    vipPrice,
    standardPrice,
    myFnbItems,
    groupFnBSummary,
  ]);

  const groupTotalAmount = useMemo(() => {
    return memberOrderDetails.reduce((sum, it) => sum + it.subtotal, 0);
  }, [memberOrderDetails]);

  // ---------------------------------------------------------
  // 3. Final Total Calculation
  // - In HOST_PAYS mode for Host: Group total of all members
  // - In SPLIT_EQUAL or SOLO mode: STRICTLY individual order subtotal!
  // ---------------------------------------------------------
  const rawTotalAmount = useMemo(() => {
    if (isGroupMode && isHostPays && isHost) {
      return groupTotalAmount;
    }
    return mySubtotal;
  }, [isGroupMode, isHostPays, isHost, groupTotalAmount, mySubtotal]);

  const discountAmount = isStarsApplied ? 1000 : 0;
  const finalTotalAmount = Math.max(0, rawTotalAmount - discountAmount);

  // ---------------------------------------------------------
  // 4. Payment Trigger Handlers
  // ---------------------------------------------------------
  const handlePayment = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const selectedMethod = (PAYMENT_OPTIONS[selectedMethodIndex]?.id || 'momo') as PaymentMethod;

      if (isGroupMode && isHostPays && isHost) {
        // Host pays for all members
        await payHostAllGroup(selectedMethod);
      } else if (isSplitMode) {
        // Member or Host pays their own share
        const success = await payMyShare(selectedMethod);
        if (success) {
          await loadPaymentSummary();
        }
      } else {
        // Solo payment
        showToast('✓ Đặt vé cá nhân thành công!');
        goTo('screen-ticket');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="screen" style={{ background: '#F4F5F7' }}>
      <StatusBar />

      {/* Galaxy Cinema Header */}
      <div
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <button
          type="button"
          onClick={goBack}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            color: '#111827',
          }}
          aria-label="Quay lại"
        >
          ‹
        </button>

        <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>
          {isGroupMode && isHostPays ? 'Giao dịch (Chủ nhóm)' : 'Giao dịch'}
        </div>

        <div style={{ width: 24 }} />
      </div>

      <CountdownBanner
        initialSeconds={300}
        label="Thời gian hoàn tất thanh toán:"
        expiresAt={holdExpiresAt}
      />

      <div className="body" style={{ paddingBottom: 110 }}>
        {/* Split Mode Progress Banner */}
        {isSplitMode && (
          <div style={{ margin: '10px 16px 2px' }}>
            <div
              style={{
                background: hasPaidMyShare ? '#ECFDF5' : '#FFF7ED',
                border: hasPaidMyShare ? '1px solid #A7F3D0' : '1px solid #FFEDD5',
                borderRadius: 12,
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: hasPaidMyShare ? '#065F46' : '#9A3412' }}>
                  {hasPaidMyShare ? '✓ Bạn đã thanh toán phần của mình' : '🤝 Chế độ: Mỗi người tự thanh toán phần mình'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: isAllPaid ? '#16A34A' : '#F97316' }}>
                  {paidCount}/{totalMembersCount} bạn đã trả {isAllPaid ? '(Hoàn tất)' : ''}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: hasPaidMyShare ? '#047857' : '#7C2D12', lineHeight: 1.4 }}>
                {hasPaidMyShare
                  ? isAllPaid
                    ? 'Toàn bộ nhóm đã thanh toán hoàn tất! Bạn có thể xem vé QR ngay.'
                    : `Hệ thống đang chờ ${Math.max(0, totalMembersCount - paidCount)} bạn bè còn lại thanh toán. Khi cả nhóm hoàn tất, vé điện tử QR sẽ tự động hiển thị.`
                  : 'Tiền vé ghế và combo bên dưới chỉ bao gồm phần của bạn. Bạn tự thanh toán độc lập không bị tính trùng đơn người khác.'}
              </div>
            </div>
          </div>
        )}

        {/* Movie Ticket Card with Ticket Notches */}
        <div
          style={{
            margin: '12px 16px 8px',
            background: '#FFFFFF',
            borderRadius: 14,
            padding: '14px',
            position: 'relative',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          {/* Left Notch */}
          <div
            style={{
              position: 'absolute',
              left: -8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              background: '#F4F5F7',
              borderRadius: '50%',
            }}
          />

          {/* Right Notch */}
          <div
            style={{
              position: 'absolute',
              right: -8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              background: '#F4F5F7',
              borderRadius: '50%',
            }}
          />

          {/* Poster */}
          <img
            src={moviePoster}
            alt={movieTitle}
            style={{
              width: 60,
              height: 84,
              borderRadius: 6,
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />

          {/* Movie Details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: '#111827',
                marginBottom: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {movieTitle}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#4B5563',
                  background: '#F3F4F6',
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
                  color: '#FFFFFF',
                  background: '#F97316',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                {ageRating}
              </span>
            </div>

            <div style={{ fontSize: 12, color: '#4B5563', marginBottom: 2 }}>
              {cinemaName} - {screenName}
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
              {formatShowDateTime(showDate, showTime)}
            </div>
          </div>
        </div>

        {/* Section Heading: Thông tin giao dịch */}
        <div
          style={{
            padding: '14px 16px 6px',
            fontSize: 13,
            color: '#4B5563',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Thông tin giao dịch</span>
          {isSplitMode && (
            <span style={{ fontSize: 11.5, color: '#F97316', fontWeight: 600 }}>
              (Đơn hàng cá nhân của bạn)
            </span>
          )}
        </div>

        {/* Transaction Details Card */}
        <div
          style={{
            margin: '0 16px',
            background: '#FFFFFF',
            borderRadius: 12,
            padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {isGroupMode && isHostPays && isHost ? (
            /* HOST PAYS ALL: Host reviews breakdown for all members */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {memberOrderDetails.map(({ member, isMe, seatItems, fnbItems }) => {
                return (
                  <div key={member.userId || member.slot}>
                    {/* Seats per member */}
                    {seatItems.map((st, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 13,
                          padding: '2px 0',
                        }}
                      >
                        <span style={{ color: '#111827' }}>
                          <strong>1x</strong> {member.name} {isMe ? '(Host)' : ''} - {st.seatType} - {st.seatCode}
                        </span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>
                          {formatMoney(st.price)}
                        </span>
                      </div>
                    ))}

                    {/* Combos per member */}
                    {fnbItems.map((cb, cIdx) => (
                      <div
                        key={cIdx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 12.5,
                          color: '#4B5563',
                          padding: '2px 0 2px 14px',
                        }}
                      >
                        <span>
                          + {cb.quantity}x {cb.name} ({member.name})
                        </span>
                        <span>{formatMoney(cb.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            /* SPLIT PAYMENT OR SOLO: STRICTLY CURRENT USER'S ORDER ITEMS ONLY */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {/* Current user's seats */}
              {mySeatItems.map((st, sIdx) => (
                <div
                  key={sIdx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 13,
                    padding: '2px 0',
                  }}
                >
                  <span style={{ color: '#111827' }}>
                    <strong>1x</strong> Vé {st.seatType} - Ghế {st.seatCode}
                  </span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {formatMoney(st.price)}
                  </span>
                </div>
              ))}

              {/* Current user's combos */}
              {myFnbItems.map((cb, cIdx) => (
                <div
                  key={cIdx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12.5,
                    color: '#4B5563',
                    padding: '2px 0 2px 14px',
                  }}
                >
                  <span>
                    + {cb.quantity}x {cb.name}
                  </span>
                  <span>{formatMoney(cb.subtotal)}</span>
                </div>
              ))}

              {mySeatItems.length === 0 && myFnbItems.length === 0 && (
                <div style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '8px 0' }}>
                  Không có đơn hàng cá nhân nào được ghi nhận.
                </div>
              )}
            </div>
          )}

          {/* Dashed Line */}
          <div style={{ borderTop: '1px dashed #E5E7EB', margin: '10px 0' }} />

          {/* Voucher & Total Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 4,
            }}
          >
            <button
              type="button"
              style={{
                border: '1px solid #F97316',
                background: '#FFF7ED',
                color: '#EA580C',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              onClick={() => setIsStarsApplied(!isStarsApplied)}
            >
              <span>Khuyến mãi</span>
              <span>›</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#4B5563' }}>Tổng Cộng</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#F97316' }}>
                {formatMoney(finalTotalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Section Heading: Áp dụng điểm Stars */}
        <div
          style={{
            padding: '16px 16px 6px',
            fontSize: 13,
            color: '#4B5563',
            fontWeight: 600,
          }}
        >
          Áp dụng điểm Stars
        </div>

        {/* Stars Card */}
        <div
          style={{
            margin: '0 16px',
            background: '#FFFFFF',
            borderRadius: 12,
            padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setIsStarsApplied(!isStarsApplied)}
        >
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>
            {isStarsApplied ? '✓ Đã áp dụng 1 Stars giảm 1,000 VND' : '1 Stars giảm 1,000 VND'}
          </div>
          <span style={{ fontSize: 16, color: isStarsApplied ? '#16A34A' : '#9CA3AF' }}>
            {isStarsApplied ? '✕ Hủy' : '›'}
          </span>
        </div>

        {/* Section Heading: Thông tin thanh toán */}
        <div
          style={{
            padding: '16px 16px 6px',
            fontSize: 13,
            color: '#4B5563',
            fontWeight: 600,
          }}
        >
          Thông tin thanh toán
        </div>

        {/* Payment Methods List */}
        <div
          style={{
            margin: '0 16px',
            background: '#FFFFFF',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          {PAYMENT_OPTIONS.map((opt, idx) => {
            const isSelected = selectedMethodIndex === idx;
            const isLast = idx === PAYMENT_OPTIONS.length - 1;

            return (
              <div
                key={idx}
                onClick={() => setSelectedMethodIndex(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  borderBottom: isLast ? 'none' : '1px solid #F3F4F6',
                  cursor: 'pointer',
                  background: isSelected ? '#FFFAF5' : '#FFFFFF',
                  transition: 'background 0.15s ease',
                }}
              >
                {/* Method Icon / Badge */}
                <div
                  style={{
                    width: 36,
                    height: 24,
                    borderRadius: 4,
                    background: opt.iconBg,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8.5,
                    fontWeight: 800,
                    letterSpacing: '0.2px',
                    flexShrink: 0,
                  }}
                >
                  {opt.iconText}
                </div>

                {/* Method Title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#111827',
                      lineHeight: 1.35,
                    }}
                  >
                    {opt.name}
                  </div>
                </div>

                {/* Radio Button */}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: isSelected ? '6px solid #F97316' : '2px solid #D1D5DB',
                    background: '#FFFFFF',
                    flexShrink: 0,
                    transition: 'border 0.15s ease',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sticky Payment Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderTop: '1px solid #E5E7EB',
          padding: '12px 16px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13.5, color: '#4B5563' }}>Tổng Cộng:</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#F97316' }}>
            {formatMoney(finalTotalAmount)}
          </span>
        </div>

        {isSplitMode && hasPaidMyShare ? (
          <button
            type="button"
            onClick={() => {
              if (isAllPaid) {
                goTo('screen-ticket');
              }
            }}
            disabled={!isAllPaid}
            style={{
              background: isAllPaid ? '#16A34A' : '#9CA3AF',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 700,
              padding: '11px 20px',
              borderRadius: 8,
              border: 'none',
              cursor: isAllPaid ? 'pointer' : 'default',
            }}
          >
            {isAllPaid ? 'Xem vé ngay →' : '✓ Đã thanh toán (Chờ nhóm)'}
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting || paymentStatus === 'PAYMENT_PROCESSING'}
            onClick={handlePayment}
            style={{
              background: '#F97316',
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 700,
              padding: '11px 24px',
              borderRadius: 8,
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              transition: 'opacity 0.2s ease',
            }}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Thanh toán'}
          </button>
        )}
      </div>
    </div>
  );
};
