/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Class Heroes — أبطال الفصل
 * Web & Mobile App Publishing Center (مركز نشر الموقع الإلكتروني وتطبيق الجوال)
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Apple,
  ShieldCheck,
  Terminal,
  CheckCircle2,
  Copy,
  Check,
  Globe,
  Download,
  QrCode,
  ExternalLink,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { PWAInstallButton } from './PWA/PWAInstallButton.tsx';

interface PublishingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PublishingModal: React.FC<PublishingModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'web_pwa' | 'overview' | 'apple' | 'google' | 'capacitor'>('web_pwa');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({
    web_live: true,
    pwa_manifest: true,
    pwa_sw: true,
    rtl_safe: true,
    pdpl_privacy: true,
  });

  if (!isOpen) return null;

  const liveOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://classheroes.sa';
  const privacyUrl = `${liveOrigin}/privacy`;
  const manifestUrl = `${liveOrigin}/manifest.json`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCheck = (key: string) => {
    setCheckedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const downloadJsonFile = (filename: string, content: object) => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const capacitorConfigObject = {
    appId: 'sa.classheroes.app',
    appName: 'أبطال الفصل - Class Heroes',
    webDir: 'dist',
    bundledWebRuntime: false,
    server: {
      androidScheme: 'https',
      cleartext: false,
    },
    plugins: {
      SplashScreen: {
        launchShowDuration: 2000,
        backgroundColor: '#4f46e5',
        showSpinner: false,
        splashFullScreen: true,
        splashImmersive: true,
      },
      StatusBar: {
        style: 'DARK',
        backgroundColor: '#4f46e5',
      },
    },
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publishing-modal-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-100 overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-l from-indigo-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-amber-400 flex items-center justify-center font-bold text-white shadow-lg shrink-0">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="publishing-modal-title" className="text-base sm:text-lg font-black text-white">
                  مركز النشر المتكامل: موقع إلكتروني + تطبيق جوال (PWA & Native)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold">
                  جاهز ومفعّل
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                منظومة «أبطال الفصل — Class Heroes» الرسمية للمدارس والفصول الدراسية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق مركز النشر"
            className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/80 px-4 sm:px-6 overflow-x-auto">
          {[
            { id: 'web_pwa', label: '🌐 الموقع الإلكتروني وتثبيت الجوال الفوري' },
            { id: 'overview', label: '🆔 هوية التطبيق والباقات' },
            { id: 'apple', label: '🍎 متجر آبل (App Store)' },
            { id: 'google', label: '🤖 متجر جوجل (Google Play)' },
            { id: 'capacitor', label: '⚙️ أوامر وحزم Capacitor' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3.5 px-4 text-xs font-extrabold border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-900 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[72vh] overflow-y-auto text-xs text-slate-700 leading-relaxed">
          {activeTab === 'web_pwa' && (
            <div className="space-y-5">
              {/* Direct PWA Install Banner */}
              <PWAInstallButton variant="banner" />

              {/* Live Web URL & Student Share Box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-indigo-950 text-sm flex items-center gap-2">
                      <Globe className="w-4 h-4 text-indigo-600" />
                      <span>1. رابط الموقع الإلكتروني المباشر (يعمل الآن):</span>
                    </h4>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      متصل ومباشر
                    </span>
                  </div>

                  <p className="text-slate-600 text-xs">
                    يمكنك مشاركة هذا الرابط مباشرة مع الطلاب وأولياء الأمور لفتح المنصة كموقع إلكتروني متجاوب أو تثبيته كتطبيق على هواتفهم:
                  </p>

                  {/* Main Web URL Copy */}
                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-indigo-200 shadow-2xs">
                    <code className="flex-1 font-mono text-xs text-indigo-900 truncate dir-ltr text-left px-2">
                      {liveOrigin}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(liveOrigin, 'web_url')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {copiedId === 'web_url' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-amber-300" />
                          <span>تم نسخ الرابط</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ رابط الموقع</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Public Privacy Policy & Manifest Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-500 block">صفحة سياسة الخصوصية الرسمية للمتاجر:</span>
                        <code className="text-[11px] font-mono text-slate-800">/privacy</code>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(privacyUrl, 'privacy_url')}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                          title="نسخ رابط سياسة الخصوصية"
                        >
                          {copiedId === 'privacy_url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                          title="فتح صفحة الخصوصية"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-500 block">ملف تعريف التطبيق (Web Manifest):</span>
                        <code className="text-[11px] font-mono text-slate-800">/manifest.json</code>
                      </div>
                      <a
                        href={manifestUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                        title="معاينة ملف manifest.json"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Classroom Visual Badge & Quick Share */}
                <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-between text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300">
                    <QrCode className="w-7 h-7" />
                  </div>
                  <div>
                    <h5 className="font-black text-sm text-white">بطاقة دعوة الطلاب السريعة</h5>
                    <p className="text-[11px] text-slate-300 mt-1">
                      انسخ رسالة الدعوة الجاهزة لإرسالها للطلاب أو أولياء الأمور عبر واتساب أو منصة مدرستي
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `🌟 مرحبًا بكم في تطبيق وموقع «أبطال الفصل — Class Heroes»\n\n🔗 رابط الدخول وتثبيت التطبيق على الجوال:\n${liveOrigin}\n\n📲 يمكنك فتحه كموقع إلكتروني أو اختيار «إضافة إلى الشاشة الرئيسية» لتثبيته كتطبيق جوال!`,
                        'whatsapp_invite'
                      )
                    }
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    {copiedId === 'whatsapp_invite' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>تم نسخ رسالة الدعوة!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>نسخ رسالة دعوة الطلاب</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Technical Readiness Verification Grid */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>2. حالة الجاهزية التقنية للموقع الإلكتروني وتطبيق الجوال (مفعلة بالكامل):</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      title: 'موقع ويب متجاوب + SEO',
                      desc: 'بيانات Schema.org وبطاقات المشاركة الاجتماعية OpenGraph مفعلة',
                    },
                    {
                      title: 'تطبيق جوال PWA فوري',
                      desc: 'يدعم التثبيت المباشر على شاشة آيفون وأندرويد بوضع Standalone',
                    },
                    {
                      title: 'العمل بدون إنترنت (Offline)',
                      desc: 'محرك Service Worker و Workbox يحفظ ملفات الواجهة والخطوط',
                    },
                    {
                      title: 'توافق كامل مع العربية (RTL)',
                      desc: 'دعم حواف شاشات الهواتف الحديثة (Safe-Area Insets) وتبديل اللغات',
                    },
                    {
                      title: 'أمان النقاط والبيانات',
                      desc: 'التصحيح وحساب النقاط يتم في الخادم مع منع تكرار النقاط لنفس النشاط',
                    },
                    {
                      title: 'صفحة خصوصية رسمية (/privacy)',
                      desc: 'متوافقة مع نظام PDPL السعودي وشروط مراجعة آبل وجوجل',
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-start gap-2.5 shadow-2xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{item.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                <h4 className="font-bold text-indigo-950 text-sm">بيانات الهوية المسجلة للتطبيق:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">الاسم بالعربية:</span>
                    <strong className="text-slate-900">أبطال الفصل</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">الاسم بالإنجليزية:</span>
                    <strong className="text-slate-900">Class Heroes</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">معرّف الحزمة (Bundle ID / Package Name):</span>
                    <code className="text-indigo-700 font-mono font-bold">sa.classheroes.app</code>
                  </div>
                  <div>
                    <span className="text-slate-500 block">التصنيف العمري:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      4+ (مناسب للأطفال والمدارس)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">الامتثال القانوني:</span>
                    <span className="font-bold text-indigo-700">
                      نظام حماية البيانات الشخصية السعودي (PDPL)
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900">منتجات الاشتراكات الرقمية (In-App Purchases):</h4>
                <div className="divide-y divide-slate-200">
                  <div className="py-2 flex items-center justify-between">
                    <div>
                      <strong>المعلم بلس (شهري): </strong>
                      <code className="text-slate-600 font-mono">sa.classheroes.sub.plus.monthly</code>
                    </div>
                    <span className="font-bold text-indigo-700">9.99 ريال</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <div>
                      <strong>المعلم بلس (سنوي): </strong>
                      <code className="text-slate-600 font-mono">sa.classheroes.sub.plus.annual</code>
                    </div>
                    <span className="font-bold text-indigo-700">99.00 ريال</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <div>
                      <strong>المعلم برو (شهري): </strong>
                      <code className="text-slate-600 font-mono">sa.classheroes.sub.pro.monthly</code>
                    </div>
                    <span className="font-bold text-indigo-700">14.99 ريال</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <div>
                      <strong>المعلم برو (سنوي): </strong>
                      <code className="text-slate-600 font-mono">sa.classheroes.sub.pro.annual</code>
                    </div>
                    <span className="font-bold text-indigo-700">149.00 ريال</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'apple' && (
            <div className="space-y-4">
              {/* Direct Source Code Download Box for Apple App Store */}
              <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-black text-indigo-950 text-sm flex items-center gap-2">
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span>تحميل ملف البرمجة الكامل للمشروع (Source Code لـ Xcode):</span>
                  </h4>
                  <p className="text-xs text-slate-600">
                    حمّل حزمة الكود المصدري الكاملة (شاملة إعدادات Capacitor وملفات الواجهة والخادم) لفتحها في برنامج Xcode على جهاز Mac ورفعها إلى Apple App Store.
                  </p>
                </div>
                <a
                  href="/api/export-source"
                  download="class-heroes-source-code.tar.gz"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2 shadow-md shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل ملف البرمجة الكامل (.tar.gz)</span>
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                  <Apple className="w-4 h-4 text-slate-900" />
                  <span>خطوات رفع التطبيق على Apple App Store (iOS & iPadOS):</span>
                </h4>
                <div className="space-y-2">
                  {[
                    { id: 'ios_1', text: '1. تحميل ملف البرمجة الكامل وفك ضغطه على جهاز Mac ثم تشغيل: npm install && npm run build' },
                    { id: 'ios_2', text: '2. توليد مشروع آبل الأصلي عبر الأمر: npx cap add ios && npx cap sync ios' },
                    { id: 'ios_3', text: '3. فتح المشروع في برنامج Xcode عبر الأمر: npx cap open ios واختيار فريق التطوير (Signing & Capabilities)' },
                    { id: 'ios_4', text: '4. من قائمة Xcode العلوية اختر Product -> Archive ثم Distribute App -> App Store Connect' },
                    { id: 'ios_5', text: `5. وضع رابط سياسة الخصوصية في App Store Connect: ${privacyUrl}` },
                  ].map((step) => (
                    <label
                      key={step.id}
                      onClick={() => toggleCheck(step.id)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-indigo-50/40"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checkedSteps[step.id])}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                      <span className="text-slate-800 font-medium">{step.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>قائمة التحقق لرفع التطبيق على Google Play Console (Android):</span>
                </h4>
                <div className="space-y-2">
                  {[
                    { id: 'and_1', text: 'إنشاء تطبيق جديد في Google Play Console بمعرّف sa.classheroes.app' },
                    { id: 'and_2', text: `إضافة رابط سياسة الخصوصية الرسمي في قسم أمان البيانات: ${privacyUrl}` },
                    { id: 'and_3', text: 'توليد مفتاح التوقيع الرقمي (Upload Keystore) وتوقيع حزمة Android App Bundle (.aab)' },
                    { id: 'and_4', text: 'رفع ملف app-release.aab إلى مسار الإنتاج (Production) أو الاختبار المغلق' },
                  ].map((step) => (
                    <label
                      key={step.id}
                      onClick={() => toggleCheck(step.id)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-emerald-50/40"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checkedSteps[step.id])}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span className="text-slate-800 font-medium">{step.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'capacitor' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                <div>
                  <h4 className="font-black text-indigo-950 text-sm">تحميل ملف البرمجة وملفات إعداد الجوال الجاهزة</h4>
                  <p className="text-xs text-slate-600">
                    يمكنك تحميل الكود المصدري الكامل للمشروع أو ملف إعداد Capacitor للمزامنة المباشرة مع Xcode و Android Studio
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="/api/export-source"
                    download="class-heroes-source-code.tar.gz"
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل ملف البرمجة الكامل (.tar.gz)</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => downloadJsonFile('capacitor.config.json', capacitorConfigObject)}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل capacitor.config.json</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs space-y-2 relative">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `npm run build\nnpx cap add ios\nnpx cap add android\nnpx cap sync\nnpx cap open ios\nnpx cap open android`,
                      'build_cmds'
                    )
                  }
                  className="absolute left-3 top-3 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] flex items-center gap-1 font-sans cursor-pointer"
                >
                  {copiedId === 'build_cmds' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedId === 'build_cmds' ? 'تم النسخ' : 'نسخ الأوامر'}</span>
                </button>
                <p className="text-slate-400"># 1. بناء ملفات الموقع وتطبيق الجوال (مع Service Worker)</p>
                <p className="text-emerald-400">npm run build</p>
                <p className="text-slate-400 mt-2"># 2. توليد مشاريع الجوال الأصلية (iOS و Android)</p>
                <p className="text-emerald-400">npx cap add ios</p>
                <p className="text-emerald-400">npx cap add android</p>
                <p className="text-slate-400 mt-2"># 3. مزامنة الملفات وفتحها في Xcode و Android Studio</p>
                <p className="text-emerald-400">npx cap sync</p>
                <p className="text-indigo-300">npx cap open ios      # يفتح مشروع Xcode لبناء .ipa</p>
                <p className="text-indigo-300">npx cap open android  # يفتح Android Studio لبناء .aab</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
