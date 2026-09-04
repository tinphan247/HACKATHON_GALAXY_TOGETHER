import React from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { StatusBar } from '../components/common/StatusBar';

export const HomeScreen: React.FC = () => {
  const { goTo } = useGroupSession();

  return (
    <div className="screen">
      <StatusBar />
      <div className="body">
        <div className="home-hero">
          <div className="greeting">Chào buổi tối 👋</div>
          <div className="tagline">Phim gì hôm nay?</div>
          <div className="sub">Đặt vé cho nhóm, không cần lo thu tiền</div>
          <div className="together-badge">✨ Mới: Galaxy Together</div>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', padding: '0 16px', borderBottom: '1px solid var(--border)', marginTop: 2 }}>
          <div
            style={{
              padding: '12px 0',
              marginRight: 20,
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--navy)',
              borderBottom: '3px solid var(--navy)',
            }}
          >
            Đang chiếu
          </div>
          <div
            style={{
              padding: '12px 0',
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--text-muted)',
            }}
          >
            Sắp chiếu
          </div>
        </div>

        {/* Together strip */}
        <div className="together-strip" onClick={() => goTo('screen-showtimes')}>
          <div className="ts-label">🎬 Galaxy Together</div>
          <div className="ts-title">Đặt vé nhóm cùng nhau</div>
          <div className="ts-desc">
            Mỗi người chọn ghế, chọn combo và tự thanh toán — không ai phải ứng tiền
          </div>
          <div className="ts-cta">Thử ngay →</div>
        </div>

        {/* Movie Grid */}
        <div className="movie-grid">
          <div className="movie-card" onClick={() => goTo('screen-showtimes')}>
            <div className="movie-poster" style={{ background: 'linear-gradient(135deg, #1a3a5c, #2d6a9f)' }}>
              🎬
              <div className="overlay">
                <span className="age-badge">K</span>
                <span className="rating">★ 8.4</span>
              </div>
            </div>
            <div className="movie-title">Quý Tử Vượt Giàu</div>
          </div>

          <div className="movie-card" onClick={() => goTo('screen-showtimes')}>
            <div className="movie-poster" style={{ background: 'linear-gradient(135deg, #5a1a3c, #9f2d6a)' }}>
              🌟
              <div className="overlay">
                <span className="age-badge">T16</span>
                <span className="rating">★ 9.7</span>
              </div>
            </div>
            <div className="movie-title">Hope Vùng Tử Địa</div>
          </div>

          <div className="movie-card" onClick={() => goTo('screen-showtimes')}>
            <div className="movie-poster" style={{ background: 'linear-gradient(135deg, #1a5c3a, #2d9f6a)' }}>
              🐠
              <div className="overlay">
                <span className="age-badge">K</span>
                <span className="rating">★ 9.0</span>
              </div>
            </div>
            <div className="movie-title">Chiikawa: Bí Mật Đảo</div>
          </div>

          <div className="movie-card" onClick={() => goTo('screen-showtimes')}>
            <div className="movie-poster" style={{ background: 'linear-gradient(135deg, #3c3c1a, #6a6a2d)' }}>
              🦸
              <div className="overlay">
                <span className="age-badge">T13</span>
                <span className="rating">★ 8.2</span>
              </div>
            </div>
            <div className="movie-title">Hộ Linh Tráng Sĩ</div>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div style={{ background: 'var(--white)', borderTop: '1px solid var(--border)', display: 'flex', padding: '8px 0 16px' }}>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--navy)' }}>
          🏠<br />Trang chủ
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
          🎭<br />Rạp phim
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
          🏷️<br />CineTag#
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
          🎞️<br />Điện ảnh
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
          👤<br />Tài khoản
        </div>
      </div>
    </div>
  );
};
