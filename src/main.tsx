import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { AppProvider } from './store/AppContext';
import './styles.css';

if (!Capacitor.isNativePlatform()) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
