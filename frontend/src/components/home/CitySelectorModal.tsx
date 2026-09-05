import React from 'react';

interface CitySelectorModalProps {
  isOpen: boolean;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  onClose: () => void;
}

const CITIES = [
  { id: 'hcm', name: 'TP Hồ Chí Minh', cinemasCount: 12 },
  { id: 'hn', name: 'Hà Nội', cinemasCount: 8 },
  { id: 'dn', name: 'Đà Nẵng', cinemasCount: 3 },
  { id: 'hp', name: 'Hải Phòng', cinemasCount: 2 },
  { id: 'bd', name: 'Bình Dương', cinemasCount: 3 },
  { id: 'ct', name: 'Cần Thơ', cinemasCount: 2 },
  { id: 'vt', name: 'Vũng Tàu', cinemasCount: 1 },
];

export const CitySelectorModal: React.FC<CitySelectorModalProps> = ({
  isOpen,
  selectedCity,
  onSelectCity,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="city-modal-overlay" onClick={onClose}>
      <div className="city-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="city-modal-handle" />
        <div className="city-modal-header">
          <div className="city-modal-title">Chọn Tỉnh / Thành phố</div>
          <button className="city-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="city-modal-list">
          {CITIES.map((c) => {
            const isSelected = selectedCity === c.name;
            return (
              <div
                key={c.id}
                className={`city-item ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onSelectCity(c.name);
                  onClose();
                }}
              >
                <div className="city-item-info">
                  <span className="city-name">{c.name}</span>
                  <span className="city-count">{c.cinemasCount} rạp Galaxy</span>
                </div>
                {isSelected && <span className="city-check">✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
