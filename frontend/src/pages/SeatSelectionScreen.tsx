import React from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { useToast } from '../context/ToastContext';
import { StatusBar } from '../components/common/StatusBar';
import { Header } from '../components/common/Header';
import { CountdownBanner } from '../components/common/CountdownBanner';
import { SimulationBar } from '../components/simulation/SimulationBar';
import { getMemberColor } from '../constants/theme';

export const SeatSelectionScreen: React.FC = () => {
  const {
    goTo,
    goBack,
    sessionData,
    currentUser,
    displayMembers,
    heldSeats,
    mySeats,
    toggleSeat,
  } = useGroupSession();
  const { showToast } = useToast();

  const rows = ['O', 'N', 'M', 'L', 'K', 'J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
  const seatsPerRow = 10;
  const soldSeats = ['A3', 'A4', 'B5', 'C2', 'D7', 'D8', 'E1', 'F3', 'F4', 'F9', 'H2', 'H3', 'I5', 'J6'];
  const vipRows = ['D', 'E', 'F'];

  const count = mySeats.length;
  const total = count * 55000;

  const activeMembers = displayMembers.filter((m) => m.status !== 'EMPTY');

  const formatMoney = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  return (
    <div className="screen">
      <StatusBar />
      <Header
        title={sessionData?.cinema_name || 'Galaxy Nguyễn Văn Quá'}
        onBack={goBack}
        rightAction={
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600 }}>
            {sessionData?.show_time || '21:00'} ▾
          </div>
        }
      />

      <CountdownBanner initialSeconds={480} label="Thời gian giữ ghế:" />

      {/* Group Context Bar with Dynamic Member Avatars */}
      <div className="group-ctx" style={{ padding: '7px 16px' }}>
        <div className="icon" style={{ fontSize: 14 }}>🎬</div>
        <div className="info">
          <div className="name" style={{ fontSize: 12 }}>
            {sessionData?.name || 'Friday Movie Night'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {activeMembers.map((m) => (
            <div
              key={m.slot}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: m.colorHex,
                border: '2px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 700,
                color: 'white',
              }}
              title={m.name}
            >
              {m.name ? m.name.charAt(0).toUpperCase() : 'M'}
            </div>
          ))}
        </div>
      </div>

      <SimulationBar />

      <div className="body">
        {/* Seat Map */}
        <div className="seat-map-container">
          <div className="screen-label">MÀN HÌNH</div>
          <div className="screen-bar" />
          <div className="seat-grid">
            {rows.map((row, ri) => (
              <React.Fragment key={row}>
                {ri === 12 && <div className="aisle" />}
                <div className="seat-row">
                  <div className="row-label">{row}</div>
                  {Array.from({ length: seatsPerRow }, (_, idx) => {
                    const c = idx + 1;
                    const seatId = `${row}${c}`;
                    const isSold = soldSeats.includes(seatId);
                    const holdInfo = heldSeats[seatId];
                    const isMine = holdInfo && holdInfo.userId === currentUser?.userId;
                    const isOtherHold = holdInfo && !isMine;
                    const isVip = vipRows.includes(row);

                    let seatClass = 'seat';
                    let seatText = '';
                    const seatStyle: React.CSSProperties = {};

                    if (isSold) {
                      seatClass += ' sold';
                    } else if (isMine) {
                      seatClass += ' my-seat';
                      seatText = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '✓';
                    } else if (isOtherHold) {
                      seatClass += ' held-other';
                      const member = sessionData?.members?.find(
                        (m) => m.user_id === holdInfo.userId || (holdInfo.memberName && m.name.toLowerCase() === holdInfo.memberName.toLowerCase())
                      );
                      const memberIdx = sessionData?.members?.findIndex(
                        (m) => m.user_id === holdInfo.userId || (holdInfo.memberName && m.name.toLowerCase() === holdInfo.memberName.toLowerCase())
                      ) ?? -1;
                      const assignedColor = getMemberColor(memberIdx >= 0 ? memberIdx : 1);
                      const bg = holdInfo.colorHex || assignedColor.hex;
                      const memberName = holdInfo.memberName || member?.name || 'Bạn khác';
                      seatText = memberName.charAt(0).toUpperCase();
                      seatStyle.background = bg;
                      seatStyle.borderColor = bg;
                      seatStyle.color = '#FFFFFF';
                    } else {
                      seatClass += ' available';
                      if (isVip) {
                        seatStyle.borderColor = 'var(--gold)';
                      }
                    }

                    const tooltipText = isSold
                      ? `Ghế ${seatId} - Đã bán`
                      : isMine
                      ? `Ghế ${seatId} - Bạn đang chọn`
                      : isOtherHold
                      ? `Ghế ${seatId} - ${holdInfo.memberName || 'Bạn khác'} đang chọn`
                      : `Ghế ${seatId} - Còn trống`;

                    return (
                      <div
                        key={seatId}
                        className={seatClass}
                        style={seatStyle}
                        title={tooltipText}
                        onClick={() => {
                          if (isSold) {
                            showToast(`Ghế ${seatId} đã bán`);
                            return;
                          }
                          if (isOtherHold) {
                            showToast(`Ghế ${seatId} đang được ${holdInfo.memberName || 'bạn khác'} chọn`);
                            return;
                          }
                          toggleSeat(seatId);
                        }}
                      >
                        {seatText}
                      </div>
                    );
                  })}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Dynamic Legend */}
        <div className="seat-legend">
          <div className="legend-item"><div className="legend-box" style={{ border: '1.5px solid #CCC' }} />Ghế đơn</div>
          <div className="legend-item"><div className="legend-box" style={{ border: '1.5px solid var(--gold)' }} />Ghế VIP</div>
          <div className="legend-item"><div className="legend-box" style={{ background: 'var(--sold)' }} />Đã bán</div>
          {activeMembers.map((m) => (
            <div className="legend-item" key={m.slot}>
              <div className="legend-box" style={{ background: m.colorHex }} />
              {m.userId === currentUser?.userId ? `${m.name} (Bạn)` : m.name}
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Group Seat Summary */}
      <div className="group-seat-summary">
        <div className="title">Vị trí nhóm ({activeMembers.length} người)</div>
        {activeMembers.map((m) => {
          const memberHeld = Object.values(heldSeats)
            .filter((s) => s.userId === m.userId || (m.name && s.memberName?.toLowerCase() === m.name.toLowerCase()))
            .map((s) => s.seatCode || s.seatId);

          return (
            <div className="gss-row" key={m.slot}>
              <div className="gss-dot" style={{ background: m.colorHex }} />
              <div className="gss-name">
                {m.name} {m.userId === currentUser?.userId ? '(Bạn)' : ''}
              </div>
              <div className="gss-seats">
                {memberHeld.length > 0 ? memberHeld.join(', ') : 'Chưa chọn'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Bar */}
      <div className="bottom-bar">
        <div className="info">
          <div className="label">{count > 0 ? `${count}x ghế: ${mySeats.join(', ')}` : 'Chưa chọn ghế'}</div>
          <div className="value">{count > 0 ? formatMoney(total) : '0đ'}</div>
        </div>
        <button
          className="cta-primary"
          disabled={count === 0}
          onClick={() => goTo('screen-fnb')}
        >
          Tiếp tục →
        </button>
      </div>
    </div>
  );
};

