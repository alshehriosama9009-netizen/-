/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { Trophy, GraduationCap, Sparkles, KeyRound, Mail, Lock, User, School, CheckCircle2, AlertCircle, Globe } from 'lucide-react';
import { PWAInstallButton } from './PWA/PWAInstallButton.tsx';

export const AuthScreen: React.FC = () => {
  const { loginTeacher, registerTeacher, loginStudent, quickLoginTeacherDemo, quickLoginStudentDemo, error: authError } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'teacher' | 'student'>('teacher');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Teacher Form State
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [schoolName, setSchoolName] = useState('');

  // Student Form State
  const [studentCode, setStudentCode] = useState('');
  const [studentPin, setStudentPin] = useState('');

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        await registerTeacher(teacherEmail, teacherPassword, teacherName, schoolName);
      } else {
        await loginTeacher(teacherEmail, teacherPassword);
      }
    } catch (err: any) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);

    try {
      await loginStudent(studentCode, studentPin);
    } catch (err: any) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTeacher = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      await quickLoginTeacherDemo();
    } catch (err: any) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStudent = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      await quickLoginStudentDemo('S101', '1111');
    } catch (err: any) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 relative">
      {/* Top Bar: Developer Badge & Language/Install Actions */}
      <div className="w-full max-w-5xl flex items-center justify-between gap-2 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-indigo-950 flex items-center justify-center font-black shadow-xs">
            <Trophy className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-black tracking-tight">
            {t('appNameAr')}
          </span>
          <span className="text-white/40">|</span>
          <span className="text-xs font-bold text-amber-300">
            {t('appTagline')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md border border-white/20 transition-all shadow-md cursor-pointer"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-amber-300" />
            <span>{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>
          <PWAInstallButton />
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-md my-auto py-6">
        {/* Decorative header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-200 text-indigo-950 shadow-xl shadow-indigo-950/50 mb-3 ring-4 ring-white/20">
            <Trophy className="w-9 h-9 sm:w-11 sm:h-11" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t('appNameAr')} — {t('appNameEn')}
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200 mt-1.5 font-medium">
            {t('appSubtitle')}
          </p>
        </div>

        {/* PWA Install Banner */}
        <div className="mb-4">
          <PWAInstallButton variant="banner" />
        </div>

        {/* Main Official Auth Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-950/40 border border-slate-100 overflow-hidden">
          {/* Role Switch Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100/90 border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('teacher');
                setLocalError(null);
              }}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'teacher'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>{t('teacherPortal')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('student');
                setLocalError(null);
              }}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'student'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{t('studentPortal')}</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {(localError || authError) && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{localError || authError}</span>
              </div>
            )}

            {activeTab === 'teacher' ? (
              <div>
                <div className="mb-5 text-center">
                  <h2 className="text-base font-bold text-slate-800">
                    {isRegistering ? t('teacherRegisterTitle') : t('teacherLoginTitle')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isRegistering
                      ? t('teacherRegisterSubtitle')
                      : t('teacherLoginSubtitle')}
                  </p>
                </div>

                <form onSubmit={handleTeacherSubmit} className="space-y-3.5">
                  {isRegistering && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t('fullName')}
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                          <input
                            type="text"
                            required
                            value={teacherName}
                            onChange={(e) => setTeacherName(e.target.value)}
                            placeholder="مثال: أ. محمد السالم"
                            className="w-full pr-9 pl-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t('schoolName')}
                        </label>
                        <div className="relative">
                          <School className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                          <input
                            type="text"
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                            placeholder="مثال: مدرسة رواد المستقبل"
                            className="w-full pr-9 pl-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t('email')}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <input
                        type="email"
                        required
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        placeholder="teacher@school.edu.sa"
                        className="w-full pr-9 pl-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t('password')}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <input
                        type="password"
                        required
                        value={teacherPassword}
                        onChange={(e) => setTeacherPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pr-9 pl-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all mt-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading
                      ? t('loading')
                      : isRegistering
                      ? t('registerBtn')
                      : t('loginBtn')}
                  </button>
                </form>

                {!isRegistering && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleQuickTeacher}
                      disabled={loading}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{t('quickTeacherDemo')}</span>
                    </button>
                  </div>
                )}

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setLocalError(null);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    {isRegistering
                      ? t('haveAccountPrompt')
                      : t('needAccountPrompt')}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-5 text-center">
                  <div className="inline-block p-2 rounded-2xl bg-amber-50 text-amber-600 mb-1">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h2 className="text-base font-bold text-slate-800">
                    {language === 'ar' ? 'تسجيل دخول الطالب' : 'Student Sign In'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('studentPinHelp')}
                  </p>
                </div>

                <form onSubmit={handleStudentSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t('studentCode')}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <input
                        type="text"
                        required
                        value={studentCode}
                        onChange={(e) => setStudentCode(e.target.value)}
                        placeholder="S101"
                        className="w-full pr-9 pl-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50 focus:bg-white uppercase font-bold tracking-widest"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t('studentPin')}
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <input
                        type="password"
                        maxLength={6}
                        required
                        value={studentPin}
                        onChange={(e) => setStudentPin(e.target.value)}
                        placeholder="••••"
                        className="w-full pr-9 pl-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50 focus:bg-white tracking-widest font-bold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md transition-all mt-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? t('loading') : t('launchStudentBtn')}
                  </button>
                </form>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleQuickStudent}
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-amber-600" />
                    <span>{t('quickStudentDemo')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Official Bottom Footer: Developer Attribution ONLY at top and bottom */}
      <footer className="w-full max-w-5xl pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-indigo-200/80 text-xs">
        <span>
          {t('appNameAr')} — <strong>{t('appNameEn')}</strong> | {t('appTagline')}
        </span>
        <span className="text-[11px] text-indigo-300/70">
          {t('rightsReserved')}
        </span>
      </footer>
    </div>
  );
};
