/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, HomeworkRecord } from '../../types/index.ts';
import { calculateHomeworkPoints, HomeworkQuality } from '../../utils/rules.ts';
import { apiRequest } from '../../api/client.ts';
import { BookOpen, Plus, Calendar, CheckCircle2, Clock, X, Info } from 'lucide-react';

interface HomeworkManagementProps {
  classId: string;
  students: Student[];
  onRefresh: () => void;
}

export const HomeworkManagement: React.FC<HomeworkManagementProps> = ({
  classId,
  students,
  onRefresh,
}) => {
  const [homeworks, setHomeworks] = useState<HomeworkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // New Homework state
  const [hwTitle, setHwTitle] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  // Map of student evaluations: { [studentId]: { quality: HomeworkQuality, onTime: boolean } }
  const [evaluations, setEvaluations] = useState<
    Record<string, { quality: HomeworkQuality; onTime: boolean }>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchHomework = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<HomeworkRecord[]>(`/homework?classId=${classId}`);
      setHomeworks(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      fetchHomework();
    }
  }, [classId]);

  const handleOpenCreate = () => {
    setIsCreating(true);
    const initial: Record<string, { quality: HomeworkQuality; onTime: boolean }> = {};
    students.forEach((s) => {
      initial[s.id] = { quality: 'complete_correct', onTime: true };
    });
    setEvaluations(initial);
  };

  const handleQualityChange = (studentId: string, quality: HomeworkQuality) => {
    setEvaluations((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { onTime: true }),
        quality,
      },
    }));
  };

  const handleOnTimeToggle = (studentId: string, onTime: boolean) => {
    setEvaluations((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { quality: 'complete_correct' }),
        onTime,
      },
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim()) return;

    setSubmitting(true);
    setStatusBanner(null);
    try {
      const submissionsPayload = students.map((s) => {
        const ev = evaluations[s.id] || { quality: 'complete_correct', onTime: true };
        return {
          studentId: s.id,
          quality: ev.quality,
          submittedOnTime: ev.onTime,
        };
      });

      await apiRequest('/homework', {
        method: 'POST',
        body: JSON.stringify({
          classId,
          title: hwTitle,
          dueDate,
          submissions: submissionsPayload,
        }),
      });

      setStatusBanner({
        type: 'success',
        text: 'تم رصد تقييم الواجب واحتساب النقاط التحفيزية بنجاح.',
      });
      setIsCreating(false);
      setHwTitle('');
      fetchHomework();
      onRefresh();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
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
      {/* Homework Calculation Rules Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-950">
              معايير احتساب نقاط الواجبات (الحد الأعلى الإجمالي 5 نقاط):
            </h4>
            <div className="flex flex-wrap gap-2 text-[11px] text-amber-900 mt-1.5 font-medium">
              <span className="bg-white px-2 py-0.5 rounded-md border border-amber-300">
                مكتمل وصحيح ⬅️ <strong>5 نقاط</strong>
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-amber-300">
                أخطاء بسيطة ⬅️ <strong>3 نقاط</strong> (+1 موعد = 4)
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-amber-300">
                أخطاء كثيرة ⬅️ <strong>1 نقطة</strong> (+1 موعد = 2)
              </span>
              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-bold">
                * مكافأة التسليم في الموعد (+1) لا تتجاوز سقف الـ 5 نقاط.
              </span>
            </div>
          </div>
        </div>

        {!isCreating && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-200 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>رصد واجب جديد</span>
          </button>
        )}
      </div>

      {/* Create Homework Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-5 sm:p-6 bg-white rounded-3xl border border-amber-200 shadow-xl space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>رصد واجب دراسي جديد وتقييم أداء الطلاب</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                عنوان الواجب أو المهمة:
              </label>
              <input
                type="text"
                required
                value={hwTitle}
                onChange={(e) => setHwTitle(e.target.value)}
                placeholder="مثال: واجب الرياضيات: تمارين الضرب والقسمة"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                موعد التسليم:
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Student Evaluation List */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              تقييم أداء الطلاب واحتساب النقاط:
            </label>
            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
              {students.map((student) => {
                const ev = evaluations[student.id] || { quality: 'complete_correct', onTime: true };
                const calc = calculateHomeworkPoints(ev.quality, ev.onTime);

                return (
                  <div
                    key={student.id}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 font-bold text-xs flex items-center justify-center">
                        {student.studentCode}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {student.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quality Select */}
                      <select
                        value={ev.quality}
                        onChange={(e) => handleQualityChange(student.id, e.target.value as HomeworkQuality)}
                        className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1"
                      >
                        <option value="complete_correct">مكتمل وصحيح (5)</option>
                        <option value="minor_errors">أخطاء بسيطة (3)</option>
                        <option value="many_errors">أخطاء كثيرة (1)</option>
                      </select>

                      {/* On-Time Checkbox */}
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ev.onTime}
                          onChange={(e) => handleOnTimeToggle(student.id, e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>في الموعد (+1)</span>
                      </label>

                      {/* Final Points */}
                      <span className="w-20 text-center text-xs font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                        +{calc.totalPoints} نقاط
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md shadow-amber-200 transition-all disabled:opacity-50"
            >
              {submitting ? 'جارٍ الرصد...' : 'حفظ تقييم الواجب ومنح النقاط'}
            </button>
          </div>
        </form>
      )}

      {/* Homework List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>سجل الواجبات والمهام ({homeworks.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">
            جارٍ تحميل سجل الواجبات...
          </div>
        ) : homeworks.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            لم يتم رصد أي واجبات لهذا الفصل بعد. اضغط «رصد واجب جديد» أعلاه.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {homeworks.map((hw) => (
              <div key={hw.id} className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      {hw.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      تاريخ التسليم: {hw.dueDate} | عدد الطلاب المسلّمين: {hw.submissions.length}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                  {hw.submissions.map((sub) => (
                    <div
                      key={sub.studentId}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                    >
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-slate-800 block truncate max-w-[100px]">
                          {sub.studentName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {sub.quality === 'complete_correct'
                            ? 'مكتمل'
                            : sub.quality === 'minor_errors'
                            ? 'أخطاء بسيطة'
                            : 'أخطاء كثيرة'}{' '}
                          {sub.submittedOnTime ? '⏱️' : ''}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-amber-700 bg-white px-2 py-0.5 rounded-md border border-amber-100">
                        +{sub.pointsAwarded}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
