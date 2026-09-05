import React from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { StatusBar } from '../components/common/StatusBar';
import { BottomNav, type NavTabId } from '../components/common/BottomNav';

export interface ComingSoonScreenProps {
  tabId: NavTabId;
  title: string;
  description: string;
  headerTitle?: string;
  icon?: React.ReactNode;
}

export const ComingSoonScreen: React.FC<ComingSoonScreenProps> = ({
  tabId,
  title,
  description,
  headerTitle,
  icon,
}) => {
  const { goTo, goBack } = useGroupSession();

  const handleTabSelect = (tab: NavTabId) => {
    if (tab === 'home') {
      goTo('screen-home');
    } else if (tab === 'cinemas') {
      goTo('screen-cinemas');
    } else if (tab === 'cinetag') {
      goTo('screen-cinetag');
    } else if (tab === 'movies') {
      goTo('screen-movies');
    } else if (tab === 'account') {
      goTo('screen-account');
    }
  };

  // Header display name
  const displayHeader = headerTitle || (
    tabId === 'cinemas' ? 'Rạp phim' :
    tabId === 'cinetag' ? 'CineTag#' :
    tabId === 'movies' ? 'Điện ảnh' :
    tabId === 'account' ? 'Tài khoản' : 'Galaxy Cinema'
  );

  // Render hero vector illustration per tab
  const renderHeroIllustration = () => {
    if (icon) return icon;

    switch (tabId) {
      case 'cinemas':
        return (
          <div className="coming-soon-illustration-circle cinemas-theme">
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="9" height="10" rx="2.5" className="svg-accent-orange" />
              <rect x="13" y="7" width="9" height="10" rx="2.5" className="svg-accent-navy" />
              <path d="M11 11h2" strokeWidth="2" />
              <path d="M2 9.5L1 5.5" />
              <path d="M22 9.5l1-4" />
              <circle cx="6.5" cy="12" r="1.5" fill="currentColor" opacity="0.3" />
              <circle cx="17.5" cy="12" r="1.5" fill="currentColor" opacity="0.3" />
            </svg>
            <div className="illustration-glow-ring" />
          </div>
        );

      case 'cinetag':
        return (
          <div className="coming-soon-illustration-circle cinetag-theme">
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1.5" />
              <circle cx="19" cy="21" r="1.5" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" className="svg-accent-navy" />
              <path d="M14 9l3 3m0-3l-3 3" stroke="#F58020" strokeWidth="2" />
              <polygon points="12 2 13.5 5 17 5.5 14.5 8 15 11.5 12 10 9 11.5 9.5 8 7 5.5 10.5 5" fill="#F58020" stroke="none" opacity="0.85" />
            </svg>
            <div className="illustration-glow-ring" />
          </div>
        );

      case 'movies':
        return (
          <div className="coming-soon-illustration-circle movies-theme">
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="14" height="13" rx="2.5" className="svg-accent-navy" />
              <polygon points="16 10 22 7 22 17 16 14" fill="#F58020" stroke="#F58020" />
              <circle cx="7" cy="11.5" r="2" fill="#F58020" stroke="none" />
              <circle cx="11.5" cy="11.5" r="2" fill="#0B3B60" stroke="none" />
              <line x1="2" y1="4" x2="6" y2="7" stroke="#F58020" strokeWidth="2" />
              <line x1="10" y1="4" x2="14" y2="7" stroke="#F58020" strokeWidth="2" />
            </svg>
            <div className="illustration-glow-ring" />
          </div>
        );

      case 'account':
        return (
          <div className="coming-soon-illustration-circle account-theme">
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" className="svg-accent-navy" />
              <circle cx="12" cy="7" r="4" className="svg-accent-orange" />
              <polygon points="19 3 20 6 23 6 20.5 8 21.5 11 19 9.5 16.5 11 17.5 8 15 6 18 6" fill="#F58020" stroke="none" />
            </svg>
            <div className="illustration-glow-ring" />
          </div>
        );

      default:
        return (
          <div className="coming-soon-illustration-circle default-theme">
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#F58020" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div className="illustration-glow-ring" />
          </div>
        );
    }
  };

  return (
    <div className="screen production-coming-soon-screen">
      {/* 1. Status Bar */}
      <StatusBar />

      {/* 2. Standard Header with Back Button */}
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

        <h1 className="coming-soon-header-title">{displayHeader}</h1>

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
        <div className="coming-soon-card">
          {/* Hero Illustration */}
          <div className="coming-soon-hero-wrapper" aria-hidden="true">
            {renderHeroIllustration()}
          </div>

          {/* Badge */}
          <div className="coming-soon-pill-badge">
            <span className="coming-soon-pill-dot" />
            <span className="coming-soon-pill-text">TÍNH NĂNG SẮP RA MẮT</span>
          </div>

          {/* Title */}
          <h2 className="coming-soon-title">{title}</h2>

          {/* Description */}
          <p className="coming-soon-description">{description}</p>

          {/* Divider */}
          <div className="coming-soon-divider" />

          {/* Secondary Microcopy */}
          <p className="coming-soon-microcopy">
            Galaxy Together đang tiếp tục hoàn thiện những trải nghiệm mới dành cho bạn.
          </p>

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
        activeTab={tabId}
        onTabSelect={handleTabSelect}
      />
    </div>
  );
};
