import React, { useState, useEffect } from 'react';
import { useGroupSession } from './context/GroupSessionContext';
import { HomeScreen } from './pages/HomeScreen';
import { ShowtimeScreen } from './pages/ShowtimeScreen';
import { CreateGroupScreen } from './pages/CreateGroupScreen';
import { InviteScreen } from './pages/InviteScreen';
import { LobbyScreen } from './pages/LobbyScreen';
import { SeatSelectionScreen } from './pages/SeatSelectionScreen';
import { FnBScreen } from './pages/FnBScreen';
import { PaymentScreen } from './pages/PaymentScreen';
import { ConfirmedScreen } from './pages/ConfirmedScreen';
import { ETicketScreen } from './pages/ETicketScreen';
import { ComingSoonScreen } from './pages/ComingSoonScreen';
import { NotFoundScreen } from './pages/NotFoundScreen';
import { JoinGroupModal } from './components/join/JoinGroupModal';

export const App: React.FC = () => {
  const { currentScreen } = useGroupSession();
  const [deepLinkCode, setDeepLinkCode] = useState<string | null>(null);

  // Deep Link Listener (?join=GTH-XXX or ?code=GTH-XXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join') || params.get('code');
    if (joinParam && joinParam.trim().length >= 4) {
      setDeepLinkCode(joinParam.trim());
    }
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'screen-home':
        return <HomeScreen />;
      case 'screen-showtimes':
        return <ShowtimeScreen />;
      case 'screen-create-group':
        return <CreateGroupScreen />;
      case 'screen-invite':
        return <InviteScreen />;
      case 'screen-lobby':
        return <LobbyScreen />;
      case 'screen-seats':
        return <SeatSelectionScreen />;
      case 'screen-fnb':
        return <FnBScreen />;
      case 'screen-payment':
        return <PaymentScreen />;
      case 'screen-confirmed':
        return <ConfirmedScreen />;
      case 'screen-ticket':
        return <ETicketScreen />;
      case 'screen-cinemas':
        return (
          <ComingSoonScreen
            tabId="cinemas"
            title="Rạp phim sắp ra mắt"
            description="Khám phá hệ thống rạp Galaxy Cinema, xem thông tin rạp, tiện ích và suất chiếu gần bạn."
          />
        );
      case 'screen-cinetag':
        return (
          <ComingSoonScreen
            tabId="cinetag"
            title="CineTag# sắp ra mắt"
            description="Không gian dành cho cộng đồng điện ảnh và những trải nghiệm thú vị cùng Galaxy."
          />
        );
      case 'screen-movies':
        return (
          <ComingSoonScreen
            tabId="movies"
            title="Điện ảnh sắp ra mắt"
            description="Cập nhật tin tức, nội dung và những câu chuyện thú vị xoay quanh thế giới điện ảnh."
          />
        );
      case 'screen-account':
        return (
          <ComingSoonScreen
            tabId="account"
            title="Tài khoản sắp ra mắt"
            description="Quản lý thông tin cá nhân, lịch sử đặt vé, ưu đãi và các trải nghiệm của bạn."
          />
        );
      case 'screen-not-found':
        return <NotFoundScreen />;
      default:
        return <NotFoundScreen />;
    }
  };

  return (
    <div className="phone" id="app">
      {renderScreen()}

      {/* Deep Link Join Modal */}
      {deepLinkCode && (
        <JoinGroupModal
          initialCode={deepLinkCode}
          onClose={() => setDeepLinkCode(null)}
        />
      )}
    </div>
  );
};
