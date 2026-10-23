/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Student, Classroom } from '../../types/index.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { AwardPointsModal } from './AwardPointsModal.tsx';
import { StudentHistoryModal } from './StudentHistoryModal.tsx';
import { apiRequest } from '../../api/client.ts';
import {
  Users,
  UserPlus,
  Search,
  ArrowUpDown,
  Award,
  History,
  MoveRight,
  Archive,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Coins,
  Sparkles,
  ShoppingBag,
  X,
} from 'lucide-react';

interface StudentsRosterProps {
  classrooms: Classroom[];
  activeClass: Classroom | null;
  students: Student[];
  onRefresh: () => void;
}

export const StudentsRoster: React.FC<StudentsRosterProps> = ({
  classrooms,
  activeClass,
  students,
  onRefresh,
}) => {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'balance'>('points');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Modals
  const [awardModalOpen, setAwardModalOpen] = useState(false);
  const [studentsForPoints, setStudentsForPoints] = useState<Student[]>([]);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);

  // Add Student Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentCode, setNewStudentCode] = useState('');
  const [newStudentPin, setNewStudentPin] = useState('');
  const [addingSubmitting, setAddingSubmitting] = useState(false);

  // Bulk Add Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Transfer Student Modal
  const [transferStudent, setTransferStudent] = useState<Student | null>(null);
  const [targetClassId, setTargetClassId] = useState('');
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!activeClass) {
    return (
      <div className="text-center py-12 text-slate-500 text-xs">
        {language === 'ar' ? 'يرجى اختيار أو إنشاء فصل دراسي أولًا.' : 'Please select or create a classroom first.'}
      </div>
    );
  }

  // Filter & Sort
  const filtered = students
    .filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        s.studentCode.toLowerCase().includes(searchTerm.toLowerCase().trim())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, language);
      if (sortBy === 'balance') return b.availableBalance - a.availableBalance;
      return b.historicalAchievement - a.historicalAchievement; // by default sort by total earned
    });

  const isAllSelected = filtered.length > 0 && selectedStudentIds.length === filtered.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filtered.map((s) => s.id));
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleOpenAwardForSelected = () => {
    const list = students.filter((s) => selectedStudentIds.includes(s.id));
    if (list.length === 0) return;
    setStudentsForPoints(list);
    setAwardModalOpen(true);
  };

  const handleOpenAwardForSingle = (student: Student) => {
    setStudentsForPoints([student]);
    setAwardModalOpen(true);
  };

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    setAddingSubmitting(true);
    setStatusBanner(null);
    try {
      await apiRequest(`/classes/${activeClass.id}/students`, {
        method: 'POST',
        body: JSON.stringify({
          name: newStudentName,
          studentCode: newStudentCode || undefined,
          pinCode: newStudentPin || undefined,
        }),
      });
      setAddModalOpen(false);
      setNewStudentName('');
      setNewStudentCode('');
      setNewStudentPin('');
      setStatusBanner({
        type: 'success',
        text: language === 'ar' ? 'تمت إضافة الطالب بنجاح.' : 'Student added successfully.',
      });
      onRefresh();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
    } finally {
      setAddingSubmitting(false);
    }
  };

  const handleBulkAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = bulkText
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) return;

    setBulkSubmitting(true);
    setStatusBanner(null);
    try {
      const res = await apiRequest(`/classes/${activeClass.id}/students/bulk`, {
        method: 'POST',
        body: JSON.stringify({ studentNames: names }),
      });
      setStatusBanner({
        type: 'success',
        text: language === 'ar' ? `تمت إضافة ${res.addedCount} طالبًا بنجاح!` : `Successfully added ${res.addedCount} students!`,
      });
      setBulkModalOpen(false);
      setBulkText('');
      onRefresh();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferStudent || !targetClassId) return;

    setStatusBanner(null);
    try {
      await apiRequest(`/students/${transferStudent.id}`, {
        method: 'PUT',
        body: JSON.stringify({ targetClassId }),
      });
      setStatusBanner({
        type: 'success',
        text: language === 'ar' ? 'تم نقل الطالب بنجاح مع الاحتفاظ بكامل سجله التاريخي ونقاطه.' : 'Student transferred successfully with full ledger preserved.',
      });
      setTransferStudent(null);
      setTargetClassId('');
      onRefresh();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
    }
  };

  const handleArchiveStudent = async (student: Student) => {
    setStatusBanner(null);
    try {
      await apiRequest(`/students/${student.id}/archive`, { method: 'POST' });
      setStatusBanner({
        type: 'success',
        text: language === 'ar' ? `تمت أرشفة الطالب «${student.name}» مع حفظ سجله التاريخي بأمان.` : `Student "${student.name}" archived safely.`,
      });
      onRefresh();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
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
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-slate-400 hover:text-slate-600 px-2"
          >
            ✕
          </button>
        </div>
      )}
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        {/* Search & Sort */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5"
            >
              <option value="points">{t('sortPoints')}</option>
              <option value="balance">{t('sortBalance')}</option>
              <option value="name">{t('sortName')}</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedStudentIds.length > 0 && (
            <button
              type="button"
              onClick={handleOpenAwardForSelected}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5 transition-all animate-pulse"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>{t('awardSelected', { count: selectedStudentIds.length })}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('newStudentBtn')}</span>
          </button>

          <button
            type="button"
            onClick={() => setBulkModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-all"
            title="Bulk Add"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">{t('bulkAddBtn')}</span>
          </button>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-slate-400 hover:text-indigo-600 flex items-center gap-1.5 text-xs font-bold"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-indigo-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>{t('selectAll')} ({filtered.length})</span>
            </button>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {t('classroomLabel')} <strong>{activeClass.name}</strong> ({activeClass.gradeLevel})
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            لا يوجد طلاب مطابقين للبحث. يمكنك إضافة طلاب جدد بالزر أعلاه.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((student) => {
              const isSelected = selectedStudentIds.includes(student.id);

              return (
                <div
                  key={student.id}
                  className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSelectStudent(student.id)}
                      className="text-slate-400 hover:text-indigo-600"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-xs text-indigo-700 shadow-2xs">
                      {student.studentCode}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {student.name}
                        </span>
                        {student.activeTitle && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            {student.activeTitle}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span>رمز الدخول (PIN): <strong className="font-mono text-slate-600">{student.pinCode}</strong></span>
                        <span>•</span>
                        <span>تاريخ الانضمام: {new Date(student.createdAt).toLocaleDateString('ar-SA')}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Balances Pill */}
                  <div className="flex items-center gap-3 self-start md:self-auto">
                    <div className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
                      <span className="text-[10px] text-indigo-700 font-bold block">{t('availableBalance')}</span>
                      <span className="text-xs sm:text-sm font-black text-indigo-900 block">
                        {student.availableBalance}
                      </span>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                      <span className="text-[10px] text-emerald-700 font-bold block">{t('totalEarnedPoints')}</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-900 block">
                        {student.historicalAchievement}
                      </span>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-center">
                      <span className="text-[10px] text-amber-700 font-bold block">{t('spentPoints')}</span>
                      <span className="text-xs sm:text-sm font-black text-amber-900 block">
                        {student.totalSpent}
                      </span>
                    </div>

                    {/* Action Buttons for this student */}
                    <div className="flex items-center gap-1 mr-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAwardForSingle(student)}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1"
                        title={t('awardSingleBtn')}
                      >
                        <Award className="w-3.5 h-3.5 text-amber-300" />
                        <span>{t('awardSingleBtn')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHistoryStudent(student)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                        title={t('historyBtnTitle')}
                      >
                        <History className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTransferStudent(student);
                          const otherClass = classrooms.find((c) => c.id !== student.classId);
                          setTargetClassId(otherClass ? otherClass.id : '');
                        }}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                        title={t('transferBtnTitle')}
                      >
                        <MoveRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleArchiveStudent(student)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title={t('archiveBtnTitle')}
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Award Points Modal */}
      <AwardPointsModal
        isOpen={awardModalOpen}
        onClose={() => setAwardModalOpen(false)}
        classId={activeClass.id}
        selectedStudents={studentsForPoints}
        onPointsAwarded={() => {
          setSelectedStudentIds([]);
          onRefresh();
        }}
      />

      {/* History Ledger Modal */}
      <StudentHistoryModal
        isOpen={!!historyStudent}
        onClose={() => setHistoryStudent(null)}
        student={historyStudent}
        onRefresh={onRefresh}
      />

      {/* Add Single Student Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>إضافة بطل جديد إلى الفصل</span>
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الطالب الكامل:
                </label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="مثال: يوسف خالد الغامدي"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رمز الطالب (تلقائي):
                  </label>
                  <input
                    type="text"
                    value={newStudentCode}
                    onChange={(e) => setNewStudentCode(e.target.value)}
                    placeholder={`S${100 + students.length + 1}`}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رمز الدخول (PIN):
                  </label>
                  <input
                    type="text"
                    value={newStudentPin}
                    onChange={(e) => setNewStudentPin(e.target.value)}
                    placeholder="تلقائي 4 أرقام"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={addingSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-2xs"
                >
                  {addingSubmitting ? 'جارٍ الإضافة...' : 'إضافة الطالب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Students Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>إضافة جماعية للطلاب (نسخ ولصق)</span>
              </h3>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              ألصق أسماء الطلاب (اسم طالب في كل سطر). سيقوم النظام تلقائيًا بتوليد رموز الطلاب وأكواد PIN فوريًا لتوفير وقتك.
            </p>

            <form onSubmit={handleBulkAddSubmit} className="space-y-4">
              <textarea
                rows={6}
                required
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="راشد السبيعي&#10;حمد الشريف&#10;ناصر العنزي"
                className="w-full p-3 text-xs rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs"
                >
                  {bulkSubmitting ? 'جارٍ الإضافة...' : 'إضافة الأسماء الآن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Student Modal */}
      {transferStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 space-y-4">
            <h4 className="text-xs font-bold text-slate-900">
              نقل الطالب «{transferStudent.name}» إلى فصل آخر:
            </h4>
            <p className="text-xs text-slate-500">
              سيتم نقل الطالب مع الاحتفاظ التام بكامل رصيده ونقاطه وسجله التاريخي دون أي ضياع للبيانات.
            </p>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اختر الفصل المستهدف:
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold"
                >
                  {classrooms
                    .filter((c) => c.id !== transferStudent.classId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.gradeLevel})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransferStudent(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs"
                >
                  تأكيد النقل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
