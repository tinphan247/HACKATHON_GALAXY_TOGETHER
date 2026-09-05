import React from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { StatusBar } from '../components/common/StatusBar';
import { Header } from '../components/common/Header';
import { CountdownBanner } from '../components/common/CountdownBanner';
import { SimulationBar } from '../components/simulation/SimulationBar';
import { getMemberColorByKey } from '../constants/theme';

export const FnBScreen: React.FC = () => {
  const {
    goTo,
    goBack,
    mySeats,
    comboQty,
    updateComboQty,
    comboPrices,
    groupFnBSummary,
    sessionData,
    currentUser,
  } = useGroupSession();

  const seatTotal = mySeats.length * 55000;
  const fnbTotal = Object.keys(comboQty).reduce(
    (sum, k) => sum + (comboQty[k] || 0) * (comboPrices[k] || 0),
    0
  );
  const total = seatTotal + fnbTotal;

  const formatMoney = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  const combos = [
    { id: 'c1', name: 'Combo 1 Big Extra', desc: '1 Bắp Ngọt 60oz + 1 Nước ngọt có gas 32oz', icon: '🍿', price: 115000 },
    { id: 'c2', name: 'Combo 2 Big Extra', desc: '1 Bắp Ngọt 60oz + 2 Nước ngọt có gas 32oz', icon: '🥤', price: 134000 },
    { id: 'c3', name: 'Combo Phô Mai', desc: '1 Bắp Phô Mai 60oz + 2 Nước ngọt 32oz', icon: '🧀', price: 149000 },
    { id: 'c4', name: 'Combo Nhóm 4 Người', desc: '2 Bắp Lớn + 4 Nước 32oz + 1 Snack', icon: '🎉', price: 229000 },
  ];

  // Members list from summary or sessionData
  const activeMembers = sessionData?.members || [];
  const memberCount = activeMembers.length || 1;
  const totalFnBItems = groupFnBSummary?.totalGroupItemsCount || 0;
  const hasMultipleBigCombos = (groupFnBSummary?.aggregatedItems || []).some(
    (item) => (item.comboId === 'c4' && item.totalQuantity >= 1) || (item.comboId === 'c2' && item.totalQuantity >= 2)
  );

  return (
    <div className="screen">
      <StatusBar />
      <Header title="Bắp & Nước cá nhân" onBack={goBack} />

      <CountdownBanner initialSeconds={380} label="Thời gian chọn combo:" />
      <SimulationBar />

      <div className="body" style={{ paddingBottom: 90 }}>
        {/* Section: Individual Combos */}
        <div className="section-heading">Bắp nước cá nhân của bạn</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 16px 8px' }}>
          Mỗi thành viên tự chọn combo yêu thích, tiền sẽ tính riêng và cập nhật tức thì.
        </div>

        {combos.map((c) => (
          <div className="fnb-card" key={c.id}>
            <div className="fnb-img">{c.icon}</div>
            <div className="fnb-info">
              <div className="fnb-name">{c.name}</div>
              <div className="fnb-desc">{c.desc}</div>
              <div className="fnb-price">{formatMoney(c.price)}</div>
              <div className="stepper">
                <button
                  className="stepper-btn"
                  onClick={() => updateComboQty(c.id, -1)}
                  disabled={!comboQty[c.id]}
                  style={{ opacity: !comboQty[c.id] ? 0.4 : 1 }}
                >
                  −
                </button>
                <span className="stepper-count">{comboQty[c.id] || 0}</span>
                <button className="stepper-btn" onClick={() => updateComboQty(c.id, 1)}>
                  +
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Section: Group F&B Summary (Anti-duplication) */}
        <div
          className="section-heading"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 18,
          }}
        >
          <span>Tóm tắt F&B nhóm</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--orange)',
              background: 'rgba(245, 128, 32, 0.12)',
              padding: '3px 8px',
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            🛡️ Chống mua trùng
          </span>
        </div>

        <div style={{ padding: '0 16px 16px' }}>
          <div
            className="card"
            style={{
              margin: 0,
              padding: 14,
              background: 'var(--white)',
              border: '1.5px solid var(--border)',
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Đơn hàng tổng hợp cả nhóm — xem bạn bè đã chọn gì để không mua thừa:
            </div>

            {/* Member rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeMembers.map((member) => {
                const color = getMemberColorByKey(member.color_slot);
                const isMe = member.user_id === currentUser?.userId;

                // Lookup this member's F&B items in summary
                const memberSummary = groupFnBSummary?.members?.find(
                  (m) => m.userId === member.user_id || m.memberId === member.id
                );

                let fnbLabel = 'Chưa chọn bắp nước';
                let fnbAmount = 0;

                if (isMe) {
                  // For current user, also reflect local optimistic comboQty
                  const myItemStrings: string[] = [];
                  let myLocalTotal = 0;
                  combos.forEach((c) => {
                    const q = comboQty[c.id] || 0;
                    if (q > 0) {
                      myItemStrings.push(`${c.name} × ${q}`);
                      myLocalTotal += q * c.price;
                    }
                  });
                  if (myItemStrings.length > 0) {
                    fnbLabel = myItemStrings.join(', ');
                    fnbAmount = myLocalTotal;
                  } else {
                    fnbLabel = 'Đang chọn...';
                  }
                } else if (memberSummary && memberSummary.items.length > 0) {
                  fnbLabel = memberSummary.items.map((i) => `${i.comboName} × ${i.quantity}`).join(', ');
                  fnbAmount = memberSummary.totalAmount;
                } else {
                  fnbLabel = 'Không dùng combo';
                }

                return (
                  <div
                    key={member.id || member.user_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      paddingBottom: 8,
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: color.hex,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ width: 68, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {member.name} {isMe ? '(Bạn)' : ''}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: fnbAmount > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: fnbAmount > 0 ? 500 : 400,
                      }}
                    >
                      {fnbLabel}
                    </div>
                    {fnbAmount > 0 && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>
                        {formatMoney(fnbAmount)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Aggregate Group Chips */}
            {groupFnBSummary && groupFnBSummary.aggregatedItems.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: '1px dashed var(--border)',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>
                  🍿 TỔNG F&B CẢ PHÒNG ({totalFnBItems} phần — {formatMoney(groupFnBSummary.totalGroupAmount)}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {groupFnBSummary.aggregatedItems.map((item) => (
                    <span
                      key={item.comboId}
                      style={{
                        fontSize: 11,
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {item.comboName}: <strong style={{ color: 'var(--orange)' }}>×{item.totalQuantity}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Smart Anti-Duplication Advice */}
            <div
              style={{
                marginTop: 12,
                padding: '8px 10px',
                borderRadius: 8,
                fontSize: 11,
                lineHeight: 1.4,
                background: totalFnBItems > memberCount || hasMultipleBigCombos ? '#FFF7ED' : '#F0F9FF',
                border: totalFnBItems > memberCount || hasMultipleBigCombos ? '1px solid #FFEDD5' : '1px solid #E0F2FE',
                color: totalFnBItems > memberCount || hasMultipleBigCombos ? '#9A3412' : '#0369A1',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
              }}
            >
              <span>{totalFnBItems > memberCount || hasMultipleBigCombos ? '⚠️' : '💡'}</span>
              <span>
                {totalFnBItems > memberCount || hasMultipleBigCombos
                  ? `Nhóm có ${memberCount} người nhưng đang chọn ${totalFnBItems} phần bắp nước. Các bạn có thể chia sẻ combo lớn cùng nhau để tiết kiệm chi phí!`
                  : 'Mỗi bạn tự chọn phần ăn riêng của mình. Bảng này hiển thị realtime để cả nhóm không ai đặt trùng combo!'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Total per Member & Continue */}
      <div className="bottom-bar">
        <div className="info">
          <div className="label">
            Phần của bạn ({mySeats.length} ghế + {Object.values(comboQty).reduce((a, b) => a + b, 0)} combo):
          </div>
          <div className="value">{formatMoney(total)}</div>
        </div>
        <button className="cta-primary" onClick={() => goTo('screen-payment')}>
          Thanh toán →
        </button>
      </div>
    </div>
  );
};
