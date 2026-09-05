import React from 'react';

interface TogetherPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExplore: () => void;
}

export const TogetherPopupModal: React.FC<TogetherPopupModalProps> = ({
  isOpen,
  onClose,
  onExplore,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="together-popup-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="together-popup-dialog together-pure-poster-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút '✕' duy nhất để đóng popup */}
        <button
          type="button"
          className="together-popup-close"
          onClick={onClose}
          aria-label="Đóng popup"
        >
          ✕
        </button>

        {/* Tấm Poster Galaxy Together duy nhất */}
        <div
          className="together-popup-poster-container"
          onClick={onExplore}
          title="Nhấp để khám phá Galaxy Together"
        >
          <img
            src="/banners/popup_together.jpg"
            alt="Galaxy Together - Đặt vé nhóm cùng nhau"
            className="together-popup-poster-pure"
          />
        </div>
      </div>
    </div>
  );
};
