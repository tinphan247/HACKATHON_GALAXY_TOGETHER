import React from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { StatusBar } from '../components/common/StatusBar';
import { Header } from '../components/common/Header';

export const ConfirmedScreen: React.FC = () => {
  const { goTo, sessionData, inviteCode, currentUser, displayMembers, heldSeats, mySeats, selectedShowtime } = useGroupSession();

  const code = inviteCode || sessionData?.invite?.code || 'GLX-GRP';
  const activeMembers = displayMembers.filter((m) => m.status !== 'EMPTY');

  const movieTitle = sessionData?.movie_title || selectedShowtime?.movieTitle || 'Vé đã chọn';
  const cinemaName = sessionData?.cinema_name || selectedShowtime?.cinemaName || 'Galaxy Cinema';
  const showTime = sessionData?.show_time || selectedShowtime?.showTime || '21:00';
  const showDate = sessionData?.show_date || selectedShowtime?.showDate || '';

  return (
    <div className="screen">
      <StatusBar />
      <Header title="Đặt vé thành công" />

      <div className="body">
        <div className="success-icon">🎉</div>
        <div className="success-title">Đặt vé nhóm thành công!</div>
        <div className="success-sub">
          Tất cả {activeMembers.length} thành viên trong nhóm <strong>"{sessionData?.name || 'Galaxy Together'}"</strong> đã hoàn tất đặt chỗ.
        </div>

        <div className="movie-info-card" style={{ marginTop: 20 }}>
          <div className="title">{movieTitle}</div>
          <div className="meta">
            {cinemaName}
            <br />
            Suất: {showTime} • {showDate}
            <br />
            Mã nhóm: <strong>{code}</strong>
          </div>
        </div>

        <div className="section-heading">Ghế của các thành viên</div>
        <div className="card">
          {activeMembers.map((m, idx) => {
            const isMe = m.userId === currentUser?.userId;
            const memberHeld = Object.values(heldSeats)
              .filter((s) => s.userId === m.userId || (m.name && s.memberName?.toLowerCase() === m.name.toLowerCase()))
              .map((s) => s.seatCode || s.seatId);

            const seatText = isMe
              ? (mySeats.length > 0 ? mySeats.join(', ') : 'G8, G9')
              : (memberHeld.length > 0 ? memberHeld.join(', ') : 'Ghế đơn');

            const isLast = idx === activeMembers.length - 1;

            return (
              <div
                key={m.slot || idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                }}
              >
                <span>{m.name} {isMe ? '(Bạn)' : ''}</span>
                <strong style={{ color: m.colorHex }}>{seatText}</strong>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '12px 16px 20px', background: 'var(--white)', borderTop: '1px solid var(--border)' }}>
        <button className="cta-primary" onClick={() => goTo('screen-ticket')}>
          Xem Vé Điện Tử 🎟️
        </button>
      </div>
    </div>
  );
};
