import React from 'react';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, onBack, rightAction }) => {
  return (
    <div className="header">
      {onBack ? (
        <button className="btn-back" onClick={onBack} aria-label="Quay lại">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0B3B60" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      ) : (
        <div style={{ width: 36 }} />
      )}
      <div className="header-title">{title}</div>
      {rightAction ? (
        <div style={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {rightAction}
        </div>
      ) : (
        <div style={{ width: 36 }} />
      )}
    </div>
  );
};
