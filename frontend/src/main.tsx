import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ToastProvider } from './context/ToastContext';
import { GroupSessionProvider } from './context/GroupSessionContext';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <GroupSessionProvider>
        <App />
      </GroupSessionProvider>
    </ToastProvider>
  </React.StrictMode>
);
