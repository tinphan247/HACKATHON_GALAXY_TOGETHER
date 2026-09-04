import React from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { StatusBar } from '../components/common/StatusBar';
import { Header } from '../components/common/Header';
import { SimulationBar } from '../components/simulation/SimulationBar';
import { OfflineBanner } from '../components/common/OfflineBanner';

export const LobbyScreen: React.FC = () => {
  const {
    goTo,
    goBack,
    inviteCode,
    sessionData,
    displayMembers,
    isBackendHealthy,
    realtimeStatus,
  } = useGroupSession();

  const currentCount = sessionData?.members?.length || 1;
  const maxMembers = sessionData?.max_members || 4;
  const code = inviteCode || sessionData?.invite?.code || 'GTH-LIVE';

  const isWsConnected = realtimeStatus === 'CONNECTED';
  const statusColor = isWsConnected ? '#10B981' : realtimeStatus === 'RECONNECTING' ? '#F59E0B' : '#CA8A04';
  const statusLabel = isWsConnected ? '⚡ LIVE WS' : realtimeStatus === 'RECONNECTING' ? '◌ TÁI KẾT NỐI' : 'POLLING';

  return (
    <div className="screen">
      <StatusBar />
      <Header
        title={sessionData?.name || 'Phòng chờ'}
        onBack={goBack}
        rightAction={
          <div
            title={`Trạng thái: ${statusLabel}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 9,
              color: statusColor,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: statusColor,
                display: 'inline-block',
                animation: isWsConnected ? 'pulse-dot 1.5s infinite' : undefined,
              }}
            />
            {statusLabel}
          </div>
        }
      />

      <OfflineBanner isHealthy={isBackendHealthy} />

      {/* Group context bar */}
      <div className="group-ctx">
        <div className="icon">🎬</div>
        <div className="info">
          <div className="name">
            {sessionData?.name || 'Friday Movie Night'} • Mã: {code}
          </div>
          <div className="meta">
            {sessionData?.movie_title || 'Quý Tử Vượt Giàu'} • {sessionData?.show_time || '21:00'} •{' '}
            {sessionData?.cinema_name || 'Galaxy Nguyễn Văn Quá'}
          </div>
        </div>
      </div>

      {/* Realtime activity ticker */}
      <div className="activity-ticker visible" id="lobby-ticker">
        📡 {currentCount >= 2 ? `Đã có ${currentCount} thành viên trong phòng!` : 'Đang chờ bạn bè quét mã tham gia...'}
      </div>

      {/* Simulation Bar */}
      <SimulationBar />

      <div className="body">
        <div className="section-heading">
          Thành viên nhóm ({currentCount}/{maxMembers})
        </div>

        <div style={{ padding: '0 16px' }}>
          {displayMembers.map((m, idx) => {
            if (m.status !== 'EMPTY') {
              return (
                <div className="member-row" key={idx}>
                  <div className="member-avatar" style={{ background: m.colorHex }}>
                    {m.name ? m.name.charAt(0).toUpperCase() : 'M'}
                  </div>
                  <div className="member-info">
                    <div className="member-name">{m.name}</div>
                    <div className="member-role">
                      {m.isHost ? 'Trưởng nhóm' : `Thành viên ${idx + 1}`}
                    </div>
                  </div>
                  <span className="member-status status-confirmed">Đã tham gia</span>
                </div>
              );
            }

            return (
              <div className="member-row" key={idx} style={{ opacity: 0.6 }}>
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
                    Chờ tham gia... <span className="pulse">◌</span>
                  </div>
                </div>
                <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>◌</span>
              </div>
            );
          })}
        </div>

        <div className="divider" style={{ marginTop: 12 }} />

        <div className="section-heading">Thông tin phiên</div>
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="card" style={{ margin: 0, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phim</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                {sessionData?.movie_title || 'Quý Tử Vượt Giàu'}
              </div>
            </div>
            <div className="card" style={{ margin: 0, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Suất chiếu</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                {sessionData?.show_time || '21:00'} • {sessionData?.show_date || '07/09'}
              </div>
            </div>
            <div className="card" style={{ margin: 0, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Thanh toán</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                {sessionData?.payment_mode === 'HOST_PAYS_ALL' ? 'Trưởng nhóm trả' : 'Tự thanh toán'}
              </div>
            </div>
            <div className="card" style={{ margin: 0, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Thành viên</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--orange)' }}>
                {currentCount} / {maxMembers}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px 20px', background: 'var(--white)', borderTop: '1px solid var(--border)' }}>
        <button className="cta-primary" onClick={() => goTo('screen-seats')}>
          Chọn ghế →
        </button>
      </div>
    </div>
  );
};
