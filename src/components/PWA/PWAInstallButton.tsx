import React, { useState } from 'react';
import { Download, Smartphone, X, Share2, PlusSquare, Monitor, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useLanguage } from '../../context/LanguageContext.tsx';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guidePlatform, setGuidePlatform] = useState<'ios' | 'android' | 'desktop'>(
    isIOS ? 'ios' : 'android'
  );
  const [justInstalled, setJustInstalled] = useState(false);
  const { language } = useLanguage();
  const isRtl = language === 'ar';

  if (isInstalled || justInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setJustInstalled(true);
        return;
      }
    }
    setShowGuideModal(true);
  };

  return (
    <>
      {variant === 'banner' ? (
        <div
          className={`bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white px-4 py-2.5 rounded-2xl shadow-md flex items-center justify-between gap-3 text-sm border border-indigo-400/30 ${className}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-start">
              <p className="font-bold text-xs sm:text-sm">
                {isRtl
                  ? 'ثبّت تطبيق «أبطال الفصل» على جوالك أو حاسوبك'
                  : 'Install "Class Heroes" on your phone or computer'}
              </p>
              <p className="text-[11px] text-indigo-100">
                {isRtl
                  ? 'يعمل كموقع إلكتروني وتطبيق جوال فوري (يدعم العمل بدون إنترنت)'
                  : 'Works as both a live website and instant mobile app (offline ready)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isRtl ? 'تثبيت التطبيق' : 'Install App'}</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all shadow-2xs cursor-pointer ${className}`}
          title={
            isRtl
              ? 'تثبيت التطبيق على الشاشة الرئيسية للجوال أو الحاسوب'
              : 'Install app on home screen or desktop'
          }
        >
          <Download className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>{isRtl ? 'تثبيت التطبيق' : 'Install App'}</span>
        </button>
      )}

      {/* Multi-Platform PWA Installation Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 text-slate-800 relative"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              aria-label={isRtl ? 'إغلاق نافذة التثبيت' : 'Close install modal'}
              className="absolute top-4 end-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
                <Smartphone className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {isRtl
                    ? 'تثبيت تطبيق «أبطال الفصل» على جهازك'
                    : 'Install "Class Heroes" App'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isRtl
                    ? 'اختر نوع جهازك لتثبيت التطبيق على الشاشة الرئيسية فورًا'
                    : 'Select your device to add the app to your Home Screen'}
                </p>
              </div>
            </div>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setGuidePlatform('ios')}
                className={`py-2 rounded-lg transition-all ${
                  guidePlatform === 'ios'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isRtl ? 'آيفون / آيباد' : 'iPhone / iPad'}
              </button>
              <button
                type="button"
                onClick={() => setGuidePlatform('android')}
                className={`py-2 rounded-lg transition-all ${
                  guidePlatform === 'android'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isRtl ? 'أندرويد' : 'Android'}
              </button>
              <button
                type="button"
                onClick={() => setGuidePlatform('desktop')}
                className={`py-2 rounded-lg transition-all ${
                  guidePlatform === 'desktop'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isRtl ? 'حاسوب / سبورة' : 'Desktop'}
              </button>
            </div>

            {guidePlatform === 'ios' && (
              <div className="space-y-3 my-4 text-xs sm:text-sm text-slate-600">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">
                      {isRtl
                        ? 'افتح الرابط في متصفح Safari واضغط زر المشاركة (Share)'
                        : 'Open in Safari and tap the Share button'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                      {isRtl
                        ? 'الموجود في الشريط السفلي لمتصفح سفاري'
                        : 'Located in the bottom Safari toolbar'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">
                      {isRtl
                        ? 'اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen)'
                        : 'Tap "Add to Home Screen"'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <PlusSquare className="w-3.5 h-3.5 text-indigo-600" />
                      {isRtl
                        ? 'ثم اضغط «إضافة» ليظهر التطبيق بأيقونته الرسمية على جوالك'
                        : 'Then tap "Add" in the top corner'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {guidePlatform === 'android' && (
              <div className="space-y-3 my-4 text-xs sm:text-sm text-slate-600">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">
                      {isRtl
                        ? 'اضغط على قائمة المتصفح (⋮) في أعلى متصفح Chrome'
                        : 'Tap the browser menu (⋮) in Chrome'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">
                      {isRtl
                        ? 'اختر «تثبيت التطبيق» (Install App) أو «الإضافة إلى الشاشة الرئيسية»'
                        : 'Select "Install App" or "Add to Home screen"'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {isRtl
                        ? 'سيتم تثبيت حزمة التطبيق الكاملة للعمل بشاشة مستقلة'
                        : 'The app will install as a standalone native-like app'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {guidePlatform === 'desktop' && (
              <div className="space-y-3 my-4 text-xs sm:text-sm text-slate-600">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">
                      {isRtl
                        ? 'من شريط العنوان في متصفح Chrome أو Edge على الحاسوب أو السبورة الذكية'
                        : 'In the address bar of Chrome or Edge on your computer'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                      {isRtl
                        ? 'اضغط على أيقونة التثبيت (⬇️) بجوار الرابط في الأعلى ثم اختر «تثبيت»'
                        : 'Click the install icon in the address bar and confirm'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow transition-all cursor-pointer"
              >
                {isRtl ? 'تم، شكرًا لك' : 'Got it!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
