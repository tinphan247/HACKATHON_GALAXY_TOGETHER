import React, { useState, useEffect } from 'react';

interface CountdownBannerProps {
  initialSeconds?: number;
  label?: string;
}

export const CountdownBanner: React.FC<CountdownBannerProps> = ({
  initialSeconds = 480,
  label = 'Thời gian giữ ghế:',
}) => {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (remaining % 60).toString().padStart(2, '0');
  const isUrgent = remaining < 60;

  return (
    <div className={`countdown-banner ${isUrgent ? 'urgent' : ''}`}>
      <span>⏱</span>
      <span>{label}</span>
      <span className="time">{`${minutes}:${seconds}`}</span>
    </div>
  );
};
