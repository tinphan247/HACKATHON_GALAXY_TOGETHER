import React, { createContext, useContext, useState, useCallback } from 'react';

interface ToastContextType {
  toastMessage: string | null;
  showToast: (msg: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string, duration = 2400) => {
    setToastMessage(msg);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, duration);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ToastContext.Provider value={{ toastMessage, showToast }}>
      {children}
      <div className={`toast ${toastMessage ? 'show' : ''}`} id="toast">
        {toastMessage}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
