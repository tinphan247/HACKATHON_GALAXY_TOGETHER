import React, { useState } from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { StatusBar } from '../components/common/StatusBar';
import { Header } from '../components/common/Header';
import type { PaymentMode } from '../types/session';

export const CreateGroupScreen: React.FC = () => {
  const { goTo, goBack, selectedShowtime, createGroup, currentUser } = useGroupSession();

  const [hostName, setHostName] = useState(currentUser?.name || 'Tín Phan');
  const [groupName, setGroupName] = useState('Friday Movie Night');
  const [memberCount, setMemberCount] = useState(4);
  const [payMode, setPayMode] = useState<PaymentMode>('split');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleMemberDelta = (delta: number) => {
    setMemberCount((prev) => Math.max(2, Math.min(8, prev + delta)));
  };

  const handleSubmit = async () => {
    if (!hostName.trim()) {
      setErrorMessage('Vui lòng nhập tên của bạn');
      return;
    }
    if (!groupName.trim()) {
      setErrorMessage('Vui lòng nhập tên nhóm');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const success = await createGroup(groupName, memberCount, payMode, hostName.trim());
    setIsSubmitting(false);

    if (success) {
      goTo('screen-invite');
    } else {
      setErrorMessage('Không thể tạo nhóm. Vui lòng thử lại.');
    }
  };

  return (
    <div className="screen">
      <StatusBar />
      <Header title="Tạo nhóm xem phim" onBack={goBack} />

      <div className="body">
        {/* Movie Info Card */}
        <div className="movie-info-card">
          <div className="title">{selectedShowtime.movieTitle}</div>
          <div className="meta">
            {selectedShowtime.cinemaName}
            <br />
            Thứ Hai, {selectedShowtime.showDate} • {selectedShowtime.showTime}
            <br />
            2D PHỤ ĐỀ • {selectedShowtime.screenName}
          </div>
        </div>

        <div className="section-heading" style={{ paddingTop: 4 }}>
          Thông tin nhóm
        </div>

        {/* Host Name Input */}
        <div className="form-group">
          <label className="form-label">Tên của bạn (Trưởng nhóm)</label>
          <input
            className="form-input"
            type="text"
            value={hostName}
            onChange={(e) => {
              setHostName(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="Nhập tên của bạn (VD: Tín Phan)"
            maxLength={40}
          />
        </div>

        {/* Group Name Input */}
        <div className="form-group">
          <label className="form-label">Tên nhóm</label>
          <input
            className="form-input"
            type="text"
            value={groupName}
            onChange={(e) => {
              setGroupName(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="Nhập tên nhóm (VD: Đi xem phim cuối tuần)"
            maxLength={60}
          />
          {errorMessage && <div className="form-error">{errorMessage}</div>}
        </div>

        {/* Member Count Stepper */}
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', padding: '0 16px 8px' }}>
          Số thành viên dự kiến (2 - 8 người)
        </div>
        <div className="counter-row">
          <div className="label">{memberCount} người</div>
          <div className="stepper">
            <button
              className="stepper-btn"
              onClick={() => handleMemberDelta(-1)}
              disabled={memberCount <= 2 || isSubmitting}
            >
              −
            </button>
            <span className="stepper-count">{memberCount}</span>
            <button
              className="stepper-btn"
              onClick={() => handleMemberDelta(1)}
              disabled={memberCount >= 8 || isSubmitting}
            >
              +
            </button>
          </div>
        </div>

        {/* Payment Mode */}
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', padding: '4px 16px 8px' }}>
          Hình thức thanh toán
        </div>
        <div className="radio-group">
          <div
            className={`radio-option ${payMode === 'split' ? 'selected' : ''}`}
            onClick={() => setPayMode('split')}
          >
            <div className={`radio-dot ${payMode === 'split' ? 'selected' : ''}`} />
            <div className="radio-text">
              <div className="title">Mỗi người tự thanh toán</div>
              <div className="desc">Mỗi thành viên tự thanh toán phần ghế và combo của mình</div>
            </div>
          </div>

          <div
            className={`radio-option ${payMode === 'host_pays' ? 'selected' : ''}`}
            onClick={() => setPayMode('host_pays')}
          >
            <div className={`radio-dot ${payMode === 'host_pays' ? 'selected' : ''}`} />
            <div className="radio-text">
              <div className="title">Người tạo nhóm thanh toán tất cả</div>
              <div className="desc">Trưởng nhóm thanh toán trọn gói, các thành viên thanh toán sau</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px 20px', background: 'var(--white)', borderTop: '1px solid var(--border)' }}>
        <button
          className="cta-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Đang tạo nhóm...' : '🎬 Tạo nhóm xem phim'}
        </button>
      </div>
    </div>
  );
};
