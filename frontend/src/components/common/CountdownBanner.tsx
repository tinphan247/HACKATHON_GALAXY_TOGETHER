import React, { useState, useEffect } from 'react';

interface CountdownBannerProps {
  initialSeconds?: number;
  label?: string;
  expiresAt?: Date | string | null;
  isActive?: boolean;
}

export const CountdownBanner: React.FC<CountdownBannerProps> = ({
  initialSeconds = 480,
  label = 'Thời gian giữ ghế:',
  expiresAt,
  isActive = true,
}) => {
  const calculateRemaining = () => {
    if (expiresAt) {
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      return Math.max(0, Math.floor(diffMs / 1000));
    }
    return initialSeconds;
  };

  const [remaining, setRemaining] = useState(calculateRemaining);

  useEffect(() => {
    if (!isActive) return;
    setRemaining(calculateRemaining());

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (expiresAt) {
          const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
          return diff;
        }
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, isActive]);

  if (!isActive) return null;

  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (remaining % 60).toString().padStart(2, '0');
  const isUrgent = remaining < 60;

  return (
    <div className={`countdown-banner ${isUrgent ? 'urgent' : ''}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffffff', flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>{label}</span>
      <span className="time">{`${minutes}:${seconds}`}</span>
    </div>
  );
};
