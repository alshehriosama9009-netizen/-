/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * Participating Students & Submissions Section
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

import React, { useState, useEffect } from 'react';
import { GameSession, GameParticipant } from '../../../types/games.ts';
import { Classroom, Student } from '../../../types/index.ts';
import { useLanguage } from '../../../context/LanguageContext.tsx';
import { apiRequest } from '../../../api/client.ts';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  Award,
  Filter,
  Eye,
  Calendar,
  Layers,
} from 'lucide-react';

interface ParticipantsSectionProps {
  classroom: Classroom;
  students: Student[];
}

export const ParticipantsSection: React.FC<ParticipantsSectionProps> = ({
  classroom,
  students,
}) => {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
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
    fetchSessions();
  }, []);

  // Collect participants across sessions or selected session
  const activeSession = sessions.find((s) => s.sessionId === selectedSessionId);
  const participantsList: Array<{
    sessionId: string;
    activityTitle: string;
    studentId: string;
    studentName: string;
    totalScore: number;
    totalTimeSeconds: number;
    answersCount: number;
    date: string;
  }> = [];

  sessions.forEach((s) => {
    if (selectedSessionId !== 'all' && s.sessionId !== selectedSessionId) return;
    (s.allParticipants || []).forEach((p: any) => {
      participantsList.push({
        sessionId: s.sessionId,
        activityTitle: s.activityTitle,
        studentId: p.studentId,
        studentName: p.studentName,
        totalScore: p.totalScore,
        totalTimeSeconds: p.totalTimeSeconds,
        answersCount: (p.answers || []).length,
        date: s.startedAt,
      });
    });
  });

  const filtered = participantsList.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.studentName.toLowerCase().includes(q) || p.activityTitle.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>{isRtl ? 'الطلاب المشاركون ومتابعة الاستجابات' : 'Participating Students & Submissions'}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isRtl
              ? 'متابعة مشاركات الطلاب الفعلية، وسجل الإجابات والدرجات المحققة بدقة وموثوقية'
              : 'Track student participants, submission counts, and scores in real time'}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-black">
            {students.length} {isRtl ? 'طالب بالفصل' : 'Students in Class'}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-black">
            {filtered.length} {isRtl ? 'مشاركة مسجلة' : 'Submissions'}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 text-xs font-bold">
        <div>
          <label className="block text-slate-500 mb-1">{isRtl ? 'اختر النشاط أو المسابقة:' : 'Select Activity / Session:'}</label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{isRtl ? 'جميع الأنشطة والمسابقات' : 'All Sessions'}</option>
            {sessions.map((s) => (
              <option key={s.sessionId} value={s.sessionId}>
                {s.activityTitle} ({new Date(s.startedAt).toLocaleDateString('ar-SA')})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-500 mb-1">{isRtl ? 'بحث باسم الطالب:' : 'Search by Student Name:'}</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute top-2.5 right-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'اكتب اسم الطالب للبحث...' : 'Student name...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>{isRtl ? `قائمة الطلاب المشاركين (${filtered.length})` : `Participants Roster (${filtered.length})`}</span>
          </h4>
          <span className="text-[11px] font-bold text-slate-400">
            {isRtl ? 'النتائج مربوطة بقاعدة البيانات والحسابات الحقيقية' : 'Real database-backed entries'}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            {isRtl ? 'لا توجد مشاركات مسجلة لهذا النشاط بعد.' : 'No participants found for this activity yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">{isRtl ? 'اسم الطالب' : 'Student Name'}</th>
                  <th className="py-3 px-4">{isRtl ? 'النشاط / اللعبة' : 'Activity'}</th>
                  <th className="py-3 px-4">{isRtl ? 'الأسئلة المجابة' : 'Answered'}</th>
                  <th className="py-3 px-4">{isRtl ? 'مجموع النقاط' : 'Score'}</th>
                  <th className="py-3 px-4">{isRtl ? 'الوقت الإجمالي' : 'Total Time'}</th>
                  <th className="py-3 px-4">{isRtl ? 'تاريخ المشاركة' : 'Date'}</th>
                  <th className="py-3 px-4">{isRtl ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                {filtered.map((p, idx) => (
                  <tr key={`${p.sessionId}_${p.studentId}_${idx}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{p.studentName}</span>
                    </td>
                    <td className="py-3.5 px-4 text-indigo-700">{p.activityTitle}</td>
                    <td className="py-3.5 px-4">{p.answersCount} {isRtl ? 'سؤال' : 'Q'}</td>
                    <td className="py-3.5 px-4 font-black text-emerald-600">+{p.totalScore} {t('points')}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">{p.totalTimeSeconds}s</td>
                    <td className="py-3.5 px-4 text-slate-400 font-medium">
                      {new Date(p.date).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isRtl ? 'مكتمل ومسجل' : 'Completed'}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
