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
      default:
        return <HomeScreen />;
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
