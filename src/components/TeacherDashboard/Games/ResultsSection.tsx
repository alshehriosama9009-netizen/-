/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * Results & Rankings Leaderboard Section
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

import React, { useState, useEffect } from 'react';
import { Classroom, Student } from '../../../types/index.ts';
import { useLanguage } from '../../../context/LanguageContext.tsx';
import { apiRequest } from '../../../api/client.ts';
import {
  Trophy,
  Medal,
  Clock,
  ArrowUpDown,
  Search,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface ResultsSectionProps {
  classroom: Classroom;
  students: Student[];
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  classroom,
  students,
}) => {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
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
    fetchResults();
  }, []);

  // Compute aggregated scores per student if 'all' or selected session
  const studentStats: Record<string, {
    studentId: string;
    studentName: string;
    totalGamesScore: number;
    totalTimeSeconds: number;
    participationsCount: number;
    firstPlaces: number;
    secondPlaces: number;
    thirdPlaces: number;
  }> = {};

  // Initialize for all class students
  students.forEach((s) => {
    studentStats[s.id] = {
      studentId: s.id,
      studentName: s.name,
      totalGamesScore: 0,
      totalTimeSeconds: 0,
      participationsCount: 0,
      firstPlaces: 0,
      secondPlaces: 0,
      thirdPlaces: 0,
    };
  });

  sessions.forEach((sess) => {
    if (selectedSessionId !== 'all' && sess.sessionId !== selectedSessionId) return;

    if (sess.firstPlace && studentStats[sess.firstPlace.id]) {
      studentStats[sess.firstPlace.id].firstPlaces++;
    }
    if (sess.secondPlace && studentStats[sess.secondPlace.id]) {
      studentStats[sess.secondPlace.id].secondPlaces++;
    }
    if (sess.thirdPlace && studentStats[sess.thirdPlace.id]) {
      studentStats[sess.thirdPlace.id].thirdPlaces++;
    }

    (sess.allParticipants || []).forEach((p: any) => {
      if (!studentStats[p.studentId]) {
        studentStats[p.studentId] = {
          studentId: p.studentId,
          studentName: p.studentName,
          totalGamesScore: 0,
          totalTimeSeconds: 0,
          participationsCount: 0,
          firstPlaces: 0,
          secondPlaces: 0,
          thirdPlaces: 0,
        };
      }
      studentStats[p.studentId].totalGamesScore += p.totalScore || 0;
      studentStats[p.studentId].totalTimeSeconds += p.totalTimeSeconds || 0;
      studentStats[p.studentId].participationsCount += 1;
    });
  });

  // Sort students strictly by:
  // 1. Highest total score
  // 2. Tie-break: lowest total time taken
  const rankedList = Object.values(studentStats).sort((a, b) => {
    if (b.totalGamesScore !== a.totalGamesScore) {
      return b.totalGamesScore - a.totalGamesScore;
    }
    return a.totalTimeSeconds - b.totalTimeSeconds;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span>{isRtl ? 'النتائج والترتيب التنافسي للطلاب' : 'Results & Competitive Rankings'}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isRtl
              ? 'ترتيب دقيق مبني على النقاط الفعلية مع قاعدة حسم التعادل بالأسرع وقتًا'
              : 'Accurate rankings based on real scores with tie-break rule by fastest time'}
          </p>
        </div>

        {/* Tie-break Explanation Badge */}
        <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-[11px] font-bold text-amber-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {isRtl
              ? 'قاعدة التعادل: عند تساوي النقاط، يفوز الطالب الأقل استغراقًا للوقت.'
              : 'Tie-break: Fastest completion time breaks equal points.'}
          </span>
        </div>
      </div>

      {/* Session Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{isRtl ? 'عرض نتائج:' : 'Filter Results:'}</span>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{isRtl ? 'المجموع التراكمي لجميع الأنشطة' : 'Cumulative (All Activities)'}</option>
            {sessions.map((s) => (
              <option key={s.sessionId} value={s.sessionId}>
                {s.activityTitle} ({new Date(s.startedAt).toLocaleDateString('ar-SA')})
              </option>
            ))}
          </select>
        </div>

        <span className="text-slate-400">
          {isRtl ? `إجمالي المشاركين: ${rankedList.length} بطل` : `Total Participants: ${rankedList.length}`}
        </span>
      </div>

      {/* Rankings Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <Medal className="w-4 h-4 text-indigo-600" />
            <span>{isRtl ? `جدول الترتيب والدرجات (${classroom.name})` : `Rankings Table (${classroom.name})`}</span>
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">{isRtl ? 'المركز' : 'Rank'}</th>
                <th className="py-3 px-4">{isRtl ? 'اسم الطالب' : 'Student Name'}</th>
                <th className="py-3 px-4">{isRtl ? 'مجموع نقاط الألعاب' : 'Game Points'}</th>
                <th className="py-3 px-4">{isRtl ? 'الوقت الإجمالي' : 'Total Time'}</th>
                <th className="py-3 px-4">{isRtl ? 'المشاركات' : 'Played'}</th>
                <th className="py-3 px-4">{isRtl ? 'الميداليات (🥇/🥈/🥉)' : 'Medals'}</th>
                <th className="py-3 px-4">{isRtl ? 'التقييم' : 'Performance'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
              {rankedList.map((st, idx) => {
                const isFirst = idx === 0 && st.totalGamesScore > 0;
                const isSecond = idx === 1 && st.totalGamesScore > 0;
                const isThird = idx === 2 && st.totalGamesScore > 0;

                return (
                  <tr
                    key={st.studentId}
                    className={`transition-colors ${
                      isFirst
                        ? 'bg-amber-50/40 hover:bg-amber-50/70'
                        : isSecond
                        ? 'bg-slate-50/80 hover:bg-slate-100'
                        : isThird
                        ? 'bg-amber-50/20 hover:bg-amber-50/40'
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      {isFirst ? (
                        <span className="w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black flex items-center justify-center text-xs shadow-xs">
                          👑 1
                        </span>
                      ) : isSecond ? (
                        <span className="w-7 h-7 rounded-full bg-slate-300 text-slate-900 font-black flex items-center justify-center text-xs">
                          🥈 2
                        </span>
                      ) : isThird ? (
                        <span className="w-7 h-7 rounded-full bg-amber-200 text-amber-900 font-black flex items-center justify-center text-xs">
                          🥉 3
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[11px]">
                          {idx + 1}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-black text-slate-900">
                      <span>{st.studentName}</span>
                    </td>

                    <td className="py-3.5 px-4 font-black text-emerald-600 text-sm">
                      +{st.totalGamesScore} {t('points')}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {st.totalTimeSeconds}s
                    </td>

                    <td className="py-3.5 px-4">{st.participationsCount} {isRtl ? 'نشاط' : 'act'}</td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">🥇 {st.firstPlaces}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">🥈 {st.secondPlaces}</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 font-bold">🥉 {st.thirdPlaces}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {st.totalGamesScore >= 5 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          {isRtl ? 'بطل متميز 🌟' : 'Excellent'}
                        </span>
                      ) : st.totalGamesScore > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                          {isRtl ? 'مشارك نشط ⚡' : 'Active'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                          {isRtl ? 'بانتظار المشاركة' : 'Pending'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
