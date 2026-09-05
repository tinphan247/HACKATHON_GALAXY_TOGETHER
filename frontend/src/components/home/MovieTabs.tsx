import React from 'react';

export type MovieCategoryTab = 'now_showing' | 'upcoming';

interface MovieTabsProps {
  activeTab: MovieCategoryTab;
  onTabChange: (tab: MovieCategoryTab) => void;
  currentCity: string;
  onOpenCitySelector: () => void;
}

export const MovieTabs: React.FC<MovieTabsProps> = ({
  activeTab,
  onTabChange,
  currentCity,
  onOpenCitySelector,
}) => {
  return (
    <div className="movie-tabs-bar">
      <div className="movie-tabs-nav">
        <button
          type="button"
          className={`movie-tab-btn ${activeTab === 'now_showing' ? 'active' : ''}`}
          onClick={() => onTabChange('now_showing')}
        >
          <span>Đang chiếu</span>
          {activeTab === 'now_showing' && <div className="tab-indicator" />}
        </button>

        <button
          type="button"
          className={`movie-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => onTabChange('upcoming')}
        >
          <span>Sắp chiếu</span>
          {activeTab === 'upcoming' && <div className="tab-indicator" />}
        </button>
      </div>

      {/* Right Location shortcut as seen in IMAGE 2 */}
      <button
        type="button"
        className="movie-tab-location-btn"
        onClick={onOpenCitySelector}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
        <span>{currentCity}</span>
      </button>
    </div>
  );
};
