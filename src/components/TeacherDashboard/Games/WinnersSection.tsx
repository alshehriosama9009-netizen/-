/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * Winners Podium & Historical Champions Section
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

import React, { useState, useEffect } from 'react';
import { Classroom, Student } from '../../../types/index.ts';
import { useLanguage } from '../../../context/LanguageContext.tsx';
import { apiRequest } from '../../../api/client.ts';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Sparkles,
  Calendar,
  CheckCircle2,
  Users,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface WinnersSectionProps {
  classroom: Classroom;
  students: Student[];
  onRefreshClassStudents: () => void;
}

export const WinnersSection: React.FC<WinnersSectionProps> = ({
  classroom,
  students,
  onRefreshClassStudents,
}) => {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);
  const [isAwarding, setIsAwarding] = useState(false);
  const [awardSuccessMsg, setAwardSuccessMsg] = useState<string | null>(null);
  const [awardErrorMsg, setAwardErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWinners = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any[]>('/games/winners');
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWinners();
  }, []);

  const currentSession = sessions[selectedSessionIndex] || null;

  const handleAwardPoints = async (sessionId: string) => {
    if (!currentSession || !currentSession.firstPlace) return;

    setIsAwarding(true);
    setAwardSuccessMsg(null);
    setAwardErrorMsg(null);

    const winnersPayload = [];
    if (currentSession.firstPlace) {
      winnersPayload.push({ studentId: currentSession.firstPlace.id, rank: 1 });
    }
    if (currentSession.secondPlace) {
      winnersPayload.push({ studentId: currentSession.secondPlace.id, rank: 2 });
    }
    if (currentSession.thirdPlace) {
      winnersPayload.push({ studentId: currentSession.thirdPlace.id, rank: 3 });
    }

    try {
      const res = await apiRequest<{ success: boolean; message: string }>(
        `/games/sessions/${sessionId}/award-points`,
        {
          method: 'POST',
          body: JSON.stringify({ winners: winnersPayload }),
        }
      );

      setAwardSuccessMsg(res.message || (isRtl ? 'تم اعتماد وتوزيع نقاط اللعبة بنجاح!' : 'Points awarded!'));
      fetchWinners();
      onRefreshClassStudents();
    } catch (err: any) {
      setAwardErrorMsg(err.message || 'تعذر اعتماد نقاط المسابقة');
    } finally {
      setIsAwarding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-amber-600 via-amber-700 to-indigo-950 text-white shadow-xl space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 text-amber-200 flex items-center justify-center border border-white/30 shrink-0">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black">
              {isRtl ? 'منصة التتويج وسجل الأبطال الفائزين' : 'Winners Podium & Champions Roll'}
            </h3>
            <p className="text-xs text-amber-100">
              {isRtl
                ? 'إعلان الفائزين الحقيقيين وتكريمهم بنقاط الألعاب المعتمدة (الأول: 5، الثاني: 3، الثالث: 2)'
                : 'Honoring champions with official games points (1st: 5 pts, 2nd: 3 pts, 3rd: 2 pts)'}
            </p>
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-sm font-black text-slate-700">
            {isRtl ? 'لا توجد منافسات مكتملة أو فائزون مسجلون بعد' : 'No completed competitions yet'}
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {isRtl
              ? 'شغّل نشاطًا أو مسابقة تفاعلية في الفصل، وعند إنهائها ستظهر شاشة التتويج وسجل المراكز الأولى تلقائيًا.'
              : 'Launch a game in class to celebrate winners on the podium.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active / Selected Podium Card */}
          {currentSession && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-amber-200 shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {currentSession.classroomName}
                  </span>
                  <h4 className="text-lg font-black text-slate-900 mt-1">
                    {currentSession.activityTitle}
                  </h4>
                  <span className="text-xs text-slate-400 font-bold block mt-0.5">
                    {new Date(currentSession.startedAt).toLocaleDateString('ar-SA')} - {new Date(currentSession.startedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Session Selector Carousel Buttons */}
                {sessions.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={selectedSessionIndex === 0}
                      onClick={() => setSelectedSessionIndex((prev) => Math.max(0, prev - 1))}
                      className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                    >
                      {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                    <span className="text-xs font-black text-slate-600">
                      {selectedSessionIndex + 1} / {sessions.length}
                    </span>
                    <button
                      type="button"
                      disabled={selectedSessionIndex === sessions.length - 1}
                      onClick={() => setSelectedSessionIndex((prev) => Math.min(sessions.length - 1, prev + 1))}
                      className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                    >
                      {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              {/* 3-Tier Podium */}
              <div className="grid grid-cols-3 gap-3 items-end pt-4 max-w-2xl mx-auto">
                {/* 2nd Place */}
                <div className="p-4 rounded-3xl bg-slate-100 border border-slate-200 text-center space-y-2">
                  <span className="text-3xl">🥈</span>
                  <div className="text-[11px] font-extrabold text-slate-500">
                    {isRtl ? 'المركز الثاني (+3 نقاط)' : '2nd Place (+3 pts)'}
                  </div>
                  <div className="font-black text-slate-900 text-sm truncate">
                    {currentSession.secondPlace?.name || '—'}
                  </div>
                  <div className="text-xs font-black text-indigo-600">
                    {currentSession.secondPlace ? `${currentSession.secondPlace.score} pts` : '-'}
                  </div>
                </div>

                {/* 1st Place */}
                <div className="p-6 rounded-3xl bg-linear-to-b from-amber-100 to-amber-50 border-2 border-amber-400 text-center space-y-2 transform -translate-y-4 shadow-lg">
                  <span className="text-4xl animate-bounce">👑</span>
                  <div className="text-xs font-black text-amber-700">
                    {isRtl ? 'المركز الأول (+5 نقاط)' : '1st Place (+5 pts)'}
                  </div>
                  <div className="font-black text-slate-950 text-base sm:text-lg truncate">
                    {currentSession.firstPlace?.name || '—'}
                  </div>
                  <div className="text-sm font-black text-amber-700">
                    {currentSession.firstPlace ? `${currentSession.firstPlace.score} pts` : '-'}
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 text-center space-y-2">
                  <span className="text-3xl">🥉</span>
                  <div className="text-[11px] font-extrabold text-amber-800">
                    {isRtl ? 'المركز الثالث (+2 نقاط)' : '3rd Place (+2 pts)'}
                  </div>
                  <div className="font-black text-slate-900 text-sm truncate">
                    {currentSession.thirdPlace?.name || '—'}
                  </div>
                  <div className="text-xs font-black text-indigo-600">
                    {currentSession.thirdPlace ? `${currentSession.thirdPlace.score} pts` : '-'}
                  </div>
                </div>
              </div>

              {/* Award Points Action Bar */}
              <div className="pt-4 border-t border-slate-100 text-center space-y-3">
                <p className="text-xs text-slate-500 font-bold">
                  {isRtl
                    ? 'يتم قيد النقاط في دفتر العمليات غير القابل للتلاعب بصورة معتمدة وموثوقة'
                    : 'Points credited to immutable ledger under source: games'}
                </p>

                {awardSuccessMsg ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-black flex items-center justify-center gap-2 max-w-md mx-auto">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>{awardSuccessMsg}</span>
                  </div>
                ) : currentSession.pointsAwarded ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-black flex items-center justify-center gap-2 max-w-md mx-auto">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>{isRtl ? 'تم اعتماد وتوزيع نقاط هذه المسابقة في الدفتر مسبقًا' : 'Points already awarded for this match'}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAwardPoints(currentSession.sessionId)}
                    disabled={isAwarding}
                    className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                  >
                    <Trophy className="w-5 h-5" />
                    <span>{isAwarding ? (isRtl ? 'جارٍ الاعتماد...' : 'Awarding...') : (isRtl ? 'اعتماد وتوزيع نقاط المسابقة' : 'Confirm & Award Points')}</span>
                  </button>
                )}
                {awardErrorMsg && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold max-w-md mx-auto">
                    {awardErrorMsg}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historical Roll of Champions */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Medal className="w-4 h-4 text-amber-500" />
                <span>{isRtl ? 'سجل الأبطال التاريخي لجميع المنافسات' : 'Historical Champions Roll'}</span>
              </h4>
            </div>

            <div className="divide-y divide-slate-100">
              {sessions.map((sess, idx) => (
                <div
                  key={sess.sessionId}
                  onClick={() => setSelectedSessionIndex(idx)}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                    selectedSessionIndex === idx ? 'bg-amber-50/40' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{sess.activityTitle}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {sess.classroomName}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {new Date(sess.startedAt).toLocaleDateString('ar-SA')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-bold shrink-0">
                    {sess.firstPlace && (
                      <span className="text-amber-800 bg-amber-100 px-2.5 py-1 rounded-xl">
                        👑 {sess.firstPlace.name} ({sess.firstPlace.score} pts)
                      </span>
                    )}
                    {sess.secondPlace && (
                      <span className="text-slate-700 bg-slate-100 px-2 py-1 rounded-xl">
                        🥈 {sess.secondPlace.name}
                      </span>
                    )}
                    {sess.thirdPlace && (
                      <span className="text-amber-900 bg-amber-50 px-2 py-1 rounded-xl">
                        🥉 {sess.thirdPlace.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
