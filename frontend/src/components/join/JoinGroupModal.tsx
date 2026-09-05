import React, { useState, useEffect } from 'react';
import { useGroupSession } from '../../context/GroupSessionContext';
import { groupSessionService } from '../../services/groupSessionService';
import { movieRepository } from '../../services/data/movieRepository';
import type { InvitePreviewResponseData } from '../../types/api';
import type { Movie } from '../../types/booking';

interface JoinGroupModalProps {
  initialCode: string;
  onClose: () => void;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({ initialCode, onClose }) => {
  const { joinGroup, goTo } = useGroupSession();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<InvitePreviewResponseData | null>(null);
  const [movieDetail, setMovieDetail] = useState<Movie | null>(null);
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
      .then(async (data) => {
        setPreview(data);
        // Look up movie details for poster & age rating
        if (data.movie_id) {
          const m = await movieRepository.getMovieById(data.movie_id);
          if (m) {
            setMovieDetail(m);
            return;
          }
        }
        if (data.movie_title) {
          const m = await movieRepository.getMovieByTitle(data.movie_title);
          if (m) {
            setMovieDetail(m);
          }
        }
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

  const posterUrl = movieDetail?.poster || '/posters/poster_quytuvuotgiau.jpg';
  const ageRating = movieDetail?.ageRating || 'T18';
  const hostName = preview?.host_name || 'bạn bè';

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 360, padding: '20px 18px' }}>
        {/* Header: Clean typography, no movie logo/emoji */}
        <div className="modal-header" style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0B3B60', margin: 0 }}>
            Tham gia Galaxy Together
          </h3>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 5, lineHeight: 1.4 }}>
            Bạn được mời tham gia nhóm xem phim của <strong style={{ color: '#0B3B60' }}>{hostName}</strong>
          </p>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Đang tải thông tin nhóm...
          </div>
        ) : preview ? (
          /* Movie Info Card with Poster & Age Rating matching CreateGroupScreen */
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 16,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              textAlign: 'left',
            }}
          >
            {/* Poster phim 2:3 */}
            <img
              src={posterUrl}
              alt={preview.movie_title || 'Phim'}
              style={{
                width: 52,
                height: 74,
                borderRadius: 6,
                objectFit: 'cover',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/posters/poster_quytuvuotgiau.jpg';
              }}
            />

            {/* Chi tiết phim & độ tuổi */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span
                  style={{
                    backgroundColor: '#F97316',
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '1.5px 5px',
                    borderRadius: 3,
                    lineHeight: 1.2,
                    flexShrink: 0,
                  }}
                >
                  {ageRating}
                </span>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#0B3B60',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={preview.movie_title}
                >
                  {preview.movie_title}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {preview.cinema_name}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: '#64748B',
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                {preview.show_date} • {preview.show_time}
                <br />
                {preview.screen_name || 'Phòng chiếu'} • {preview.current_members}/{preview.max_members} thành viên
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ padding: 0, marginBottom: 12 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
              Mã nhóm
            </label>
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
            <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
              Tên của bạn
            </label>
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
