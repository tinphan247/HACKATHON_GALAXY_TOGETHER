import React, { useState } from 'react';
import { RealQrCode } from './RealQrCode';
import { useToast } from '../../context/ToastContext';
import { useGroupSession } from '../../context/GroupSessionContext';

interface GroupShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupShareModal: React.FC<GroupShareModalProps> = ({ isOpen, onClose }) => {
  const { inviteCode, sessionData, displayMembers } = useGroupSession();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const code = inviteCode || sessionData?.invite?.code || 'GTH-471';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const joinUrl = `${origin}/?join=${code}`;

  const activeMembers = displayMembers.filter((m) => m.status !== 'EMPTY');
  const maxMembers = sessionData?.max_members || 4;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(joinUrl);
      }
      setCopied(true);
      showToast('✓ Đã sao chép link mời nhóm!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Sao chép: ' + joinUrl);
    }
  };

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      }
      showToast(`✓ Đã sao chép mã nhóm: ${code}`);
    } catch {
      showToast(`Mã nhóm: ${code}`);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tham gia nhóm xem phim Galaxy: ${sessionData?.name || 'Galaxy Together'}`,
          text: `Vào chọn ghế xem phim cùng mình nhé! Mã nhóm: ${code}`,
          url: joinUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          animation: 'fadeInScale 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0B3B60 0%, #155e75 100%)',
            padding: '16px 20px',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#F97316' }}>
              GALAXY TOGETHER
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
              MỜI BẠN VÀO NHÓM
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '20px 20px 24px', textAlign: 'center' }}>
          {/* Member Count Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#FFF7ED',
              border: '1px solid #FFEDD5',
              padding: '6px 14px',
              borderRadius: 20,
              marginBottom: 16,
              fontSize: 12,
              fontWeight: 700,
              color: '#C2410C',
            }}
          >
            <span>👥</span>
            <span>
              {activeMembers.length}/{maxMembers} thành viên đã vào nhóm
            </span>
          </div>

          {/* QR Code Container */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                padding: 12,
                background: '#F8FAFC',
                borderRadius: 16,
                border: '1.5px dashed #CBD5E1',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              }}
            >
              <RealQrCode value={joinUrl} size={150} />
            </div>
          </div>

          {/* Group Code Display */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, marginBottom: 4 }}>
              MÃ VÀO NHÓM
            </div>
            <div
              onClick={handleCopyCode}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#F1F5F9',
                border: '1.5px solid #E2E8F0',
                padding: '8px 16px',
                borderRadius: 12,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: 2,
                  color: '#0B3B60',
                }}
              >
                {code}
              </span>
              <span style={{ fontSize: 13, color: '#F97316' }}>📋</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleCopyLink}
              style={{
                width: '100%',
                padding: '12px',
                background: copied ? '#16A34A' : '#F97316',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.2s',
              }}
            >
              <span>{copied ? '✓ Đã sao chép liên kết' : '🔗 Sao chép liên kết mời'}</span>
            </button>

            {typeof navigator !== 'undefined' && !!navigator.share && (
              <button
                onClick={handleShare}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#F8FAFC',
                  color: '#0B3B60',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>📤 Chia sẻ qua Zalo / Messenger</span>
              </button>
            )}
          </div>

          {/* Note */}
          <div
            style={{
              fontSize: 11,
              color: '#94A3B8',
              lineHeight: 1.4,
              marginTop: 14,
            }}
          >
            Mỗi bạn tự chọn 1 ghế trên sơ đồ chung.
            <br />
            Cùng nhau xem phim tại Galaxy Cinema!
          </div>
        </div>
      </div>
    </div>
  );
};
