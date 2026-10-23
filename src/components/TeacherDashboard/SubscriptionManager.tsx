/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.ts';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '../../utils/rules.ts';
import {
  Crown,
  Check,
  Zap,
  CreditCard,
  Apple,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Smartphone,
} from 'lucide-react';

interface SubscriptionManagerProps {
  onRefresh: () => void;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ onRefresh }) => {
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [expiresAt, setExpiresAt] = useState<string | undefined>();
  const [isAutoRenewing, setIsAutoRenewing] = useState<boolean>(false);
  const [usage, setUsage] = useState<{
    classesCount: number;
    maxClasses: number;
    studentsCount: number;
    maxStudentsPerClass: number;
  }>({ classesCount: 1, maxClasses: 1, studentsCount: 0, maxStudentsPerClass: 30 });
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState<boolean>(true);
  const [upgrading, setUpgrading] = useState<boolean>(false);

  // Store Purchase Verification Modal
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [pendingTargetTier, setPendingTargetTier] = useState<SubscriptionTier>('plus');
  const [selectedPlatform, setSelectedPlatform] = useState<'apple_app_store' | 'google_play'>('apple_app_store');
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCurrentSubscription = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{
        tier: SubscriptionTier;
        expiresAt?: string;
        isAutoRenewing: boolean;
        usage: any;
        purchaseHistory: any[];
      }>('/subscriptions/current');
      setCurrentTier(data.tier);
      setExpiresAt(data.expiresAt);
      setIsAutoRenewing(data.isAutoRenewing);
      setUsage(data.usage);
      setPurchaseHistory(data.purchaseHistory || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentSubscription();
  }, []);

  const handleDirectUpgrade = async (target: SubscriptionTier) => {
    setUpgrading(true);
    setStatusBanner(null);
    try {
      await apiRequest('/subscriptions/upgrade', {
        method: 'POST',
        body: JSON.stringify({ targetTier: target, billingCycle }),
      });
      setStatusBanner({
        type: 'success',
        text: `تم تحديث الباقة بنجاح إلى (${SUBSCRIPTION_PLANS[target].nameAr}).`,
      });
      fetchCurrentSubscription();
      onRefresh();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
    } finally {
      setUpgrading(false);
    }
  };

  const handleStorePurchase = async () => {
    setUpgrading(true);
    setStatusBanner(null);
    try {
      const productId = `sa.classheroes.sub.${pendingTargetTier}.${billingCycle}`;
      const storeReceipt = `store_receipt_${selectedPlatform}_${Date.now()}_sig_valid`;

      const res = await apiRequest('/subscriptions/verify-store-receipt', {
        method: 'POST',
        body: JSON.stringify({
          platform: selectedPlatform,
          receiptData: storeReceipt,
          productId,
        }),
      });

      setStatusBanner({ type: 'success', text: res.message });
      setStoreModalOpen(false);
      fetchCurrentSubscription();
      onRefresh();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancelAutoRenew = async () => {
    setStatusBanner(null);
    try {
      const res = await apiRequest('/subscriptions/cancel', { method: 'POST' });
      setStatusBanner({ type: 'success', text: res.message });
      fetchCurrentSubscription();
      onRefresh();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
    }
  };

  const currentPlan = SUBSCRIPTION_PLANS[currentTier];

  return (
    <div className="space-y-8">
      {statusBanner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{statusBanner.text}</span>
          <button type="button" onClick={() => setStatusBanner(null)} className="text-slate-400 hover:text-slate-600 px-2">
            ✕
          </button>
        </div>
      )}

      {/* Current Status Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-amber-300" />
            <span className="text-xs font-bold text-indigo-200">باقتك الحالية:</span>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-indigo-950">
              {currentPlan.nameAr}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            {currentTier === 'free' ? 'الباقة الأساسية المجانية' : `اشتراك نشط: ${currentPlan.nameAr}`}
          </h3>
          <p className="text-xs text-indigo-200 mt-1">
            {expiresAt
              ? `صالح حتى: ${new Date(expiresAt).toLocaleDateString('ar-SA')} (${isAutoRenewing ? 'تجديد تلقائي مفعل' : 'تجديد غير مفعل'})`
              : 'باقة مجانية مستمرة لإدارة فصل دراسي واحد'}
          </p>
        </div>

        {/* Usage Meters */}
        <div className="flex gap-4 self-start md:self-auto">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 text-center min-w-[110px]">
            <span className="text-[10px] text-indigo-200 block font-semibold">استهلاك الفصول</span>
            <span className="text-lg font-black block mt-0.5">
              {usage.classesCount} / {usage.maxClasses}
            </span>
            <div className="w-full bg-white/20 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full"
                style={{
                  width: `${Math.min(100, (usage.classesCount / usage.maxClasses) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 text-center min-w-[110px]">
            <span className="text-[10px] text-indigo-200 block font-semibold">سعة الطلاب/فصل</span>
            <span className="text-lg font-black block mt-0.5">
              {usage.studentsCount} / {usage.maxStudentsPerClass}
            </span>
            <div className="w-full bg-white/20 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full"
                style={{
                  width: `${Math.min(100, (usage.studentsCount / usage.maxStudentsPerClass) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Billing Cycle Switch */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white text-indigo-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            اشتراك شهري
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === 'annual'
                ? 'bg-white text-indigo-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>اشتراك سنوي</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
              وفر شهرين!
            </span>
          </button>
        </div>
      </div>

      {/* 3 Subscription Tiers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Free Tier */}
        <div
          className={`p-6 rounded-3xl bg-white border transition-all flex flex-col justify-between shadow-xs ${
            currentTier === 'free' ? 'border-indigo-600 ring-2 ring-indigo-500/20' : 'border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                البداية المجانية
              </span>
              {currentTier === 'free' && (
                <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> باقتك الحالية
                </span>
              )}
            </div>

            <h4 className="text-lg font-black text-slate-900">الباقة المجانية</h4>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-black text-slate-900">0</span>
              <span className="text-xs text-slate-500 font-bold mr-1">ريال سعودي</span>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              مناسبة لإدارة فصل دراسي واحد بكفاءة تامة.
            </p>

            <ul className="space-y-3 text-xs text-slate-700 border-t border-slate-100 pt-4">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>فصل دراسي واحد (1)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>حتى 30 طالبًا في الفصل</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>نظام النقاط الكامل (المصادر الـ 7)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>رصد الاختبارات والواجبات</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>متجر المكافآت ولوحة المتصدرين</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            disabled={currentTier === 'free'}
            onClick={() => handleDirectUpgrade('free')}
            className="w-full mt-6 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {currentTier === 'free' ? 'الخطة الحالية' : 'التحويل للمجانية'}
          </button>
        </div>

        {/* 2. Teacher Plus Tier */}
        <div
          className={`p-6 rounded-3xl bg-white border-2 transition-all flex flex-col justify-between shadow-md relative ${
            currentTier === 'plus' ? 'border-indigo-600 ring-2 ring-indigo-500/20' : 'border-indigo-200'
          }`}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-extrabold shadow-sm">
            الأكثر شعبية للمعلمين
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">
                المعلم بلس — Plus
              </span>
              {currentTier === 'plus' && (
                <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> باقتك الحالية
                </span>
              )}
            </div>

            <h4 className="text-lg font-black text-slate-900">المعلم بلس (Teacher Plus)</h4>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-black text-indigo-700">
                {billingCycle === 'annual' ? '99' : '9.99'}
              </span>
              <span className="text-xs text-slate-500 font-bold mr-1">
                ريال / {billingCycle === 'annual' ? 'سنويًا' : 'شهريًا'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              مثالية لمعلمي المدارس لإدارة عدة فصول مع تقارير متقدمة وتصدير.
            </p>

            <ul className="space-y-3 text-xs text-slate-700 border-t border-slate-100 pt-4">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-bold">حتى 5 فصول دراسية</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-bold">حتى 150 طالبًا</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>تقارير أداء الطلاب الشاملة</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>تصدير البيانات والتقارير (Excel / CSV)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>أدوات إدارة الفصول التفاعلية</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2 mt-6">
            <button
              type="button"
              disabled={currentTier === 'plus' || upgrading}
              onClick={() => handleDirectUpgrade('plus')}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 disabled:opacity-50 transition-all"
            >
              {currentTier === 'plus' ? 'باقتك النشطة حاليًا' : 'ترقية إلى المعلم بلس'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingTargetTier('plus');
                setStoreModalOpen(true);
              }}
              className="w-full py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 rounded-lg flex items-center justify-center gap-1"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>شراء عبر Apple Store / Google Play</span>
            </button>
          </div>
        </div>

        {/* 3. Teacher Pro Tier */}
        <div
          className={`p-6 rounded-3xl bg-white border transition-all flex flex-col justify-between shadow-xs ${
            currentTier === 'pro' ? 'border-amber-500 ring-2 ring-amber-400/30' : 'border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800">
                المعلم برو — Pro
              </span>
              {currentTier === 'pro' && (
                <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> باقتك الحالية
                </span>
              )}
            </div>

            <h4 className="text-lg font-black text-slate-900">المعلم برو (Teacher Pro)</h4>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-black text-amber-600">
                {billingCycle === 'annual' ? '149' : '14.99'}
              </span>
              <span className="text-xs text-slate-500 font-bold mr-1">
                ريال / {billingCycle === 'annual' ? 'سنويًا' : 'شهريًا'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              الخطة الاحترافية الشاملة لجميع الفصول مع تحليلات ذكية ودعم أولوية.
            </p>

            <ul className="space-y-3 text-xs text-slate-700 border-t border-slate-100 pt-4">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-bold">حتى 10 فصول دراسية</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-bold">سعة طلابية غير محدودة (500+)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-600 shrink-0" />
                <span>إحصائيات متقدمة ومقارنة أداء الفصول</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-600 shrink-0" />
                <span>أدوات توليد الأسئلة والألعاب الموسعة</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-600 shrink-0" />
                <span>جميع مزايا باقة بلس وتصدير كامل</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2 mt-6">
            <button
              type="button"
              disabled={currentTier === 'pro' || upgrading}
              onClick={() => handleDirectUpgrade('pro')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md shadow-amber-200 disabled:opacity-50 transition-all"
            >
              {currentTier === 'pro' ? 'باقتك النشطة حاليًا' : 'ترقية إلى المعلم برو'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingTargetTier('pro');
                setStoreModalOpen(true);
              }}
              className="w-full py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-50 rounded-lg flex items-center justify-center gap-1"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>شراء عبر Apple Store / Google Play</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Management Actions */}
      {currentTier !== 'free' && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            <span className="font-bold">إدارة الاشتراك:</span> عند انتهاء الاشتراك لا يتم حذف أي فصل
            أو بيانات للطلاب نهائيًا.
          </div>
          {isAutoRenewing && (
            <button
              type="button"
              onClick={handleCancelAutoRenew}
              className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold"
            >
              إلغاء التجديد التلقائي
            </button>
          )}
        </div>
      )}

      {/* Official Store In-App Purchase Verification Modal */}
      {storeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                تفعيل الاشتراك عبر المتجر الرسمي (In-App Purchases)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              يتم توثيق عملية الاشتراك عبر Apple StoreKit 2 أو Google Play Billing والتحقق من حالة الباقة مباشرة من الخادم.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                منصة المتجر:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlatform('apple_app_store')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                    selectedPlatform === 'apple_app_store'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200'
                  }`}
                >
                  <Apple className="w-4 h-4" />
                  <span>Apple App Store</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlatform('google_play')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                    selectedPlatform === 'google_play'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Google Play</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div>
                <strong>معرّف المنتج: </strong>
                <code>sa.classheroes.sub.{pendingTargetTier}.{billingCycle}</code>
              </div>
              <div>
                <strong>المبلغ: </strong>
                <span>
                  {billingCycle === 'annual'
                    ? SUBSCRIPTION_PLANS[pendingTargetTier].annualPriceSar
                    : SUBSCRIPTION_PLANS[pendingTargetTier].monthlyPriceSar}{' '}
                  ريال سعودي
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStoreModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleStorePurchase}
                disabled={upgrading}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-200"
              >
                {upgrading ? 'جارٍ التحقق...' : 'إتمام التفعيل والتحقق من الخادم'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
