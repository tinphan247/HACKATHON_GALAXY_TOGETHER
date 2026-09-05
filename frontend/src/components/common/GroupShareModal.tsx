import React from 'react';
import { RealQrCode } from './RealQrCode';
import { useToast } from '../../context/ToastContext';
import { useGroupSession } from '../../context/GroupSessionContext';

interface GroupShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupShareModal: React.FC<GroupShareModalProps> = ({ isOpen, onClose }) => {
  const { inviteCode, sessionData, selectedShowtime } = useGroupSession();
  const { showToast } = useToast();

  if (!isOpen) return null;

  const code = inviteCode || sessionData?.invite?.code || 'GTH-691';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://galaxycine.vn';
  const joinUrl = `${origin}/?join=${code}`;

  // Dynamic showtime & movie details from state
  const movieTitle = sessionData?.movie_title || selectedShowtime?.movieTitle || 'Chi tiết phim';
  const cinemaName = sessionData?.cinema_name || selectedShowtime?.cinemaName || 'Galaxy Cinema';
  const showDate = sessionData?.show_date || selectedShowtime?.showDate || '';
  const showTime = sessionData?.show_time || selectedShowtime?.showTime || '21:00';
  const screenName = sessionData?.screen_name || selectedShowtime?.screenName || 'Phòng chiếu';
  const posterUrl = selectedShowtime?.moviePoster || '/posters/poster_quytuvuotgiau.jpg';
  const ageRating = selectedShowtime?.movieAgeRating || 'T18';
  const formatText = selectedShowtime?.format || '2D PHỤ ĐỀ';

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(joinUrl);
      }
      showToast('Đã sao chép link nhóm');
    } catch {
      showToast(`Link nhóm: ${joinUrl}`);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Galaxy Together - ${movieTitle}`,
          text: `Cùng đặt vé xem phim "${movieTitle}" tại ${cinemaName} suất ${showTime}. Mã nhóm: ${code}`,
          url: joinUrl,
        });
      } catch {
        // User dismissed share sheet
      }
    } else {
      handleCopyLink();
    }
  };

  const handleMessengerShare = () => {
    const webMessengerUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(joinUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(joinUrl)}`;
    try {
      window.open(webMessengerUrl, '_blank');
    } catch {
      handleCopyLink();
    }
  };

  const handleZaloShare = () => {
    const zaloUrl = `https://zalo.me/share?url=${encodeURIComponent(joinUrl)}`;
    try {
      window.open(zaloUrl, '_blank');
    } catch {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Cùng đặt vé xem phim "${movieTitle}" tại ${cinemaName} (${showTime} - ${showDate}). Mã nhóm: ${code}\nLink: ${joinUrl}`
    );
    const waUrl = `https://api.whatsapp.com/send?text=${text}`;
    try {
      window.open(waUrl, '_blank');
    } catch {
      handleCopyLink();
    }
  };

  const handleSmsShare = () => {
    const text = encodeURIComponent(
      `Cùng xem phim "${movieTitle}" tại ${cinemaName} suất ${showTime}. Mã: ${code}. Link: ${joinUrl}`
    );
    const smsUrl = `sms:?body=${text}`;
    try {
      window.location.href = smsUrl;
    } catch {
      handleCopyLink();
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(11, 28, 48, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflow: 'hidden',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'calc(100% - 32px)',
          maxWidth: 335,
          maxHeight: '88%',
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 16px 36px -6px rgba(11, 28, 48, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #E2E8F0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER: MÀU CAM THEO STYLE GALAXYCINE.VN */}
        <div
          style={{
            backgroundColor: '#FF6600',
            background: 'linear-gradient(135deg, #FF6600 0%, #F97316 100%)',
            padding: '14px 16px',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '1.2px',
                color: 'rgba(255, 255, 255, 0.9)',
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
            >
              GALAXY TOGETHER
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '0.2px',
              }}
            >
              MỜI BẠN VÀO NHÓM
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE NẾU MÀN HÌNH NHỎ) */}
        <div
          style={{
            padding: '14px 16px 16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {/* THÔNG TIN SUẤT CHIẾU CÓ POSTER PHIM & ĐỘ TUỔI */}
          <div
            style={{
              width: '100%',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '10px 12px',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              textAlign: 'left',
              marginBottom: 12,
            }}
          >
            {/* Poster phim 2:3 */}
            <img
              src={posterUrl}
              alt={movieTitle}
              style={{
                width: 48,
                height: 68,
                borderRadius: 6,
                objectFit: 'cover',
                flexShrink: 0,
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.12)',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/posters/poster_quytuvuotgiau.jpg';
              }}
            />

            {/* Chi tiết phim & độ tuổi */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <span
                  style={{
                    backgroundColor: '#F97316',
                    color: '#FFFFFF',
                    fontSize: 9.5,
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
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#0B3B60',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={movieTitle}
                >
                  {movieTitle}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {cinemaName}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#64748B',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {showDate} • {showTime} • {formatText} • {screenName}
              </div>
            </div>
          </div>

          {/* THÔNG ĐIỆP CHÍNH */}
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: '#334155',
              lineHeight: 1.4,
              marginBottom: 10,
            }}
          >
            Quét mã để tham gia nhóm
            <br />
            hoặc chia sẻ link nhóm
          </div>

          {/* QR CODE */}
          <div
            style={{
              padding: 8,
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 6,
            }}
          >
            <RealQrCode value={joinUrl} size={130} />
          </div>

          {/* MÃ NHÓM HIỂN THỊ DƯỚI QR - KHÔNG CÓ NÚT SAO CHÉP */}
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', letterSpacing: 0.5 }}>
              MÃ NHÓM:{' '}
            </span>
            <span
              style={{
                fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: 15,
                fontWeight: 800,
                color: '#0B3B60',
                letterSpacing: 1.5,
              }}
            >
              {code}
            </span>
          </div>

          {/* LINK NHÓM - NÚT SAO CHÉP ĐƯỜNG DẪN */}
          <div style={{ width: '100%', marginBottom: 14 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#64748B',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                marginBottom: 3,
                textAlign: 'left',
              }}
            >
              LINK NHÓM
            </div>
            <div
              onClick={handleCopyLink}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '6px 10px',
                gap: 6,
                cursor: 'pointer',
              }}
              title="Nhấn để sao chép liên kết"
            >
              <span
                style={{
                  fontSize: 11.5,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'left',
                  flex: 1,
                  fontFamily: 'inherit',
                }}
              >
                {joinUrl}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLink();
                }}
                aria-label="Sao chép link"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F97316',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>

          {/* SOCIAL SHARING ICONS ROW */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 2,
              paddingBottom: 2,
            }}
          >
            {/* 1. Sao chép link */}
            <div
              onClick={handleCopyLink}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0B3B60',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EEF2F6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                title="Sao chép link"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <span style={{ fontSize: 9.5, color: '#64748B', fontWeight: 500, marginTop: 4 }}>
                Sao chép
              </span>
            </div>

            {/* 2. Messenger */}
            <div
              onClick={handleMessengerShare}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0B3B60',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EEF2F6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                title="Gửi qua Messenger"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  <path d="M8 12.5l3-2.5 2 2.5 3-3" strokeWidth="1.8" />
                </svg>
              </div>
              <span style={{ fontSize: 9.5, color: '#64748B', fontWeight: 500, marginTop: 4 }}>
                Messenger
              </span>
            </div>

            {/* 3. Zalo */}
            <div
              onClick={handleZaloShare}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0B3B60',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EEF2F6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                title="Gửi qua Zalo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <path d="M8 9h8l-8 6h8" strokeWidth="1.8" />
                </svg>
              </div>
              <span style={{ fontSize: 9.5, color: '#64748B', fontWeight: 500, marginTop: 4 }}>
                Zalo
              </span>
            </div>

            {/* 4. WhatsApp */}
            <div
              onClick={handleWhatsAppShare}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0B3B60',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EEF2F6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                title="Gửi qua WhatsApp"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <span style={{ fontSize: 9.5, color: '#64748B', fontWeight: 500, marginTop: 4 }}>
                WhatsApp
              </span>
            </div>

            {/* 5. Tin nhắn */}
            <div
              onClick={handleSmsShare}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0B3B60',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EEF2F6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                title="Gửi tin nhắn SMS"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <span style={{ fontSize: 9.5, color: '#64748B', fontWeight: 500, marginTop: 4 }}>
                Tin nhắn
              </span>
            </div>

            {/* 6. Khác */}
            <div
              onClick={handleNativeShare}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0B3B60',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EEF2F6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                title="Chia sẻ qua ứng dụng khác"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </div>
              <span style={{ fontSize: 9.5, color: '#64748B', fontWeight: 500, marginTop: 4 }}>
                Khác
              </span>
            </div>
          </div>

          {/* FOOTER / HELPER TEXT */}
          <div
            style={{
              fontSize: 10.5,
              color: '#94A3B8',
              lineHeight: 1.35,
              marginTop: 12,
              textAlign: 'center',
            }}
          >
            Bạn bè có thể quét mã hoặc mở link để tham gia nhóm.
          </div>
        </div>
      </div>
    </div>
  );
};
