import React from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { StatusBar } from '../components/common/StatusBar';
import { Header } from '../components/common/Header';
import { CountdownBanner } from '../components/common/CountdownBanner';
import { SimulationBar } from '../components/simulation/SimulationBar';

export const FnBScreen: React.FC = () => {
  const {
    goTo,
    goBack,
    mySeats,
    comboQty,
    updateComboQty,
    comboPrices,
  } = useGroupSession();

  const seatTotal = mySeats.length * 55000;
  const fnbTotal = Object.keys(comboQty).reduce(
    (sum, k) => sum + (comboQty[k] || 0) * (comboPrices[k] || 0),
    0
  );
  const total = seatTotal + fnbTotal;

  const formatMoney = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  const combos = [
    { id: 'c1', name: 'Combo 1', desc: '1 Bắp Ngọt 60oz + 1 Nước ngọt có gas 32oz', icon: '🍿', price: 115000 },
    { id: 'c2', name: 'Combo 2', desc: '1 Bắp Ngọt 60oz + 2 Nước ngọt có gas 32oz', icon: '🥤', price: 134000 },
    { id: 'c3', name: 'Combo Phô Mai', desc: '1 Bắp Phô Mai 60oz + 2 Nước ngọt 32oz', icon: '🧀', price: 149000 },
    { id: 'c4', name: 'Combo Nhóm 4 Người', desc: '2 Bắp Lớn + 4 Nước 32oz + 1 Snack', icon: '🎉', price: 229000 },
  ];

  return (
    <div className="screen">
      <StatusBar />
      <Header title="Bắp & Nước cá nhân" onBack={goBack} />

      <CountdownBanner initialSeconds={380} label="Thời gian chọn combo:" />
      <SimulationBar />

      <div className="body">
        <div className="section-heading">Bắp nước cá nhân của bạn</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 16px 8px' }}>
          Mỗi thành viên tự chọn combo yêu thích, tiền sẽ tính riêng
        </div>

        {combos.map((c) => (
          <div className="fnb-card" key={c.id}>
            <div className="fnb-img">{c.icon}</div>
            <div className="fnb-info">
              <div className="fnb-name">{c.name}</div>
              <div className="fnb-desc">{c.desc}</div>
              <div className="fnb-price">{formatMoney(c.price)}</div>
              <div className="stepper">
                <button className="stepper-btn" onClick={() => updateComboQty(c.id, -1)}>
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
      </div>

      <div className="bottom-bar">
        <div className="info">
          <div className="label">Tổng tiền phần bạn (Ghế + Bắp nước):</div>
          <div className="value">{formatMoney(total)}</div>
        </div>
        <button className="cta-primary" onClick={() => goTo('screen-payment')}>
          Thanh toán →
        </button>
      </div>
    </div>
  );
};
