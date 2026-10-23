import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useLanguage } from '../../context/LanguageContext.tsx';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { isRtl } = useLanguage();

  if (isOnline) return null;

  return (
    <div 
      className="fixed bottom-4 start-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 text-white px-4 py-2.5 text-xs sm:text-sm font-bold shadow-2xl border border-amber-400 animate-bounce duration-1000"
      dir={isRtl ? 'rtl' : 'ltr'}
      role="status"
    >
      <div className="relative flex items-center justify-center">
        <WifiOff className="w-4 h-4 text-white" />
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-200"></span>
        </span>
      </div>
      <div>
        <span>
          {isRtl ? 'وضع العمل بدون إنترنت' : 'Offline Mode'}
        </span>
        <span className="text-[11px] font-normal opacity-90 ms-1.5 hidden sm:inline">
          {isRtl ? '— يتم استخدام البيانات المحفوظة محليًا عبر Service Worker' : '— Using cached data via Service Worker'}
        </span>
      </div>
    </div>
  );
};
