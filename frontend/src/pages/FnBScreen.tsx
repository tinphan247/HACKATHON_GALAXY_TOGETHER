import React from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { Header } from '../components/common/Header';
import { CountdownBanner } from '../components/common/CountdownBanner';

interface FnBProductItem {
  id: string;
  name: string;
  desc: string;
  price: number;
  image: string;
}

const COMBOS: FnBProductItem[] = [
  {
    id: 'c2',
    name: 'Combo 2 Big Extra',
    desc: 'Nhân đôi sự sảng khoái! Combo gồm 1 bắp rang bơ lớn 60oz, 2 Pepsi cỡ lớn 32oz + 1 snack khoai tây giòn rụm',
    price: 134000,
    image: '/combos/combo_2_big_extra.jpg',
  },
  {
    id: 'c1',
    name: 'Combo 1 Big Extra',
    desc: 'Thỏa mãn cơn thèm bắp nước! Combo gồm 1 bắp rang bơ lớn 60oz, 1 Pepsi 32oz + 1 snack thơm ngon',
    price: 115000,
    image: '/combos/combo_1_big_extra.jpg',
  },
  {
    id: 'c3',
    name: 'Combo 3',
    desc: 'Chia sẻ niềm vui trọn vẹn với 1 bắp phô mai đặc biệt 60oz vàng óng kèm 2 ly Pepsi 32oz',
    price: 149000,
    image: '/combos/combo_cheese.jpg',
  },
  {
    id: 'c4',
    name: 'Combo 4',
    desc: 'Thêm bạn thêm vui! Combo tiết kiệm cho nhóm gồm 2 bắp lớn 60oz, 4 ly Pepsi 32oz và 2 snack',
    price: 229000,
    image: '/combos/combo_group_4.jpg',
  },
  {
    id: 'c5',
    name: 'Combo 2 Big',
    desc: 'Nhân đôi sự sảng khoái tiêu chuẩn với 1 bắp rang bơ lớn 60oz và 2 ly Pepsi 22oz vừa vặn cho 2 người',
    price: 109000,
    image: '/combos/combo_2_big.jpg',
  },
];

export const FnBScreen: React.FC = () => {
  const {
    goTo,
    goBack,
    mySeats,
    comboQty,
    updateComboQty,
    comboPrices,
    groupFnBSummary,
    currentUser,
    selectedShowtime,
    holdExpiresAt,
    isGroupMode,
    sessionData,
  } = useGroupSession();

  const standardPrice = selectedShowtime?.ticketPriceStandard || 55000;
  const vipPrice = selectedShowtime?.ticketPriceVip || 65000;
  const vipRows = ['D', 'E', 'F'];

  const seatTotal = mySeats.reduce((sum, s) => {
    const row = s.charAt(0);
    return sum + (vipRows.includes(row) ? vipPrice : standardPrice);
  }, 0);

  const fnbTotal = Object.keys(comboQty).reduce(
    (sum, k) => sum + (comboQty[k] || 0) * (comboPrices[k] || 0),
    0
  );

  const total = seatTotal + fnbTotal;
  const formatMoney = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  const isHostPays =
    isGroupMode &&
    ((sessionData?.payment_mode as string) === 'host_pays' ||
      sessionData?.payment_mode === 'HOST_PAYS_ALL');

  const handleNext = () => {
    if (isHostPays) {
      goTo('screen-confirmed');
    } else {
      goTo('screen-payment');
    }
  };

  return (
    <div className="screen" style={{ background: '#F5F5F5' }}>
      <Header title="Chọn combo" onBack={goBack} />

      <CountdownBanner
        initialSeconds={397}
        label="Thời gian giữ ghế:"
        expiresAt={holdExpiresAt}
      />

      <div className="body" style={{ padding: '16px 0 16px 0', background: '#F5F5F5' }}>
        {COMBOS.map((combo) => {
          const qty = comboQty[combo.id] || 0;

          // Check if other members in the group already picked this combo to prevent duplicate orders
          const otherMembersWhoSelected = (groupFnBSummary?.members || [])
            .filter((m) => m.userId !== currentUser?.userId)
            .map((m) => {
              const item = m.items?.find((it) => it.comboId === combo.id);
              if (item && item.quantity > 0) {
                return `${m.memberName} chọn ×${item.quantity}`;
              }
              return null;
            })
            .filter((text): text is string => Boolean(text));

          const duplicateNote =
            otherMembersWhoSelected.length > 0
              ? `Đã được ${otherMembersWhoSelected.join(', ')}`
              : null;

          return (
            <div className="fnb-card" key={combo.id}>
              <img
                src={combo.image}
                alt={combo.name}
                className="fnb-img"
                loading="lazy"
              />

              <div className="fnb-info">
                <div className="fnb-top-row">
                  <div className="fnb-name" title={combo.name}>
                    {combo.name}
                  </div>
                  <div className="stepper">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => updateComboQty(combo.id, -1)}
                      disabled={qty === 0}
                      aria-label="Giảm số lượng"
                    >
                      −
                    </button>
                    <span className="stepper-count">{qty}</span>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => updateComboQty(combo.id, 1)}
                      aria-label="Tăng số lượng"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="fnb-desc" title={combo.desc}>
                  {combo.desc}
                </div>

                <div className="fnb-price">{formatMoney(combo.price)}</div>

                {duplicateNote && (
                  <div>
                    <span className="fnb-duplicate-tag">
                      {duplicateNote}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fnb-sticky-bottom">
        <div className="fnb-bottom-summary">
          <div className="fnb-bottom-seats">
            {mySeats.length > 0
              ? `${mySeats.length}x ghế: ${mySeats.join(', ')}`
              : '2x ghế: G9, G8'}
          </div>
          <div className="fnb-bottom-total">
            Tổng Cộng:
            <span className="fnb-bottom-total-num">{formatMoney(total > 0 ? total : 100000)}</span>
          </div>
        </div>
        <button
          type="button"
          className="fnb-bottom-cta"
          onClick={handleNext}
        >
          {isHostPays ? 'Xác nhận' : 'Tiếp tục'}
        </button>
      </div>
    </div>
  );
};
