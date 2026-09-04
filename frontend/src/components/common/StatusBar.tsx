import React from 'react';

export const StatusBar: React.FC = () => {
  return (
    <div className="status-bar">
      <span>19:12</span>
      <div className="right">
        <span>5G</span>
        <span>📶</span>
        <span>🔋88%</span>
      </div>
    </div>
  );
};
