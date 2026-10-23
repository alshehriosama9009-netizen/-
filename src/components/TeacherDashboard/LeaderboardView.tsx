/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.ts';
import {
  Trophy,
  Medal,
  Crown,
  Sparkles,
  Eye,
  EyeOff,
  Filter,
  Flame,
  Award,
} from 'lucide-react';

interface LeaderboardViewProps {
  classId: string;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ classId }) => {
  const [period, setPeriod] = useState<'all' | 'month' | 'week' | 'today'>('all');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [classroomName, setClassroomName] = useState('');
  const [leaderboardVisible, setLeaderboardVisible] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{
        classroomName: string;
        leaderboardVisible: boolean;
        students: any[];
      }>(`/leaderboard?classId=${classId}&period=${period}`);
      setStudents(data.students || []);
      setClassroomName(data.classroomName);
      setLeaderboardVisible(data.leaderboardVisible);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      fetchLeaderboard();
    }
  }, [classId, period]);

  const toggleVisibility = async () => {
    setErrorMsg(null);
    try {
      await apiRequest(`/classes/${classId}`, {
        method: 'PUT',
        body: JSON.stringify({ leaderboardVisible: !leaderboardVisible }),
      });
      setLeaderboardVisible(!leaderboardVisible);
    } catch (err: any) {
      setErrorMsg(`تعذر تحديث حالة الرؤية: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
          {errorMsg}
        </div>
      )}
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        {/* Period Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
          {[
            { id: 'all', label: 'المجموع الكلي' },
            { id: 'month', label: 'هذا الشهر' },
            { id: 'week', label: 'هذا الأسبوع' },
            { id: 'today', label: 'اليوم' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPeriod(t.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === t.id
                  ? 'bg-white text-indigo-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Teacher Visibility Toggle */}
        <button
          type="button"
          onClick={toggleVisibility}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 self-start sm:self-auto ${
            leaderboardVisible
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {leaderboardVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span>{leaderboardVisible ? 'لوحة المتصدرين مفعلة للطلاب' : 'لوحة المتصدرين مخفية عن الطلاب'}</span>
        </button>
      </div>

      {/* Top 3 Podium for All-time / Period */}
      {!loading && students.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto pt-6 pb-2 items-end">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-tr from-slate-300 to-slate-100 border-2 border-slate-300 flex items-center justify-center font-black text-slate-700 shadow-md relative">
              <Medal className="w-8 h-8 text-slate-500" />
              <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-slate-700 text-white text-[10px] font-extrabold">
                #2
              </span>
            </div>
            <h5 className="text-xs sm:text-sm font-bold text-slate-800 mt-3 text-center truncate max-w-[100px]">
              {students[1]?.name}
            </h5>
            <span className="text-xs font-extrabold text-indigo-700 mt-0.5">
              {students[1]?.points} نقطة
            </span>
          </div>

          {/* 1st Place (Winner) */}
          <div className="flex flex-col items-center -mt-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-200 border-2 border-amber-300 flex items-center justify-center font-black text-amber-950 shadow-xl shadow-amber-200 ring-4 ring-amber-100 relative">
              <Crown className="w-9 h-9 sm:w-11 sm:h-11 text-amber-600" />
              <span className="absolute -bottom-2.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black shadow-xs">
                #1 البطل
              </span>
            </div>
            <h5 className="text-xs sm:text-sm font-black text-slate-900 mt-4 text-center truncate max-w-[120px]">
              {students[0]?.name}
            </h5>
            <span className="text-sm font-black text-amber-600 mt-0.5">
              {students[0]?.points} نقطة
            </span>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-tr from-amber-200 to-amber-100 border-2 border-amber-300 flex items-center justify-center font-black text-amber-800 shadow-md relative">
              <Medal className="w-8 h-8 text-amber-700" />
              <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-amber-800 text-white text-[10px] font-extrabold">
                #3
              </span>
            </div>
            <h5 className="text-xs sm:text-sm font-bold text-slate-800 mt-3 text-center truncate max-w-[100px]">
              {students[2]?.name}
            </h5>
            <span className="text-xs font-extrabold text-indigo-700 mt-0.5">
              {students[2]?.points} نقطة
            </span>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>ترتيب أبطال الفصل ({students.length})</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            يعتمد الترتيب على إجمالي النقاط المكتسبة دون تأثر بصرف المكافآت
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">
            جارٍ تحميل الترتيب...
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            لا توجد بيانات متاحة لهذا الفصل.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {students.map((st, idx) => (
              <div
                key={st.id}
                className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                  idx === 0
                    ? 'bg-amber-50/40'
                    : idx === 1
                    ? 'bg-slate-50/60'
                    : idx === 2
                    ? 'bg-amber-50/20'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950 shadow-2xs'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-800'
                        : idx === 2
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                        {st.name}
                      </span>
                      {st.activeTitle && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                          {st.activeTitle}
                        </span>
                      )}
                    </div>
                    {st.badges && st.badges.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {st.badges.map((b: string) => (
                          <span
                            key={b}
                            className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700"
                          >
                            🏅 {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-sm sm:text-base font-black text-indigo-700 block">
                    {st.points} نقطة
                  </span>
                  {st.availableBalance !== undefined && (
                    <span className="text-[10px] text-slate-400">
                      رصيد الصرف المتاح: {st.availableBalance}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
