import React from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { StatusBar } from '../components/common/StatusBar';
import { BottomNav, type NavTabId } from '../components/common/BottomNav';

export const NotFoundScreen: React.FC = () => {
  const { goTo, goBack } = useGroupSession();

  const handleTabSelect = (tab: NavTabId) => {
    if (tab === 'home') goTo('screen-home');
    else if (tab === 'cinemas') goTo('screen-cinemas');
    else if (tab === 'cinetag') goTo('screen-cinetag');
    else if (tab === 'movies') goTo('screen-movies');
    else if (tab === 'account') goTo('screen-account');
  };

  return (
    <div className="screen production-coming-soon-screen not-found-screen">
      {/* 1. Status Bar */}
      <StatusBar />

      {/* 2. Header */}
      <header className="coming-soon-header">
        <button
          type="button"
          className="coming-soon-back-btn"
          onClick={goBack}
          aria-label="Quay lại"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <h1 className="coming-soon-header-title">Galaxy Cinema</h1>

        <button
          type="button"
          className="coming-soon-home-shortcut"
          onClick={() => goTo('screen-home')}
          aria-label="Về trang chủ"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>
      </header>

      {/* 3. Main Center Content Card */}
      <main className="body coming-soon-body">
        <div className="coming-soon-card not-found-card">
          {/* Hero Illustration */}
          <div className="coming-soon-hero-wrapper" aria-hidden="true">
            <div className="coming-soon-illustration-circle not-found-theme">
              <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" className="svg-accent-navy" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#F58020" strokeWidth="2.5" />
                <path d="M11 8a3 3 0 0 1 3 3" stroke="#F58020" strokeWidth="2" />
              </svg>
              <div className="illustration-glow-ring" />
            </div>
          </div>

          {/* Badge */}
          <div className="coming-soon-pill-badge not-found-pill">
            <span className="coming-soon-pill-dot not-found-dot" />
            <span className="coming-soon-pill-text">THÔNG BÁO HỆ THỐNG</span>
          </div>

          {/* Title */}
          <h2 className="coming-soon-title">Trang này chưa khả dụng</h2>

          {/* Description */}
          <p className="coming-soon-description">
            Trang bạn đang tìm kiếm chưa được triển khai trong phiên bản hiện tại.
          </p>

          <div className="coming-soon-divider" />

          {/* Primary CTA */}
          <button
            type="button"
            className="coming-soon-cta-btn"
            onClick={() => goTo('screen-home')}
          >
            Về trang chủ
          </button>
        </div>
      </main>

      {/* 4. Fixed Production Bottom Navigation */}
      <BottomNav
        activeTab="home"
        onTabSelect={handleTabSelect}
      />
    </div>
  );
};
