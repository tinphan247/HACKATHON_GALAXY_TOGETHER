import React from 'react';

export type NavTabId = 'home' | 'cinemas' | 'cinetag' | 'movies' | 'account';

interface BottomNavProps {
  activeTab?: NavTabId;
  onTabSelect?: (tab: NavTabId) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab = 'home',
  onTabSelect,
}) => {
  const currentTab = activeTab;

  const handleSelect = (tab: NavTabId) => {
    onTabSelect?.(tab);
  };

  return (
    <nav className="production-bottom-nav" aria-label="Thanh điều hướng chính">
      {/* 1. Trang chủ */}
      <button
        type="button"
        className={`nav-tab-item ${currentTab === 'home' ? 'active' : ''}`}
        onClick={() => handleSelect('home')}
      >
        <div className="nav-icon-container">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <span className="nav-tab-label">Trang chủ</span>
      </button>

      {/* 2. Rạp phim (3D Glasses) */}
      <button
        type="button"
        className={`nav-tab-item ${currentTab === 'cinemas' ? 'active' : ''}`}
        onClick={() => handleSelect('cinemas')}
      >
        <div className="nav-icon-container">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="8" width="8" height="9" rx="2" />
            <rect x="14" y="8" width="8" height="9" rx="2" />
            <path d="M10 11h4" />
            <path d="M2 10L1 6" />
            <path d="M22 10l1-4" />
          </svg>
        </div>
        <span className="nav-tab-label">Rạp phim</span>
      </button>

      {/* 3. CineTag# (Shopping Cart) */}
      <button
        type="button"
        className={`nav-tab-item ${currentTab === 'cinetag' ? 'active' : ''}`}
        onClick={() => handleSelect('cinetag')}
      >
        <div className="nav-icon-container">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        </div>
        <span className="nav-tab-label">CineTag#</span>
      </button>

      {/* 4. Điện ảnh (Camera / Projector) */}
      <button
        type="button"
        className={`nav-tab-item ${currentTab === 'movies' ? 'active' : ''}`}
        onClick={() => handleSelect('movies')}
      >
        <div className="nav-icon-container">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="14" height="13" rx="2" />
            <polygon points="16 10 22 7 22 17 16 14" />
            <circle cx="7" cy="11" r="1.5" />
            <circle cx="11" cy="11" r="1.5" />
          </svg>
        </div>
        <span className="nav-tab-label">Điện ảnh</span>
      </button>

      {/* 5. Tài khoản (User Avatar) */}
      <button
        type="button"
        className={`nav-tab-item ${currentTab === 'account' ? 'active' : ''}`}
        onClick={() => handleSelect('account')}
      >
        <div className="nav-icon-container">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <span className="nav-tab-label">Tài khoản</span>
      </button>
    </nav>
  );
};
