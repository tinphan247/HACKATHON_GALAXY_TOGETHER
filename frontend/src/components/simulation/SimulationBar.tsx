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
    simulateMemberFnB,
    simulatePayment,
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
          {inviteCode && currentCount < maxMembers && (
            <>
              <button
                className="sim-btn"
                disabled={!!loadingMember}
                onClick={() => handleSimJoin('Minh')}
              >
                {loadingMember === 'Minh' ? 'Đang vào...' : '+ Minh vào'}
              </button>
              <button
                className="sim-btn"
                disabled={!!loadingMember}
                onClick={() => handleSimJoin('An')}
              >
                {loadingMember === 'An' ? 'Đang vào...' : '+ An vào'}
              </button>
            </>
          )}
          <button className="sim-btn" onClick={() => simulateSeatSelection('minh', ['G09'])}>
            Minh chọn G09
          </button>
          <button className="sim-btn" onClick={() => simulateSeatSelection('an', ['H08'])}>
            An chọn H08
          </button>
          <button className="sim-btn active" onClick={() => goTo('screen-fnb')}>
            → Bắp nước
          </button>
        </>
      )}

      {currentScreen === 'screen-fnb' && (
        <>
          <button className="sim-btn" onClick={() => simulateMemberFnB('An', 'c2', 1)}>
            An chọn Combo 2
          </button>
          <button className="sim-btn" onClick={() => simulateMemberFnB('Minh', 'c1', 1)}>
            Minh chọn Combo 1
          </button>
          <button className="sim-btn" onClick={() => simulateMemberFnB('Huy', 'c3', 1)}>
            Huy chọn Combo Phô Mai
          </button>
          <button className="sim-btn active" onClick={() => goTo('screen-payment')}>
            → Thanh toán
          </button>
        </>
      )}

      {currentScreen === 'screen-payment' && (
        <>
          <button className="sim-btn" onClick={() => simulatePayment('An', 'momo')}>
            🟣 An trả MoMo
          </button>
          <button className="sim-btn" onClick={() => simulatePayment('Minh', 'zalopay')}>
            🔵 Minh trả ZaloPay
          </button>
          <button className="sim-btn" onClick={() => simulatePayment('Huy', 'vnpay')}>
            🔴 Huy trả VNPAY
          </button>
          <button className="sim-btn active" onClick={() => goTo('screen-confirmed')}>
            → Hoàn tất
          </button>
        </>
      )}

      {currentScreen === 'screen-confirmed' && (
        <button className="sim-btn active" onClick={() => goTo('screen-ticket')}>
          → Vé điện tử
        </button>
      )}
    </div>
  );
};
