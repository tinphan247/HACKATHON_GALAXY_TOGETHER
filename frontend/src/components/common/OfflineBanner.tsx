import React from 'react';

interface OfflineBannerProps {
  isHealthy: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isHealthy }) => {
  if (isHealthy) return null;

  return (
    <div className="offline-banner">
      <span>⚠️</span>
      <span>Không thể kết nối máy chủ — Đang hoạt động ở Chế độ Demo</span>
    </div>
  );
};
