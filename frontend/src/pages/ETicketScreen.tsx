import React from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { StatusBar } from '../components/common/StatusBar';
import { Header } from '../components/common/Header';
import { RealQrCode } from '../components/common/RealQrCode';

export const ETicketScreen: React.FC = () => {
  const { sessionData, inviteCode, currentUser, displayMembers, heldSeats, mySeats, comboQty, comboPrices, resetToHome } = useGroupSession();

  const code = inviteCode || sessionData?.invite?.code || 'GTH-471';
  const mySeatStr = mySeats.length > 0 ? mySeats.join(' • ') : 'Ghế đã chọn';
  const mySeatCompact = mySeats.length > 0 ? mySeats.join('') : 'SEAT';
  const myName = currentUser?.name || 'TIN';
  const ticketPayload = `GLX-TICKET:${code}:${myName.toUpperCase()}:${mySeatCompact}`;

  const fnbTotal = Object.keys(comboQty).reduce(
    (sum, k) => sum + (comboQty[k] || 0) * (comboPrices[k] || 0),
    0
  );
  const myTotal = mySeats.length * 55000 + fnbTotal || 55000;
  const formatMoney = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  const otherMembers = displayMembers.filter((m) => m.status !== 'EMPTY' && m.userId !== currentUser?.userId);

  return (
    <div className="screen">
      <StatusBar />
      <Header title="Vé điện tử" />

      <div className="body">
        <div className="ticket">
          <div className="ticket-header">
            <div className="movie">{sessionData?.movie_title || 'QUÝ TỬ VƯỢT GIÀU'}</div>
            <div className="cinema">{sessionData?.cinema_name || 'Galaxy Cinema Nguyễn Văn Quá'}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <span className="badge badge-age">K</span>
              <span className="badge badge-format">2D PHỤ ĐỀ</span>
            </div>
          </div>

          <div className="ticket-body">
            <div className="ticket-row">
              <span className="ticket-label">Khách hàng</span>
              <span className="ticket-value">{myName}</span>
            </div>
            <div className="ticket-row">
              <span className="ticket-label">Ngày chiếu</span>
              <span className="ticket-value">{sessionData?.show_date || '07/09/2026'}</span>
            </div>
            <div className="ticket-row">
              <span className="ticket-label">Giờ chiếu</span>
              <span className="ticket-value">{sessionData?.show_time || '21:00'}</span>
            </div>
            <div className="ticket-row">
              <span className="ticket-label">Rạp</span>
              <span className="ticket-value">Phòng 3</span>
            </div>
            <div className="ticket-row">
              <span className="ticket-label">Ghế</span>
              <span className="ticket-value" style={{ color: 'var(--orange)' }}>
                {mySeatStr}
              </span>
            </div>
            <div className="ticket-row">
              <span className="ticket-label">Thanh toán</span>
              <span className="ticket-value" style={{ color: '#16A34A' }}>
                {formatMoney(myTotal)} ✓
              </span>
            </div>
          </div>

          <div className="ticket-divider" />

          <div className="ticket-qr">
            <RealQrCode value={ticketPayload} size={110} />
            <div className="code">{code} • {myName.toUpperCase()} • {mySeatCompact}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Vé điện tử — Xuất trình tại quầy soát vé
            </div>
          </div>
        </div>

        {/* Group Ticket Summary */}
        {otherMembers.length > 0 && (
          <div style={{ margin: '12px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Vé các thành viên khác ({otherMembers.length})
            </div>
            <div className="card" style={{ margin: 0 }}>
              {otherMembers.map((m, idx) => {
                const memberHeld = Object.values(heldSeats)
                  .filter((s) => s.userId === m.userId || (m.name && s.memberName?.toLowerCase() === m.name.toLowerCase()))
                  .map((s) => s.seatCode || s.seatId);

                const seatDesc = memberHeld.length > 0 ? memberHeld.join(', ') : 'Ghế đã chọn';
                const isLast = idx === otherMembers.length - 1;

                return (
                  <div
                    key={m.slot || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 0',
                      borderBottom: isLast ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    <div
                      className="member-avatar"
                      style={{
                        background: m.colorHex,
                        width: 28,
                        height: 28,
                        fontSize: 11,
                        color: 'white',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                      }}
                    >
                      {m.name ? m.name.charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{seatDesc}</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>✓ Đã xác nhận</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px 20px', background: 'var(--white)', borderTop: '1px solid var(--border)' }}>
        <button className="cta-primary secondary" onClick={resetToHome}>
          🏠 Về trang chủ
        </button>
      </div>
    </div>
  );
};
