import React, { useState, useEffect } from 'react';
import { useGroupSession } from '../../context/GroupSessionContext';
import { groupSessionService } from '../../services/groupSessionService';
import type { InvitePreviewResponseData } from '../../types/api';

interface JoinGroupModalProps {
  initialCode: string;
  onClose: () => void;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({ initialCode, onClose }) => {
  const { joinGroup, goTo } = useGroupSession();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<InvitePreviewResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch preview when code changes
  useEffect(() => {
    if (!code || code.length < 4) return;
    setIsLoading(true);
    setError(null);

    groupSessionService
      .previewInvite(code)
      .then((data) => {
        setPreview(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Không tìm thấy thông tin nhóm');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên của bạn');
      return;
    }

    setIsJoining(true);
    setError(null);

    const success = await joinGroup(code, name.trim());
    setIsJoining(false);

    if (success) {
      onClose();
      // Remove query param from browser URL to avoid re-triggering modal on reload
      const url = new URL(window.location.href);
      url.searchParams.delete('join');
      url.searchParams.delete('code');
      window.history.replaceState({}, document.title, url.pathname);
      goTo('screen-seats');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ fontSize: 32 }}>🎬</div>
          <h3>Tham gia Galaxy Together</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Bạn được mời tham gia nhóm xem phim cùng bạn bè
          </p>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Đang tải thông tin nhóm...
          </div>
        ) : preview ? (
          <div className="movie-info-card" style={{ margin: '0 0 16px 0', padding: 12 }}>
            <div className="title" style={{ fontSize: 15 }}>{preview.session_name}</div>
            <div className="meta" style={{ fontSize: 12 }}>
              Phim: <strong>{preview.movie_title}</strong><br />
              Rạp: {preview.cinema_name}<br />
              Suất: {preview.show_time} • {preview.show_date}<br />
              Thành viên: {preview.current_members} / {preview.max_members} người
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ padding: 0, marginBottom: 12 }}>
            <label className="form-label">Mã nhóm</label>
            <input
              className="form-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VD: GTH-786"
              maxLength={10}
              required
            />
          </div>

          <div className="form-group" style={{ padding: 0, marginBottom: 16 }}>
            <label className="form-label">Tên của bạn</label>
            <input
              className="form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên bạn (VD: Minh, An...)"
              autoFocus
              required
            />
          </div>

          {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="cta-primary secondary"
              style={{ flex: 1, padding: '12px 16px', fontSize: 14 }}
              onClick={onClose}
              disabled={isJoining}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="cta-primary"
              style={{ flex: 2, padding: '12px 16px', fontSize: 14 }}
              disabled={isJoining}
            >
              {isJoining ? 'Đang tham gia...' : 'Tham gia nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
