/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * Central Question Bank Manager
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

import React, { useState } from 'react';
import {
  Question,
  CurriculumSubject,
  CurriculumGrade,
  CurriculumLesson,
  QuestionDifficulty,
  QuestionType,
} from '../../../types/games.ts';
import { useLanguage } from '../../../context/LanguageContext.tsx';
import { apiRequest } from '../../../api/client.ts';
import {
  Search,
  Plus,
  Star,
  CheckCircle2,
  Filter,
  Trash2,
  Edit3,
  Sparkles,
  BookOpen,
  FileText,
  HelpCircle,
  X,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface QuestionBankManagerProps {
  questions: Question[];
  subjects: CurriculumSubject[];
  grades: CurriculumGrade[];
  onRefreshQuestions: () => void;
  preselectedLesson?: CurriculumLesson | null;
  onClearPreselectedLesson?: () => void;
}

export const QuestionBankManager: React.FC<QuestionBankManagerProps> = ({
  questions,
  subjects,
  grades,
  onRefreshQuestions,
  preselectedLesson,
  onClearPreselectedLesson,
}) => {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  // Filters
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'approved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // New Question Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formSubjectId, setFormSubjectId] = useState(subjects[0]?.id || 'science');
  const [formGradeId, setFormGradeId] = useState(grades[1]?.id || 'elem_5');
  const [formTermId, setFormTermId] = useState('term_1');
  const [formUnitName, setFormUnitName] = useState('');
  const [formLessonTitle, setFormLessonTitle] = useState('');
  const [formType, setFormType] = useState<QuestionType>('multiple_choice');
  const [formDifficulty, setFormDifficulty] = useState<QuestionDifficulty>('easy');
  const [formQuestionText, setFormQuestionText] = useState('');
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', '']);
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('');
  const [formExplanation, setFormExplanation] = useState('');
  const [formSourceRef, setFormSourceRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-fill from preselected lesson if passed from Curriculum tab
  React.useEffect(() => {
    if (preselectedLesson) {
      setFormSubjectId(preselectedLesson.subjectId);
      setFormGradeId(preselectedLesson.gradeId);
      setFormTermId(preselectedLesson.termId);
      setFormUnitName(preselectedLesson.unitName);
      setFormLessonTitle(preselectedLesson.lessonTitle);
      if (preselectedLesson.sourceReference) {
        setFormSourceRef(preselectedLesson.sourceReference);
      }
      if (preselectedLesson.rawContent) {
        setFormQuestionText(`سؤال تطبيقي مستنبط من درس «${preselectedLesson.lessonTitle}»: `);
        setFormExplanation(preselectedLesson.rawContent);
      }
      setIsAddModalOpen(true);
      if (onClearPreselectedLesson) {
        onClearPreselectedLesson();
      }
    }
  }, [preselectedLesson]);

  // Filter questions
  const filtered = questions.filter((q) => {
    if (selectedSubjectId !== 'all' && q.subjectId !== selectedSubjectId) return false;
    if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
    if (selectedType !== 'all' && q.type !== selectedType) return false;
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    if (favoritesOnly && !q.isFavorite) return false;
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase().trim();
      const matchText = q.questionText.toLowerCase().includes(s);
      const matchUnit = q.unitName.toLowerCase().includes(s);
      const matchLesson = q.lessonTitle.toLowerCase().includes(s);
      if (!matchText && !matchUnit && !matchLesson) return false;
    }
    return true;
  });

  // Handle Add Question Submit
  const handleAddQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestionText.trim() || !formUnitName.trim() || !formLessonTitle.trim()) {
      setStatusBanner({ type: 'error', text: isRtl ? 'يرجى إكمال الحقول الإلزامية' : 'Please fill all required fields' });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('/questions', {
        method: 'POST',
        body: JSON.stringify({
          subjectId: formSubjectId,
          gradeId: formGradeId,
          termId: formTermId,
          unitName: formUnitName,
          lessonTitle: formLessonTitle,
          type: formType,
          difficulty: formDifficulty,
          questionText: formQuestionText,
          options: formType === 'multiple_choice' ? formOptions.filter((o) => o.trim()) : undefined,
          correctAnswer: formCorrectAnswer.trim() || (formType === 'multiple_choice' ? formOptions[0] : ''),
          explanation: formExplanation,
          sourceReference: formSourceRef,
          status: 'approved',
        }),
      });

      setStatusBanner({ type: 'success', text: isRtl ? 'تمت إضافة السؤال بنجاح إلى بنك الأسئلة' : 'Question added successfully' });
      setIsAddModalOpen(false);
      // Reset
      setFormQuestionText('');
      setFormExplanation('');
      setFormOptions(['', '', '', '']);
      setFormCorrectAnswer('');
      onRefreshQuestions();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message || 'تعذر إضافة السؤال' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (questionId: string) => {
    try {
      await apiRequest(`/questions/${questionId}/favorite`, { method: 'PATCH' });
      onRefreshQuestions();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
    }
  };

  // Approve Draft
  const handleApproveDraft = async (questionId: string) => {
    try {
      await apiRequest(`/questions/${questionId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      });
      setStatusBanner({ type: 'success', text: isRtl ? 'تم اعتماد السؤال بنجاح' : 'Question approved' });
      onRefreshQuestions();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await apiRequest(`/questions/${questionId}`, { method: 'DELETE' });
      setStatusBanner({ type: 'success', text: isRtl ? 'تم حذف السؤال من بنك الأسئلة' : 'Question deleted' });
      onRefreshQuestions();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {statusBanner && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span>{statusBanner.text}</span>
          <button type="button" onClick={() => setStatusBanner(null)} className="px-2">✕</button>
        </div>
      )}
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>{t('sectionQuestionBank')}</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-700">
              {filtered.length} {isRtl ? 'سؤال' : 'questions'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isRtl
              ? 'مكتبة الأسئلة المعتمدة والمسودات المصنفة حسب المنهج والدروس والصعوبة'
              : 'Approved questions & drafts categorized by curriculum, lessons, and difficulty'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isRtl ? 'إضافة سؤال جديد' : 'New Question'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute top-3 start-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'ابحث في نصوص الأسئلة والدروس...' : 'Search questions & lessons...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl ps-10 pe-4 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{isRtl ? 'جميع المواد' : 'All Subjects'}</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{isRtl ? 'جميع المستويات' : 'All Difficulties'}</option>
            <option value="easy">{isRtl ? 'سهل (1 نقطة)' : 'Easy (1 pt)'}</option>
            <option value="medium">{isRtl ? 'متوسط (2 نقطة)' : 'Medium (2 pts)'}</option>
            <option value="hard">{isRtl ? 'صعب (3 نقاط)' : 'Hard (3 pts)'}</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="approved">{isRtl ? 'معتمد فقط' : 'Approved Only'}</option>
            <option value="draft">{isRtl ? 'مسودات الذكاء الاصطناعي' : 'AI Drafts'}</option>
          </select>

          {/* Favorites Filter */}
          <button
            type="button"
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`px-3 py-2 rounded-2xl text-xs font-black transition-colors flex items-center gap-1.5 ${
              favoritesOnly
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>{isRtl ? 'المفضلة' : 'Favorites'}</span>
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-500">
              {isRtl ? 'لا توجد أسئلة تطابق معايير البحث' : 'No questions matching search filters'}
            </p>
          </div>
        ) : (
          filtered.map((q) => {
            const isDraft = q.status === 'draft';
            const subject = subjects.find((s) => s.id === q.subjectId);

            return (
              <div
                key={q.id}
                className={`p-4 sm:p-5 rounded-3xl bg-white border transition-all space-y-3 ${
                  isDraft
                    ? 'border-amber-300 bg-amber-50/20 shadow-2xs ring-1 ring-amber-200'
                    : 'border-slate-200/90 shadow-2xs hover:shadow-xs'
                }`}
              >
                {/* Question Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Subject badge */}
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700">
                      {subject?.name || q.subjectId}
                    </span>

                    {/* Unit / Lesson */}
                    <span className="text-xs font-bold text-slate-500">
                      {q.unitName} • {q.lessonTitle}
                    </span>

                    {/* AI Draft Tag */}
                    {isDraft && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>{t('reviewAiDraft')}</span>
                      </span>
                    )}

                    {/* Difficulty */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        q.difficulty === 'hard'
                          ? 'bg-rose-50 text-rose-700'
                          : q.difficulty === 'medium'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {q.difficulty === 'hard'
                        ? 'صعب (+3)'
                        : q.difficulty === 'medium'
                        ? 'متوسط (+2)'
                        : 'سهل (+1)'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {/* Favorite toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(q.id)}
                      className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-colors"
                      title={isRtl ? 'إضافة إلى المفضلة' : 'Favorite'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          q.isFavorite ? 'fill-amber-500 text-amber-500' : ''
                        }`}
                      />
                    </button>

                    {/* Approve Draft Button */}
                    {isDraft && (
                      <button
                        type="button"
                        onClick={() => handleApproveDraft(q.id)}
                        className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-2xs transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t('approveDraft')}</span>
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <h4 className="text-sm sm:text-base font-black text-slate-900 leading-relaxed">
                  {q.questionText}
                </h4>

                {/* Options / Answer */}
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-between ${
                          opt === q.correctAnswer
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{opt}</span>
                        {opt === q.correctAnswer && (
                          <span className="text-[10px] font-black text-emerald-700">✓ صحيحة</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Hints for Who Am I */}
                {q.hints && q.hints.length > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <span className="font-black block text-[11px]">التلميحات المتدرجة:</span>
                    {q.hints.map((h, hi) => (
                      <div key={hi} className="font-medium">• {h}</div>
                    ))}
                    <div className="font-black text-emerald-700 pt-1">الإجابة: {q.correctAnswer}</div>
                  </div>
                )}

                {/* Explanation & Reference */}
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-100">
                  <p className="font-medium">
                    <span className="font-bold text-slate-600">الشرح:</span> {q.explanation}
                  </p>
                  {q.sourceReference && (
                    <span className="text-slate-400 font-bold">
                      المرجع: {q.sourceReference}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD QUESTION MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <span>{isRtl ? 'إضافة سؤال جديد لبنك الأسئلة' : 'Add New Question'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuestionSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">المادة</label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">نوع السؤال</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="multiple_choice">اختيار من متعدد</option>
                    <option value="true_false">صح أم خطأ</option>
                    <option value="short_answer">إجابة قصيرة</option>
                    <option value="who_am_i">من أنا؟</option>
                    <option value="puzzle">لغز تعليمي</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">مستوى الصعوبة</label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="easy">سهل (1 نقطة)</option>
                    <option value="medium">متوسط (2 نقطة)</option>
                    <option value="hard">صعب (3 نقاط)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">اسم الوحدة</label>
                  <input
                    type="text"
                    required
                    value={formUnitName}
                    onChange={(e) => setFormUnitName(e.target.value)}
                    placeholder="مثال: الوحدة الأولى: تنوع الحياة"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">عنوان الدرس</label>
                  <input
                    type="text"
                    required
                    value={formLessonTitle}
                    onChange={(e) => setFormLessonTitle(e.target.value)}
                    placeholder="مثال: تصنيف المخلوقات الحية"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">نص السؤال</label>
                <textarea
                  required
                  rows={2}
                  value={formQuestionText}
                  onChange={(e) => setFormQuestionText(e.target.value)}
                  placeholder="اكتب نص السؤال بوضوح..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              {formType === 'multiple_choice' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block">الخيارات الأربعة (حدد الصحيح):</label>
                  <div className="grid grid-cols-2 gap-2">
                    {formOptions.map((opt, oi) => (
                      <input
                        key={oi}
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const copy = [...formOptions];
                          copy[oi] = e.target.value;
                          setFormOptions(copy);
                        }}
                        placeholder={`خيار ${oi + 1}`}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">الإجابة النموذجية الصحيحة</label>
                <input
                  type="text"
                  required
                  value={formCorrectAnswer}
                  onChange={(e) => setFormCorrectAnswer(e.target.value)}
                  placeholder="أدخل نص الإجابة الصحيحة بالضبط"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">الشرح والتفسير التعليمي</label>
                <input
                  type="text"
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="تفسير مختصر يوضح للطالب سبب صحة الإجابة"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">مرجع السؤال في الكتاب (اختياري)</label>
                <input
                  type="text"
                  value={formSourceRef}
                  onChange={(e) => setFormSourceRef(e.target.value)}
                  placeholder="مثال: كتاب العلوم ص 30"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ السؤال'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
