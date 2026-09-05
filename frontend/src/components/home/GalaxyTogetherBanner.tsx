import React from 'react';

interface GalaxyTogetherBannerProps {
  onActionClick: () => void;
}

export const GalaxyTogetherBanner: React.FC<GalaxyTogetherBannerProps> = ({
  onActionClick,
}) => {
  return (
    <section className="together-promo-card" onClick={onActionClick}>
      <div className="together-promo-content">
        <div className="together-tag-row">
          <span className="together-icon">🎬</span>
          <span className="together-tag-title">GALAXY TOGETHER</span>
          <span className="together-new-pill">MỚI</span>
        </div>

        <h4 className="together-headline">Đặt vé nhóm cùng nhau</h4>

        <p className="together-desc">
          Mỗi người chọn ghế, chọn combo và tự thanh toán — không ai phải ứng tiền.
        </p>

        <div className="together-action-row">
          <button
            type="button"
            className="together-cta-btn"
            onClick={(e) => {
              e.stopPropagation();
              onActionClick();
            }}
          >
            Thử ngay →
          </button>
        </div>
      </div>

      <div className="together-visual-decor" aria-hidden="true">
        <div className="decor-circle-outer">
          <div className="decor-circle-inner">
            <span className="decor-emoji">🍿</span>
          </div>
        </div>
      </div>
    </section>
  );
};
