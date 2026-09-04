import React from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { useToast } from '../context/ToastContext';
import { StatusBar } from '../components/common/StatusBar';
import { Header } from '../components/common/Header';
import { CountdownBanner } from '../components/common/CountdownBanner';
import { SimulationBar } from '../components/simulation/SimulationBar';
import { getMemberColor } from '../constants/theme';

export const PaymentScreen: React.FC = () => {
  const {
    goTo,
    goBack,
    currentUser,
    displayMembers,
    heldSeats,
    payStatus,
    paidCount,
    payForUser,
    mySeats,
    comboQty,
    comboPrices,
  } = useGroupSession();
  const { showToast } = useToast();

  // Active members from session + any members with held seats
  const activeMembers = displayMembers.filter((m) => m.status !== 'EMPTY');
  const mergedMembers = [...activeMembers];

  Object.values(heldSeats).forEach((seat) => {
    if (
      seat.userId &&
      !mergedMembers.some((m) => m.userId === seat.userId || (seat.memberName && m.name?.toLowerCase() === seat.memberName.toLowerCase()))
    ) {
      const slot = mergedMembers.length;
      const color = getMemberColor(slot);
      mergedMembers.push({
        slot,
        colorKey: color.key,
        colorHex: color.hex,
        userId: seat.userId,
        name: seat.memberName || `Thành viên ${slot + 1}`,
        isHost: false,
        status: 'JOINED',
      });
    }
  });

  const totalMembersCount = Math.max(1, mergedMembers.length);

  const seatTotal = mySeats.length * 55000;
  const fnbTotal = Object.keys(comboQty).reduce(
    (sum, k) => sum + (comboQty[k] || 0) * (comboPrices[k] || 0),
    0
  );
  const myTotal = seatTotal + fnbTotal || 55000;

  const formatMoney = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  const handlePay = (key: string, name: string) => {
    payForUser(key);
    showToast(`💳 ${name} đã thanh toán thành công!`);
  };

  const pct = Math.min(100, Math.round((paidCount / totalMembersCount) * 100));

  return (
    <div className="screen">
      <StatusBar />
      <Header title="Thanh toán nhóm" onBack={goBack} />

      <CountdownBanner initialSeconds={315} label="Thời gian thanh toán:" />
      <SimulationBar />

      <div className="body">
        {/* Progress Card */}
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Tiến độ thanh toán cả nhóm
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>
              {Math.min(paidCount, totalMembersCount)} / {totalMembersCount} người
            </span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
            {pct}% hoàn thành
          </div>
        </div>

        <div className="section-heading">Chi tiết từng thành viên</div>

        <div className="card">
          {mergedMembers.map((m, idx) => {
            const isMe = m.userId === currentUser?.userId;
            const key = isMe
              ? 'tin'
              : m.name?.toLowerCase().includes('minh')
              ? 'minh'
              : m.name?.toLowerCase().includes('an')
              ? 'an'
              : m.name?.toLowerCase().includes('huy')
              ? 'huy'
              : `m_${idx}`;
            const isPaid = !!payStatus[key] || (!isMe && idx === 1 && payStatus['minh']);

            const memberHeld = Object.values(heldSeats)
              .filter((s) => s.userId === m.userId || (m.name && s.memberName?.toLowerCase() === m.name.toLowerCase()))
              .map((s) => s.seatCode || s.seatId);

            const seatLabel = isMe
              ? (mySeats.length > 0 ? mySeats.join(', ') : 'Chưa chọn ghế')
              : (memberHeld.length > 0 ? memberHeld.join(', ') : 'Ghế đơn');

            const memberAmount = isMe
              ? myTotal
              : (memberHeld.length > 0 ? memberHeld.length * 55000 : 55000);

            return (
              <div className="payment-member-row" key={m.slot || idx}>
                <div
                  className={`payment-status-dot ${isPaid ? 'dot-paid' : 'dot-pending'}`}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {m.name} {isMe ? '(Bạn)' : ''}
                  </div>
                  <div className="payment-label">
                    Ghế: {seatLabel} {isMe && fnbTotal > 0 ? '+ Combo bắp nước' : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginRight: 8 }}>
                  <div className="payment-amount">{formatMoney(memberAmount)}</div>
                </div>
                {isPaid ? (
                  <div className="pay-btn paid">✓ Đã trả</div>
                ) : (
                  <button className="pay-btn" onClick={() => handlePay(key, m.name || 'Thành viên')}>
                    {isMe ? 'Thanh toán' : 'Mô phỏng'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '12px 16px 20px', background: 'var(--white)', borderTop: '1px solid var(--border)' }}>
        <button
          className="cta-primary"
          onClick={() => goTo('screen-confirmed')}
        >
          Tiếp tục xác nhận →
        </button>
      </div>
    </div>
  );
};
