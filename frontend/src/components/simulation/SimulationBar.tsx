import React, { useState } from 'react';
import { useGroupSession } from '../../context/GroupSessionContext';

export const SimulationBar: React.FC = () => {
  const {
    currentScreen,
    goTo,
    inviteCode,
    simulateMemberJoin,
    isLiveApi,
    isBackendHealthy,
    simulateSeatSelection,
    sessionData,
  } = useGroupSession();

  const [loadingMember, setLoadingMember] = useState<string | null>(null);

  const handleSimJoin = async (name: string) => {
    if (!inviteCode) return;
    setLoadingMember(name);
    try {
      await simulateMemberJoin(name);
    } finally {
      setLoadingMember(null);
    }
  };

  const currentCount = sessionData?.members?.length || 1;
  const maxMembers = sessionData?.max_members || 4;

  return (
    <div className="sim-bar">
      <span className="sim-label">🎮 Mô phỏng:</span>
      {isBackendHealthy && isLiveApi ? (
        <span className="badge-live">LIVE API</span>
      ) : (
        <span className="badge-demo">DEMO</span>
      )}

      {currentScreen === 'screen-lobby' && (
        <>
          {currentCount < maxMembers && (
            <>
              <button
                className="sim-btn"
                disabled={!!loadingMember}
                onClick={() => handleSimJoin('Minh')}
              >
                {loadingMember === 'Minh' ? 'Đang vào...' : '+ Minh tham gia'}
              </button>
              <button
                className="sim-btn"
                disabled={!!loadingMember}
                onClick={() => handleSimJoin('An')}
              >
                {loadingMember === 'An' ? 'Đang vào...' : '+ An tham gia'}
              </button>
              <button
                className="sim-btn"
                disabled={!!loadingMember}
                onClick={() => handleSimJoin('Huy')}
              >
                {loadingMember === 'Huy' ? 'Đang vào...' : '+ Huy tham gia'}
              </button>
            </>
          )}
          <button className="sim-btn active" onClick={() => goTo('screen-seats')}>
            → Chọn ghế
          </button>
        </>
      )}

      {currentScreen === 'screen-seats' && (
        <>
          <button className="sim-btn" onClick={() => simulateSeatSelection('minh', ['G10'])}>
            Minh chọn G10
          </button>
          <button className="sim-btn" onClick={() => simulateSeatSelection('an', ['G11'])}>
            An chọn G11
          </button>
          <button className="sim-btn" onClick={() => simulateSeatSelection('huy', ['G12'])}>
            Huy chọn G12
          </button>
          <button className="sim-btn active" onClick={() => goTo('screen-fnb')}>
            → Chọn bắp nước
          </button>
        </>
      )}

      {currentScreen === 'screen-fnb' && (
        <button className="sim-btn active" onClick={() => goTo('screen-payment')}>
          → Thanh toán
        </button>
      )}

      {currentScreen === 'screen-payment' && (
        <button className="sim-btn active" onClick={() => goTo('screen-confirmed')}>
          → Hoàn tất
        </button>
      )}

      {currentScreen === 'screen-confirmed' && (
        <button className="sim-btn active" onClick={() => goTo('screen-ticket')}>
          → Vé điện tử
        </button>
      )}
    </div>
  );
};
