/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, TestRecord } from '../../types/index.ts';
import { calculateTestPoints } from '../../utils/rules.ts';
import { apiRequest } from '../../api/client.ts';
import {
  FileText,
  Plus,
  Calendar,
  CheckCircle2,
  Edit2,
  Save,
  X,
  Sparkles,
  Info,
} from 'lucide-react';

interface QuizzesManagementProps {
  classId: string;
  students: Student[];
  onRefresh: () => void;
}

export const QuizzesManagement: React.FC<QuizzesManagementProps> = ({
  classId,
  students,
  onRefresh,
}) => {
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  // New Test form state
  const [testTitle, setTestTitle] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  // Record student scores out of 20: { [studentId]: score }
  const [scores, setScores] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<TestRecord[]>(`/tests?classId=${classId}`);
      setTests(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      fetchTests();
    }
  }, [classId]);

  const handleScoreChange = (studentId: string, val: string) => {
    const num = Math.min(20, Math.max(0, parseFloat(val) || 0));
    setScores((prev) => ({ ...prev, [studentId]: num }));
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTitle.trim()) return;

    setSubmitting(true);
    setStatusBanner(null);
    try {
      const gradesPayload = students.map((s) => ({
        studentId: s.id,
        scoreOutOf20: scores[s.id] !== undefined ? scores[s.id] : 15,
      }));

      await apiRequest('/tests', {
        method: 'POST',
        body: JSON.stringify({
          classId,
          title: testTitle,
          date: testDate,
          grades: gradesPayload,
        }),
      });

      setStatusBanner({
        type: 'success',
        text: 'تم رصد الاختبار واحتساب النقاط تلقائيًا لجميع الطلاب بنجاح.',
      });
      setIsCreating(false);
      setTestTitle('');
      setScores({});
      fetchTests();
      onRefresh();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTestGrades = async (test: TestRecord) => {
    setSubmitting(true);
    setStatusBanner(null);
    try {
      const updatedGrades = test.grades.map((g) => ({
        studentId: g.studentId,
        scoreOutOf20: scores[g.studentId] !== undefined ? scores[g.studentId] : g.scoreOutOf20,
      }));

      await apiRequest(`/tests/${test.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          updatedGrades,
        }),
      });

      setStatusBanner({
        type: 'success',
        text: 'تم تعديل الدرجات وإعادة احتساب النقاط بدقة ودون تكرار.',
      });
      setEditingTestId(null);
      fetchTests();
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
      {/* Conversion Table Notice Box */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-indigo-950">
              نظام تحويل درجات الاختبارات إلى نقاط تحفيزية (الدرجة من 20):
            </h4>
            <div className="flex flex-wrap gap-2 text-[11px] text-indigo-900 mt-1.5 font-medium">
              <span className="bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                [19 - 20] ⬅️ <strong>10 نقاط</strong>
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                [17 - أقل من 19) ⬅️ <strong>7 نقاط</strong>
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                [15 - أقل من 17) ⬅️ <strong>5 نقاط</strong>
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                [10 - أقل من 15) ⬅️ <strong>3 نقاط</strong>
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                أقل من 10 مع المحاولة ⬅️ <strong>نقطة واحدة</strong>
              </span>
            </div>
          </div>
        </div>

        {!isCreating && (
          <button
            type="button"
            onClick={() => {
              setIsCreating(true);
              // Initialize default scores
              const initial: Record<string, number> = {};
              students.forEach((s) => (initial[s.id] = 18));
              setScores(initial);
            }}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>رصد اختبار جديد</span>
          </button>
        )}
      </div>

      {/* Create New Test Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateTest}
          className="p-5 sm:p-6 bg-white rounded-3xl border border-indigo-200 shadow-xl space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>تسجيل اختبار فصلي جديد ورصد الدرجات</span>
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
                عنوان الاختبار:
              </label>
              <input
                type="text"
                required
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="مثال: الاختبار الفصلي الأول - مادة العلوم"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ الاختبار:
              </label>
              <input
                type="date"
                required
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Student Scores Table */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              درجات الطلاب من (20) — يتم احتساب النقاط تلقائيًا:
            </label>
            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
              {students.map((student) => {
                const currentScore = scores[student.id] !== undefined ? scores[student.id] : 18;
                const convertedPoints = calculateTestPoints(currentScore, true);

                return (
                  <div
                    key={student.id}
                    className="p-3 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {student.studentCode}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {student.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="20"
                          value={currentScore}
                          onChange={(e) => handleScoreChange(student.id, e.target.value)}
                          className="w-20 px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 text-center focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-xs text-slate-500 font-medium">/ 20</span>
                      </div>

                      <div className="w-24 text-left">
                        <span className="inline-block text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          +{convertedPoints} نقاط
                        </span>
                      </div>
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
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
            >
              {submitting ? 'جارٍ الرصد...' : 'حفظ الاختبار ومنح النقاط'}
            </button>
          </div>
        </form>
      )}

      {/* Tests Records List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>سجل الاختبارات المرصودة ({tests.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">
            جارٍ تحميل سجل الاختبارات...
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            لم يتم رصد أي اختبارات لهذا الفصل بعد. اضغط «رصد اختبار جديد» أعلاه.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tests.map((test) => {
              const isEditing = editingTestId === test.id;

              return (
                <div key={test.id} className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {test.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        التاريخ: {test.date} | عدد الطلاب المختبرين: {test.grades.length}
                      </p>
                    </div>

                    <div>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingTestId(null)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateTestGrades(test)}
                            disabled={submitting}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>حفظ التعديل</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTestId(test.id);
                            const current: Record<string, number> = {};
                            test.grades.forEach((g) => (current[g.studentId] = g.scoreOutOf20));
                            setScores(current);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تعديل الدرجات</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grades grid preview */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                    {test.grades.map((grade) => {
                      const scoreValue = isEditing
                        ? scores[grade.studentId] !== undefined
                          ? scores[grade.studentId]
                          : grade.scoreOutOf20
                        : grade.scoreOutOf20;
                      const calculatedPoints = calculateTestPoints(scoreValue, true);

                      return (
                        <div
                          key={grade.studentId}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                        >
                          <div className="text-right">
                            <span className="text-[11px] font-bold text-slate-800 block truncate max-w-[100px]">
                              {grade.studentName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {grade.scoreOutOf20} / 20
                            </span>
                          </div>

                          {isEditing ? (
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="20"
                              value={scoreValue}
                              onChange={(e) => handleScoreChange(grade.studentId, e.target.value)}
                              className="w-14 px-1.5 py-0.5 text-xs font-bold text-center border border-indigo-300 rounded bg-white"
                            />
                          ) : (
                            <span className="text-xs font-extrabold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                              +{calculatedPoints}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
