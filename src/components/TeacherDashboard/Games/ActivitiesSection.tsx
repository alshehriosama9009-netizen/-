/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * Educational Activities & Games Management Section
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

import React, { useState } from 'react';
import {
  GameActivity,
  GameType,
  Question,
  CurriculumSubject,
  CurriculumGrade,
  CurriculumLesson,
} from '../../../types/games.ts';
import { Classroom } from '../../../types/index.ts';
import { useLanguage } from '../../../context/LanguageContext.tsx';
import { apiRequest } from '../../../api/client.ts';
import {
  Gamepad2,
  Plus,
  Play,
  Copy,
  Trash2,
  Pause,
  CheckCircle2,
  Timer,
  Layers,
  Sparkles,
  Users,
  Compass,
  Flame,
  HelpCircle,
  Puzzle,
  RotateCcw,
} from 'lucide-react';

interface ActivitiesSectionProps {
  classroom: Classroom;
  activities: GameActivity[];
  questions: Question[];
  subjects: CurriculumSubject[];
  grades: CurriculumGrade[];
  lessons: CurriculumLesson[];
  onLaunchActivity: (activity: GameActivity) => void;
  onRefreshData: () => void;
}

export const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({
  classroom,
  activities,
  questions,
  subjects,
  grades,
  lessons,
  onLaunchActivity,
  onRefreshData,
}) => {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Create Activity Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || 'science');
  const [selectedGradeId, setSelectedGradeId] = useState('elem_5');
  const [selectedTermId, setSelectedTermId] = useState('term_1');
  const [selectedLessonTitle, setSelectedLessonTitle] = useState('');
  const [gameType, setGameType] = useState<GameType>('multiple_choice_challenge');
  const [timeLimit, setTimeLimit] = useState(30);
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [questionsCount, setQuestionsCount] = useState(4);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter activities
  const filteredActivities = activities.filter((a) => {
    if (filterType !== 'all' && a.gameType !== filterType) return false;
    if (filterStatus === 'published' && (a.status === 'paused' || a.status === 'draft')) return false;
    if (filterStatus === 'paused' && a.status !== 'paused') return false;
    return true;
  });

  const handleToggleStatus = async (act: GameActivity) => {
    const nextStatus = act.status === 'paused' ? 'published' : 'paused';
    try {
      await apiRequest(`/games/activities/${act.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      onRefreshData();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message || 'تعذر تحديث حالة النشاط' });
    }
  };

  const handleDuplicate = async (act: GameActivity) => {
    try {
      await apiRequest(`/games/activities/${act.id}/duplicate`, {
        method: 'POST',
      });
      setStatusBanner({ type: 'success', text: isRtl ? 'تم نسخ النشاط بنجاح' : 'Activity duplicated' });
      onRefreshData();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message || 'تعذر نسخ النشاط' });
    }
  };

  const handleDelete = async (act: GameActivity) => {
    try {
      await apiRequest(`/games/activities/${act.id}`, {
        method: 'DELETE',
      });
      setStatusBanner({ type: 'success', text: isRtl ? `تم حذف النشاط «${act.title}»` : 'Activity deleted' });
      onRefreshData();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message || 'تعذر حذف النشاط' });
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setStatusBanner({ type: 'error', text: isRtl ? 'يرجى كتابة عنوان النشاط' : 'Please provide activity title' });
      return;
    }

    // Pick matching questions from the bank
    const matchingQs = questions.filter((q) => {
      if (q.status !== 'approved') return false;
      if (q.subjectId !== selectedSubjectId) return false;
      return true;
    });

    const chosenQuestionIds = matchingQs.slice(0, questionsCount).map((q) => q.id);

    setIsSubmitting(true);
    try {
      await apiRequest('/games/activities', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          gameType,
          subjectId: selectedSubjectId,
          gradeId: selectedGradeId,
          termId: selectedTermId,
          lessonTitle: selectedLessonTitle || 'درس تطبيقي',
          difficulty,
          questionIds: chosenQuestionIds,
          timeLimitSeconds: timeLimit,
          showAnswerInstantly: true,
          allowRetry: false,
          isTeamMode,
          pointsMode: 'automatic',
        }),
      });

      setIsCreateOpen(false);
      setTitle('');
      setStatusBanner({ type: 'success', text: isRtl ? 'تم حفظ ونشر النشاط بنجاح' : 'Activity created' });
      onRefreshData();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message || 'تعذر إنشاء النشاط' });
    } finally {
      setIsSubmitting(false);
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
      {/* Top Banner & Creation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-indigo-600" />
            <span>{isRtl ? 'إدارة الأنشطة والألعاب التعليمية' : 'Educational Activities & Games Management'}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isRtl
              ? 'إنشاء الأنشطة ونشرها أو إيقافها، وإعادة استخدام الأنشطة السابقة، وتشغيلها في الفصل'
              : 'Create, publish, pause, reuse, and launch classroom games'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{isRtl ? 'إنشاء نشاط جديد' : 'Create New Activity'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 text-xs font-bold">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{isRtl ? 'الحالة:' : 'Status:'}</span>
          {[
            { id: 'all', label: isRtl ? 'الكل' : 'All' },
            { id: 'published', label: isRtl ? 'المنشورة فقط' : 'Published' },
            { id: 'paused', label: isRtl ? 'المتوقفة مؤقتًا' : 'Paused' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setFilterStatus(st.id)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterStatus === st.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">{isRtl ? 'نوع اللعبة:' : 'Game Type:'}</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-800"
          >
            <option value="all">{isRtl ? 'جميع أنواع الألعاب (12)' : 'All 12 Game Modes'}</option>
            <option value="multiple_choice_challenge">{isRtl ? 'تحدي الاختيارات' : 'Choice Challenge'}</option>
            <option value="true_false_blitz">{isRtl ? 'صح أم خطأ' : 'True/False'}</option>
            <option value="lucky_wheel">{isRtl ? 'عجلة الحظ' : 'Lucky Wheel'}</option>
            <option value="who_is_fastest">{isRtl ? 'من الأسرع؟' : 'Who is Fastest?'}</option>
            <option value="who_am_i">{isRtl ? 'من أنا؟' : 'Who Am I?'}</option>
            <option value="match_pairs">{isRtl ? 'طابق الإجابات' : 'Match Pairs'}</option>
            <option value="card_ordering">{isRtl ? 'ترتيب البطاقات' : 'Card Ordering'}</option>
            <option value="fill_blank">{isRtl ? 'أكمل الفراغ' : 'Fill Blank'}</option>
            <option value="treasure_hunt">{isRtl ? 'الكنز التعليمي' : 'Treasure Hunt'}</option>
            <option value="team_challenge">{isRtl ? 'التحدي الجماعي' : 'Team Challenge'}</option>
            <option value="speed_race">{isRtl ? 'سباق الإجابات' : 'Speed Race'}</option>
            <option value="puzzle_of_day">{isRtl ? 'لغز اليوم' : 'Daily Puzzle'}</option>
          </select>
        </div>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredActivities.map((act) => {
          const isPaused = act.status === 'paused';

          return (
            <div
              key={act.id}
              className={`p-5 rounded-3xl bg-white border transition-all flex flex-col justify-between space-y-4 hover:shadow-md ${
                isPaused ? 'border-amber-200 bg-amber-50/20 opacity-80' : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-indigo-50 text-indigo-700">
                    {act.subjectId}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isPaused ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Pause className="w-3 h-3" />
                        <span>{isRtl ? 'متوقف مؤقتًا' : 'Paused'}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isRtl ? 'منشور للطلاب' : 'Published'}</span>
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-slate-400">⏱️ {act.timeLimitSeconds}s</span>
                  </div>
                </div>

                <h4 className="text-sm font-black text-slate-900 leading-snug">{act.title}</h4>
                {act.lessonTitle && (
                  <p className="text-xs text-slate-500 font-medium">
                    {isRtl ? `الدرس: ${act.lessonTitle}` : `Lesson: ${act.lessonTitle}`}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {act.questionIds.length || act.questionsCount || 3} {isRtl ? 'أسئلة' : 'Questions'}
                  </span>
                  <span>•</span>
                  <span>{act.isTeamMode ? (isRtl ? 'تحدي فرق 👥' : 'Teams') : (isRtl ? 'فردي 👤' : 'Individual')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={() => onLaunchActivity(act)}
                  className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{isRtl ? `تشغيل فوري في ${classroom.name}` : `Launch in ${classroom.name}`}</span>
                </button>

                <div className="grid grid-cols-3 gap-1.5 text-xs font-bold text-slate-600">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(act)}
                    className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                    title={isPaused ? (isRtl ? 'تفعيل ونشر' : 'Publish') : (isRtl ? 'إيقاف مؤقت' : 'Pause')}
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5 text-amber-600" />}
                    <span>{isPaused ? (isRtl ? 'نشر' : 'Active') : (isRtl ? 'إيقاف' : 'Pause')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicate(act)}
                    className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                    title={isRtl ? 'نسخ وإعادة استخدام' : 'Duplicate & Reuse'}
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isRtl ? 'نسخ' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(act)}
                    className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center justify-center gap-1"
                    title={isRtl ? 'حذف النشاط' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>{isRtl ? 'حذف' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Activity Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 font-black">
                <Plus className="w-5 h-5" />
                <h3 className="text-base font-black text-slate-900">
                  {isRtl ? 'إنشاء نشاط تعليمي جديد' : 'Create New Educational Activity'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-600 mb-1">{isRtl ? 'عنوان النشاط:' : 'Activity Title:'}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isRtl ? 'مثال: تحدي أبطال العلوم — الخلية والبناء الضوئي' : 'e.g. Science Heroes Challenge'}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">{isRtl ? 'نوع اللعبة:' : 'Game Mode:'}</label>
                  <select
                    value={gameType}
                    onChange={(e) => setGameType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  >
                    <option value="multiple_choice_challenge">{isRtl ? 'تحدي الاختيارات' : 'Choice Challenge'}</option>
                    <option value="true_false_blitz">{isRtl ? 'صح أم خطأ' : 'True/False'}</option>
                    <option value="who_is_fastest">{isRtl ? 'من الأسرع؟' : 'Who is Fastest?'}</option>
                    <option value="who_am_i">{isRtl ? 'من أنا؟' : 'Who Am I?'}</option>
                    <option value="match_pairs">{isRtl ? 'طابق الإجابات' : 'Match Pairs'}</option>
                    <option value="card_ordering">{isRtl ? 'ترتيب البطاقات' : 'Card Ordering'}</option>
                    <option value="fill_blank">{isRtl ? 'أكمل الفراغ' : 'Fill Blank'}</option>
                    <option value="treasure_hunt">{isRtl ? 'الكنز التعليمي' : 'Treasure Hunt'}</option>
                    <option value="speed_race">{isRtl ? 'سباق الإجابات' : 'Speed Race'}</option>
                    <option value="puzzle_of_day">{isRtl ? 'لغز اليوم' : 'Daily Puzzle'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">{isRtl ? 'المادة الدراسية:' : 'Subject:'}</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">{isRtl ? 'عدد الأسئلة:' : 'Questions Count:'}</label>
                  <select
                    value={questionsCount}
                    onChange={(e) => setQuestionsCount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  >
                    <option value={3}>3 {isRtl ? 'أسئلة' : 'Questions'}</option>
                    <option value={4}>4 {isRtl ? 'أسئلة' : 'Questions'}</option>
                    <option value={5}>5 {isRtl ? 'أسئلة' : 'Questions'}</option>
                    <option value={8}>8 {isRtl ? 'أسئلة' : 'Questions'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">{isRtl ? 'وقت الإجابة لكل سؤال:' : 'Timer Limit:'}</label>
                  <select
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  >
                    <option value={15}>15 {isRtl ? 'ثانية (سريع)' : 'sec'}</option>
                    <option value={30}>30 {isRtl ? 'ثانية (قياسي)' : 'sec'}</option>
                    <option value={45}>45 {isRtl ? 'ثانية' : 'sec'}</option>
                    <option value={60}>60 {isRtl ? 'ثانية' : 'sec'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">{isRtl ? 'مستوى الصعوبة:' : 'Difficulty:'}</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  >
                    <option value="easy">{isRtl ? 'سهل (1 نقطة)' : 'Easy (1 pt)'}</option>
                    <option value="medium">{isRtl ? 'متوسط (2 نقطة)' : 'Medium (2 pts)'}</option>
                    <option value="hard">{isRtl ? 'صعب (3 نقاط)' : 'Hard (3 pts)'}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="teamModeCheck"
                  checked={isTeamMode}
                  onChange={(e) => setIsTeamMode(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="teamModeCheck" className="text-slate-700 font-bold cursor-pointer">
                  {isRtl ? 'تفعيل نظام الفرق الجماعية (الصقور، الأبطال، النجوم)' : 'Enable Team Mode'}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (isRtl ? 'جارٍ الحفظ...' : 'Saving...') : (isRtl ? 'حفظ ونشر النشاط' : 'Save & Publish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
