import React from 'react';

interface HomeHeaderProps {
  currentCity: string;
  onOpenCitySelector: () => void;
  notificationCount?: number;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  currentCity,
  onOpenCitySelector,
  notificationCount = 2,
}) => {
  return (
    <header className="home-top-header">
      {/* Brand Logo */}
      <div className="home-brand">
        <div className="galaxy-swirl-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 3C8.82 3 3 8.82 3 16C3 23.18 8.82 29 16 29C23.18 29 29 23.18 29 16"
              stroke="#F58020"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M16 8C11.58 8 8 11.58 8 16C8 20.42 11.58 24 16 24C20.42 24 24 20.42 24 16"
              stroke="#0B3B60"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <circle cx="16" cy="16" r="3.2" fill="#F58020" />
          </svg>
        </div>
        <div className="brand-text-block">
          <span className="brand-galaxy">Galaxy</span>
          <span className="brand-cinema">CINEMA</span>
        </div>
      </div>

      {/* Right Controls: Location pill + Notification */}
      <div className="home-header-right">
        <button
          type="button"
          className="header-location-pill"
          onClick={onOpenCitySelector}
          title="Chọn rạp theo tỉnh thành"
        >
          <svg className="pin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          <span className="city-label">{currentCity}</span>
          <svg className="chevron-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <button
          type="button"
          className="header-bell-btn"
          aria-label="Thông báo"
          onClick={() => {}}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          {notificationCount > 0 && (
            <span className="header-bell-badge">{notificationCount}</span>
          )}
        </button>
      </div>
    </header>
  );
};
