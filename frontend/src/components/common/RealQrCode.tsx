import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface RealQrCodeProps {
  value: string;
  size?: number;
}

export const RealQrCode: React.FC<RealQrCodeProps> = ({ value, size = 160 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      },
      (err) => {
        if (err) {
          console.error('Error generating QR code:', err);
          setError('Không thể tạo mã QR');
        } else {
          setError(null);
        }
      }
    );
  }, [value, size]);

  return (
    <div className="qr-box" style={{ width: size + 20, height: size + 20 }}>
      {error ? (
        <div style={{ fontSize: 12, color: '#DC2626', textAlign: 'center' }}>{error}</div>
      ) : (
        <canvas ref={canvasRef} style={{ width: size, height: size }} />
      )}
    </div>
  );
};
