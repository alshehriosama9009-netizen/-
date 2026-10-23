/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { Classroom } from '../types/index.ts';
import {
  Trophy,
  Crown,
  LogOut,
  Sparkles,
  Smartphone,
  Layers,
  GraduationCap,
  Globe,
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../utils/rules.ts';
import { PWAInstallButton } from './PWA/PWAInstallButton.tsx';

interface NavbarProps {
  classrooms: Classroom[];
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  onOpenNewClassModal: () => void;
  onOpenPublishingModal: () => void;
  onOpenSubscriptions: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  classrooms,
  selectedClassId,
  onSelectClass,
  onOpenNewClassModal,
  onOpenPublishingModal,
  onOpenSubscriptions,
}) => {
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  if (!user) return null;

  const isTeacher = user.role === 'teacher';
  const tier = user.teacherProfile?.subscriptionTier || 'free';
  const planInfo = SUBSCRIPTION_PLANS[tier];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Credits */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-50">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">
                  {t('appNameAr')}
                </span>
                <span className="hidden md:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {t('appNameEn')}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                {t('appTagline')}
              </p>
            </div>
          </div>

          {/* Center: Classroom Selector (for Teacher) */}
          {isTeacher && classrooms.length > 0 && (
            <div className="hidden lg:flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60">
              <span className="text-xs font-medium text-slate-600 px-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                {t('classroomLabel')}
              </span>
              <select
                aria-label={t('classroomLabel')}
                value={selectedClassId}
                onChange={(e) => onSelectClass(e.target.value)}
                className="text-xs font-bold bg-white text-slate-800 rounded-lg px-3 py-1.5 shadow-2xs border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.studentCount || 0} {t('student')})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onOpenNewClassModal}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
                title="إنشاء فصل جديد"
              >
                {t('newClassBtn')}
              </button>
            </div>
          )}

          {/* Right Side: Language Switcher, Plan Badge, Store Guide & User Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher Toggle */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 transition-all shadow-2xs"
              title="تبديل لغة التطبيق / Switch Language"
              aria-label="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {isTeacher && (
              <>
                {/* Store & Web Publishing Hub Button */}
                <button
                  type="button"
                  onClick={onOpenPublishingModal}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors shadow-2xs cursor-pointer"
                  title="مركز نشر الموقع الإلكتروني وتطبيق الجوال (Web + App Store + Google Play)"
                >
                  <Smartphone className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="hidden md:inline">{t('storePublishingBtn')}</span>
                  <span className="md:hidden">نشر</span>
                </button>

                {/* Subscription Tier Badge */}
                <button
                  type="button"
                  onClick={onOpenSubscriptions}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                    tier === 'pro'
                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      : tier === 'plus'
                      ? 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Crown
                    className={`w-3.5 h-3.5 ${
                      tier === 'pro'
                        ? 'text-amber-500 fill-amber-400'
                        : tier === 'plus'
                        ? 'text-indigo-600'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>{language === 'ar' ? planInfo.nameAr : planInfo.nameEn}</span>
                </button>
              </>
            )}

            {/* In-App PWA Install Button */}
            <PWAInstallButton />

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isTeacher ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'
                }`}
              >
                {isTeacher ? <GraduationCap className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-800 leading-none">{user.name}</p>
                <p className="text-[10px] text-slate-500 font-medium leading-none mt-1">
                  {isTeacher ? t('teacher') : t('studentRole')}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors mr-1"
                title={t('logout')}
                aria-label={t('logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Class Selector Bar */}
        {isTeacher && classrooms.length > 0 && (
          <div className="flex lg:hidden items-center justify-between py-2 border-t border-slate-100 gap-2">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-slate-600 font-medium">{t('classroomLabel')}</span>
              <select
                aria-label={t('classroomLabel')}
                value={selectedClassId}
                onChange={(e) => onSelectClass(e.target.value)}
                className="text-xs font-bold bg-slate-100 text-slate-800 rounded-lg px-2.5 py-1 border border-slate-200 flex-1"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={onOpenNewClassModal}
              className="text-xs font-bold text-indigo-600 px-2 py-1 rounded-md bg-indigo-50 border border-indigo-100"
            >
              {t('newClassBtn')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
