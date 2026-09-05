import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onBack, rightAction }) => {
  return (
    <div className="header">
      {onBack ? (
        <button className="btn-back" onClick={onBack} aria-label="Quay lại">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0B3B60" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      ) : (
        <div style={{ width: 36, flexShrink: 0 }} />
      )}
      <div className="header-title" style={{ marginRight: rightAction ? 0 : undefined }}>
        <div>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
      {rightAction ? (
        <div style={{ minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
          {rightAction}
        </div>
      ) : (
        <div style={{ width: 36, flexShrink: 0 }} />
      )}
    </div>
  );
};
