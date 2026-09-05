import React from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { useToast } from '../context/ToastContext';
import { StatusBar } from '../components/common/StatusBar';
import { Header } from '../components/common/Header';
import { RealQrCode } from '../components/common/RealQrCode';

export const InviteScreen: React.FC = () => {
  const { goTo, goBack, inviteCode, sessionData, displayMembers, selectedShowtime } = useGroupSession();
  const { showToast } = useToast();

  const code = inviteCode || sessionData?.invite?.code || 'GLX-GRP';
  // Generate real deep link URL
  const origin = window.location.origin;
  const joinUrl = `${origin}/?join=${code}`;

  const movieTitle = sessionData?.movie_title || selectedShowtime?.movieTitle || 'Phim đã chọn';
  const cinemaName = sessionData?.cinema_name || selectedShowtime?.cinemaName || 'Galaxy Cinema';
  const showTime = sessionData?.show_time || selectedShowtime?.showTime || '21:00';
  const showDate = sessionData?.show_date || selectedShowtime?.showDate || '';

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      showToast('✓ Đã sao chép mã nhóm: ' + code);
    } catch {
      showToast('Mã nhóm: ' + code);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      showToast('✓ Đã sao chép liên kết tham gia!');
    } catch {
      showToast('Đã lưu liên kết: ' + joinUrl);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tham gia Galaxy Together',
          text: `Cùng xem phim ${sessionData?.movie_title || 'tại Galaxy Cinema'} nhé! Nhập mã ${code} hoặc quét mã QR:`,
          url: joinUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const currentCount = sessionData?.members?.length || 1;
  const maxMembers = sessionData?.max_members || 4;

  return (
    <div className="screen">
      <StatusBar />
      <Header title="Mời bạn bè" onBack={goBack} />

      <div className="body">
        {/* Created Banner */}
        <div style={{ textAlign: 'center', padding: '20px 16px 16px' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            Nhóm đã được tạo!
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Mời bạn bè tham gia qua mã QR hoặc mã nhóm
          </div>
        </div>

        {/* Movie Summary */}
        <div className="movie-info-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="title">{sessionData?.name || 'Đặt vé nhóm'}</div>
              <div className="meta">
                {movieTitle} • {showTime}
                <br />
                {cinemaName} • {showDate}
              </div>
            </div>
            <span className="badge badge-age" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
              {sessionData?.payment_mode === 'HOST_PAYS_ALL' ? 'Trưởng nhóm trả' : 'Tự thanh toán'}
            </span>
          </div>
        </div>

        {/* Real Scannable QR Code */}
        <div style={{ textAlign: 'center', padding: '8px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>
            Quét mã QR bằng camera điện thoại để tham gia
          </div>
          <RealQrCode value={joinUrl} size={150} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Liên kết: {joinUrl}
          </div>
        </div>

        {/* Invite Code */}
        <div className="invite-code" title="Bấm để sao chép" onClick={handleCopyCode}>
          {code}
        </div>

        {/* Copy / Share Actions */}
        <div className="copy-row">
          <button onClick={handleCopyLink}>🔗 Sao chép link</button>
          <button className="filled" onClick={handleNativeShare}>
            ↗ Chia sẻ
          </button>
        </div>

        {/* Member Preview */}
        <div className="section-heading">
          Thành viên ({currentCount}/{maxMembers})
        </div>
        <div style={{ padding: '0 16px 12px' }}>
          {displayMembers.map((m, idx) => {
            if (m.status !== 'EMPTY') {
              return (
                <div className="member-row" key={idx}>
                  <div className="member-avatar" style={{ background: m.colorHex }}>
                    {m.name ? m.name.charAt(0).toUpperCase() : 'T'}
                  </div>
                  <div className="member-info">
                    <div className="member-name">{m.name}</div>
                    <div className="member-role">
                      {m.isHost ? 'Người tạo nhóm' : 'Thành viên'}
                    </div>
                  </div>
                  <span className="member-status status-confirmed">Đã tham gia</span>
                </div>
              );
            }

            return (
              <div className="member-row" key={idx} style={{ opacity: 0.5 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    border: '2px dashed var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    color: 'var(--text-muted)',
                  }}
                >
                  +
                </div>
                <div className="member-info">
                  <div className="member-name" style={{ color: 'var(--text-muted)' }}>
                    Chờ tham gia...
                  </div>
                </div>
                <span className="pulse">◌</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '12px 16px 20px', background: 'var(--white)', borderTop: '1px solid var(--border)' }}>
        <button className="cta-primary" onClick={() => goTo('screen-lobby')}>
          Vào phòng chờ →
        </button>
      </div>
    </div>
  );
};
