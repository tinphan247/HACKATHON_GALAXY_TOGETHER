import React, { useState } from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { StatusBar } from '../components/common/StatusBar';
import { Header } from '../components/common/Header';
import { CountdownBanner } from '../components/common/CountdownBanner';
import { SimulationBar } from '../components/simulation/SimulationBar';
import { getMemberColorByKey } from '../constants/theme';
import type { PaymentMethod } from '../types/session';

interface PayModalTarget {
  type: 'self' | 'member' | 'host_all';
  userId?: string;
  memberName: string;
  amount: number;
}

export const PaymentScreen: React.FC = () => {
  const {
    goTo,
    goBack,
    currentUser,
    displayMembers,
    heldSeats,
    mySeats,
    comboQty,
    comboPrices,
    groupFnBSummary,
    paymentSummary,
    payMyShare,
    payForMember,
    payHostAllGroup,
    sessionData,
  } = useGroupSession();

  const [modalTarget, setModalTarget] = useState<PayModalTarget | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('momo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active members
  const activeMembers = displayMembers.filter((m) => m.status !== 'EMPTY');
  const totalMembersCount = Math.max(1, activeMembers.length);

  // Payment mode check
  const isHostPays =
    (sessionData?.payment_mode as string) === 'host_pays' ||
    (sessionData?.payment_mode as string) === 'HOST_PAYS_ALL';

  const isHost = currentUser?.isHost ?? true;

  // Local fallback calculations if summary is still loading
  const fnbTotal = Object.keys(comboQty).reduce(
    (sum, k) => sum + (comboQty[k] || 0) * (comboPrices[k] || 0),
    0
  );
  const mySeatTotal = mySeats.length * 55000;
  const myLocalTotal = mySeatTotal + fnbTotal;

  const formatMoney = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  const paymentMethods: Array<{
    id: PaymentMethod;
    name: string;
    icon: string;
    desc: string;
    badge?: string;
  }> = [
    {
      id: 'momo',
      name: 'Ví MoMo',
      icon: '🟣',
      desc: 'Thanh toán tức thì qua ứng dụng MoMo',
      badge: 'Khuyên dùng',
    },
    {
      id: 'zalopay',
      name: 'Ví ZaloPay',
      icon: '🔵',
      desc: 'Mở nhanh trong Zalo hoặc app ZaloPay',
    },
    {
      id: 'vnpay',
      name: 'VNPAY-QR / VietQR',
      icon: '🔴',
      desc: 'Hỗ trợ quét mã QR từ hơn 40 ứng dụng ngân hàng',
    },
    {
      id: 'card',
      name: 'Thẻ Quốc tế / ATM',
      icon: '💳',
      desc: 'Visa, MasterCard, JCB, Thẻ ATM nội địa',
    },
  ];

  // Handle open modal
  const handleOpenPayModal = (target: PayModalTarget) => {
    setModalTarget(target);
  };

  // Handle confirm pay
  const handleConfirmPay = async () => {
    if (!modalTarget || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (modalTarget.type === 'self') {
        await payMyShare(selectedMethod);
      } else if (modalTarget.type === 'member' && modalTarget.userId) {
        await payForMember(modalTarget.userId, selectedMethod);
      } else if (modalTarget.type === 'host_all') {
        await payHostAllGroup(selectedMethod);
      }
      setModalTarget(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Paid count & all paid status from server-authoritative summary or local
  const paidCount = paymentSummary?.paidMembersCount ?? 0;
  const isAllPaid = paymentSummary?.isAllPaid ?? false;
  const totalSessionAmount = paymentSummary?.totalSessionAmount ?? myLocalTotal;
  const pct = Math.min(100, Math.round((paidCount / totalMembersCount) * 100));

  return (
    <div className="screen">
      <StatusBar />
      <Header
        title={isHostPays ? 'Thanh toán gộp (Host-Pays)' : 'Thanh toán nhóm (Split-Pay)'}
        onBack={goBack}
      />

      <CountdownBanner initialSeconds={300} label="Thời gian thanh toán còn lại:" />
      <SimulationBar />

      <div className="body" style={{ paddingBottom: 90 }}>
        {/* Payment Mode Indicator */}
        <div style={{ padding: '12px 16px 4px' }}>
          <div
            style={{
              background: isHostPays ? '#EFF6FF' : '#FFF7ED',
              border: isHostPays ? '1px solid #BFDBFE' : '1px solid #FFEDD5',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 12,
              lineHeight: 1.4,
              color: isHostPays ? '#1E40AF' : '#9A3412',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong>{isHostPays ? '👑 Chế độ: Trưởng nhóm trả toàn bộ' : '🤝 Chế độ: Mỗi người tự trả phần mình'}</strong>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                {isHostPays
                  ? 'Trưởng nhóm thực hiện 1 giao dịch duy nhất cho cả phòng'
                  : 'Tiền vé và combo được tính độc lập cho từng bạn bè'}
              </div>
            </div>
            <span style={{ fontSize: 18 }}>{isHostPays ? '💳' : '⚡'}</span>
          </div>
        </div>

        {/* Progress Card (Split-Pay Mode) */}
        {!isHostPays && (
          <div style={{ padding: '10px 16px 6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Tiến độ thanh toán nhóm:
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: isAllPaid ? '#16A34A' : 'var(--orange)' }}>
                {paidCount}/{totalMembersCount} bạn đã trả {isAllPaid ? '✓ Xong' : `(${pct}%)`}
              </span>
            </div>
            <div
              style={{
                height: 8,
                background: 'var(--surface)',
                borderRadius: 4,
                overflow: 'hidden',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: isAllPaid ? '#16A34A' : 'var(--orange)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Breakdown Heading */}
        <div className="section-heading" style={{ marginTop: 12 }}>
          {isHostPays ? 'Chi tiết đơn thanh toán gộp' : 'Chi tiết từng thành viên (Vé + F&B)'}
        </div>

        {/* Members Breakdown List */}
        <div style={{ padding: '0 16px' }}>
          {activeMembers.map((m, idx) => {
            const isMe = m.userId === currentUser?.userId;
            const color = getMemberColorByKey(m.colorKey);

            // Read from paymentSummary if available, else fallback
            const memberPayInfo = paymentSummary?.members?.find(
              (p) => p.userId === m.userId || (m.name && p.memberName.toLowerCase() === m.name.toLowerCase())
            );

            // Compute held seats
            const memberHeld = Object.values(heldSeats)
              .filter((s) => s.userId === m.userId || (m.name && s.memberName?.toLowerCase() === m.name.toLowerCase()))
              .map((s) => s.seatCode || s.seatId);

            const seatLabel = memberPayInfo?.seats?.length
              ? memberPayInfo.seats.map((s) => s.seatCode).join(', ')
              : memberHeld.length > 0
              ? memberHeld.join(', ')
              : isMe && mySeats.length > 0
              ? mySeats.join(', ')
              : 'Ghế đơn';

            const memberFnb = groupFnBSummary?.members?.find(
              (f) => f.userId === m.userId || (m.name && f.memberName.toLowerCase() === m.name.toLowerCase())
            );
            const memberFnbAmount = memberPayInfo ? memberPayInfo.fnbAmount : isMe ? fnbTotal : (memberFnb?.totalAmount || 0);

            const memberTotalAmount = memberPayInfo
              ? memberPayInfo.totalAmount
              : (memberHeld.length > 0 ? memberHeld.length * 55000 : 55000) + memberFnbAmount;

            const isPaid = memberPayInfo?.isPaid || (isAllPaid && isMe);

            return (
              <div
                key={m.userId || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'var(--white)',
                  border: isPaid ? '1.5px solid #BBF7D0' : '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                {/* Dot / Status */}
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: isPaid ? '#16A34A' : color.hex,
                    flexShrink: 0,
                    boxShadow: isPaid ? '0 0 0 3px rgba(22,163,74,0.2)' : 'none',
                  }}
                />

                {/* Member Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {m.name} {isMe ? '(Bạn)' : ''}
                    {m.isHost && (
                      <span style={{ fontSize: 10, color: 'var(--orange)', marginLeft: 6, fontWeight: 600 }}>
                        ★ Host
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Ghế: {seatLabel} {memberFnbAmount > 0 ? `+ F&B (${formatMoney(memberFnbAmount)})` : ''}
                  </div>
                </div>

                {/* Amount */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatMoney(memberTotalAmount)}
                  </div>
                  {isPaid ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#16A34A',
                        background: '#DCFCE7',
                        padding: '2px 6px',
                        borderRadius: 8,
                        display: 'inline-block',
                        marginTop: 3,
                      }}
                    >
                      ✓ Đã thanh toán
                    </span>
                  ) : isHostPays ? (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Chờ Host trả</span>
                  ) : isMe ? (
                    <button
                      className="cta-primary"
                      style={{
                        padding: '5px 12px',
                        fontSize: 11,
                        borderRadius: 14,
                        marginTop: 3,
                        background: 'var(--orange)',
                      }}
                      onClick={() =>
                        handleOpenPayModal({
                          type: 'self',
                          memberName: m.name || 'Bạn',
                          amount: memberTotalAmount,
                        })
                      }
                    >
                      Trả tiền →
                    </button>
                  ) : isHost ? (
                    <button
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 14,
                        marginTop: 3,
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        color: '#1D4ED8',
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        handleOpenPayModal({
                          type: 'member',
                          userId: m.userId,
                          memberName: m.name || 'Thành viên',
                          amount: memberTotalAmount,
                        })
                      }
                    >
                      Trả hộ bạn
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đang trả...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Host Pays All Action Card */}
        {isHostPays && (
          <div style={{ padding: '0 16px 16px' }}>
            <div
              className="card"
              style={{
                margin: 0,
                padding: 16,
                background: 'var(--white)',
                border: '2px solid var(--orange)',
                borderRadius: 14,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tổng thanh toán toàn bộ nhóm:</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy)', margin: '6px 0 14px' }}>
                {formatMoney(totalSessionAmount)}
              </div>
              {isHost ? (
                <button
                  className="cta-primary"
                  style={{ width: '100%', padding: '12px', fontSize: 14 }}
                  onClick={() =>
                    handleOpenPayModal({
                      type: 'host_all',
                      memberName: 'Cả nhóm',
                      amount: totalSessionAmount,
                    })
                  }
                >
                  💳 Trưởng nhóm thanh toán ngay ({formatMoney(totalSessionAmount)})
                </button>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 600 }}>
                  ⏳ Vui lòng chờ Trưởng nhóm hoàn tất giao dịch...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment Method Selection Modal */}
      {modalTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'flex-end',
            zIndex: 9999,
          }}
          onClick={() => !isSubmitting && setModalTarget(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 430,
              margin: '0 auto',
              background: 'var(--white)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: '20px 16px 24px',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
                Chọn phương thức thanh toán
              </div>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
                onClick={() => setModalTarget(null)}
              >
                ✕
              </button>
            </div>

            {/* Target & Amount Card */}
            <div
              style={{
                background: 'var(--surface)',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {modalTarget.type === 'host_all'
                    ? 'Thanh toán trọn gói cả nhóm:'
                    : modalTarget.type === 'member'
                    ? `Thanh toán trả hộ ${modalTarget.memberName}:`
                    : 'Thanh toán phần của bạn:'}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {modalTarget.memberName}
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--orange)' }}>
                {formatMoney(modalTarget.amount)}
              </div>
            </div>

            {/* Method Choices */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {paymentMethods.map((m) => {
                const isSelected = selectedMethod === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMethod(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: isSelected ? '2px solid var(--orange)' : '1px solid var(--border)',
                      background: isSelected ? '#FFF7ED' : 'var(--white)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: 24 }}>{m.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {m.name}
                        </span>
                        {m.badge && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: 'var(--white)',
                              background: 'var(--orange)',
                              padding: '1px 5px',
                              borderRadius: 6,
                            }}
                          >
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</div>
                    </div>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: isSelected ? '5px solid var(--orange)' : '2px solid var(--border)',
                        background: 'var(--white)',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Confirm Pay CTA */}
            <button
              className="cta-primary"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: 15,
                fontWeight: 700,
                opacity: isSubmitting ? 0.6 : 1,
              }}
              onClick={handleConfirmPay}
            >
              {isSubmitting ? 'Đang xử lý giao dịch...' : `Xác nhận thanh toán ${formatMoney(modalTarget.amount)} →`}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Bar: Continue to Ticket if All Paid */}
      <div className="bottom-bar">
        <div className="info">
          <div className="label">
            {isAllPaid ? 'Trạng thái phòng:' : `Đã thu (${paidCount}/${totalMembersCount}):`}
          </div>
          <div className="value" style={{ color: isAllPaid ? '#16A34A' : 'var(--text-primary)' }}>
            {isAllPaid ? '✓ Toàn bộ đã thanh toán' : formatMoney(totalSessionAmount)}
          </div>
        </div>
        <button
          className="cta-primary"
          style={{ background: isAllPaid ? '#16A34A' : 'var(--orange)' }}
          onClick={() => goTo('screen-confirmed')}
        >
          {isAllPaid ? 'Xem vé ngay →' : 'Tiếp tục →'}
        </button>
      </div>
    </div>
  );
};
