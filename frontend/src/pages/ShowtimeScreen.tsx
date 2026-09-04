import React, { useState } from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { StatusBar } from '../components/common/StatusBar';
import { Header } from '../components/common/Header';

export const ShowtimeScreen: React.FC = () => {
  const { goTo, goBack, selectedShowtime, setSelectedShowtime } = useGroupSession();
  const [selectedTime, setSelectedTime] = useState(selectedShowtime.showTime || '21:00');
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setSelectedShowtime({
      ...selectedShowtime,
      showTime: time,
    });
  };

  const showtimes = [
    '09:00', '10:45', '12:00', '13:00', '14:15', '15:15',
    '17:30', '18:45', '19:45', '20:15', '21:00', '22:00',
  ];

  return (
    <div className="screen">
      <StatusBar />
      <Header
        title="Quý Tử Vượt Giàu"
        onBack={goBack}
        rightAction={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B3B60" strokeWidth="2">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
          </svg>
        }
      />

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', flexShrink: 0 }}>
        <div
          style={{
            padding: '11px 0',
            marginRight: 20,
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--navy)',
            borderBottom: '3px solid var(--navy)',
          }}
        >
          Suất Chiếu
        </div>
        <div style={{ padding: '11px 0', marginRight: 20, fontSize: 14, color: 'var(--text-muted)' }}>
          Thông Tin
        </div>
        <div style={{ padding: '11px 0', fontSize: 14, color: 'var(--text-muted)' }}>
          Tin Tức
        </div>
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px', flexShrink: 0 }}>
        <div
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--r)',
            fontSize: 13,
            color: 'var(--text-primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          TP Hồ Chí Minh <span style={{ color: 'var(--text-muted)' }}>▾</span>
        </div>
        <div
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--r)',
            fontSize: 13,
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          Cinema <span>▾</span>
        </div>
      </div>

      {/* Date strip */}
      <div className="date-strip">
        <div className="date-card active">
          <div className="day">Thứ Hai</div>
          <div className="num">07/09</div>
        </div>
        <div className="date-card">
          <div className="day">Thứ Ba</div>
          <div className="num">08/09</div>
        </div>
        <div className="date-card">
          <div className="day">Thứ Tư</div>
          <div className="num">09/09</div>
        </div>
        <div className="date-card">
          <div className="day">Thứ Năm</div>
          <div className="num">10/09</div>
        </div>
        <div className="date-card">
          <div className="day">Thứ Sáu</div>
          <div className="num">11/09</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', paddingBottom: 8, flexShrink: 0 }}>
        Thứ Hai 07, tháng 9 2026
      </div>

      <div className="body">
        {/* Cinema accordion */}
        <div className="cinema-item">
          <div className="cinema-header" onClick={() => setIsAccordionOpen(!isAccordionOpen)}>
            <div>
              <div className="cinema-name">Galaxy Cinema Nguyễn Văn Quá</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="cinema-km">📍 2.2 km</span>
              <span>{isAccordionOpen ? '^' : 'v'}</span>
            </div>
          </div>

          {isAccordionOpen && (
            <div className="cinema-content open">
              <div className="format-label">2D PHỤ ĐỀ</div>
              <div className="showtime-grid">
                {showtimes.map((t) => (
                  <div
                    key={t}
                    className={`showtime-btn ${selectedTime === t ? 'selected' : ''}`}
                    onClick={() => handleSelectTime(t)}
                  >
                    {t}
                  </div>
                ))}
              </div>

              {/* Galaxy Together Callout Box */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #FFF7F0, #FFE8D0)',
                  border: '1.5px solid var(--orange)',
                  borderRadius: 'var(--r)',
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)', marginBottom: 6 }}>
                  🎬 GALAXY TOGETHER
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
                  Suất {selectedTime} • Bạn có muốn đi cùng nhóm?
                </div>
                <div className="session-cta-row" style={{ padding: 0 }}>
                  <button className="cta-group cta-solo" onClick={() => goTo('screen-seats')}>
                    Đặt một mình
                  </button>
                  <button className="cta-group cta-together" onClick={() => goTo('screen-create-group')}>
                    👥 Tạo nhóm xem phim
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="cinema-item">
          <div className="cinema-header">
            <div className="cinema-name">Galaxy Cinema Kinh Dương Vương</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="cinema-km">📍 3.5 km</span>
              <span>v</span>
            </div>
          </div>
        </div>

        <div className="cinema-item">
          <div className="cinema-header">
            <div className="cinema-name">Galaxy Cinema Tân Bình</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="cinema-km">📍 4.5 km</span>
              <span>v</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
