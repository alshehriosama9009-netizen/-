import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA offline caching & home screen installation
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Class Heroes: New PWA version available');
  },
  onOfflineReady() {
    console.log('Class Heroes: PWA is ready to work offline');
  },
});

createRoot(document.getElementById('root')!).render(<App />);

