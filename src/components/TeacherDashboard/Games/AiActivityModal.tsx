/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * AI Activity & Question Creator («أنشئ نشاطًا بالذكاء الاصطناعي»)
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

import React, { useState } from 'react';
import {
  CurriculumSubject,
  CurriculumGrade,
  Question,
  GameType,
} from '../../../types/games.ts';
import { useLanguage } from '../../../context/LanguageContext.tsx';
import { apiRequest } from '../../../api/client.ts';
import {
  Sparkles,
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  HelpCircle,
  Edit2,
  UploadCloud,
} from 'lucide-react';

interface AiActivityModalProps {
  subjects: CurriculumSubject[];
  grades: CurriculumGrade[];
  onClose: () => void;
  onQuestionsGenerated: (questions: Question[]) => void;
  onLaunchWithQuestions?: (questions: Question[], title: string, gameType: GameType) => void;
}

export const AiActivityModal: React.FC<AiActivityModalProps> = ({
  subjects,
  grades,
  onClose,
  onQuestionsGenerated,
  onLaunchWithQuestions,
}) => {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  const [subjectId, setSubjectId] = useState(subjects[0]?.id || 'science');
  const [gradeId, setGradeId] = useState(grades[1]?.id || 'elem_5');
  const [termId, setTermId] = useState('term_1');
  const [unitName, setUnitName] = useState('الوحدة الأولى: تنوع الحياة');
  const [lessonTitle, setLessonTitle] = useState('البناء الضوئي وأجزاء النبات');
  const [lessonContent, setLessonContent] = useState('');
  const [questionsCount, setQuestionsCount] = useState(4);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [gameType, setGameType] = useState<GameType>('multiple_choice_challenge');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDrafts, setGeneratedDrafts] = useState<Question[]>([]);
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!lessonTitle.trim()) {
      setErrorMsg(isRtl ? 'يرجى كتابة عنوان الدرس' : 'Please enter lesson title');
      return;
    }

    setIsGenerating(true);
    setGenerationNotice(null);

    try {
      const res = await apiRequest<{
        success: boolean;
        source: string;
        isAiDraft: boolean;
        notice: string;
        questions: Question[];
      }>('/ai/generate-activity', {
        method: 'POST',
        body: JSON.stringify({
          subject: subjectId,
          grade: gradeId,
          term: termId,
          unitName,
          lessonTitle,
          lessonContent: lessonContent.trim() || undefined,
          questionsCount,
          difficulty,
          gameType,
        }),
      });

      setGeneratedDrafts(res.questions);
      setGenerationNotice(res.notice);
      onQuestionsGenerated(res.questions);
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر توليد النشاط بالذكاء الاصطناعي');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAll = async () => {
    for (const q of generatedDrafts) {
      try {
        await apiRequest(`/questions/${q.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'approved' }),
        });
      } catch (err) {
        console.error(err);
      }
    }
    onQuestionsGenerated(generatedDrafts);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-linear-to-r from-indigo-900 to-purple-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-black">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {t('sectionAiActivity')}
              </h3>
              <p className="text-xs text-indigo-200">
                {isRtl
                  ? 'توليد مسودات أنشطة وأسئلة تفاعلية ذكية متوافقة مع المنهج السعودي لمراجعتها واعتمادها'
                  : 'Smart activity generator aligned with Saudi curriculum for teacher review & approval'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-indigo-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
              {errorMsg}
            </div>
          )}
          {generatedDrafts.length === 0 ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Notice */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3 text-xs text-indigo-950">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    {isRtl
                      ? 'ميزة الأمان التربوي ومراجعة المعلم:'
                      : 'Educational Safety & Review Guarantee:'}
                  </p>
                  <p className="text-indigo-800">
                    {isRtl
                      ? 'لا تُعتمد أي أسئلة مولدة تلقائيًا؛ حيث تظهر كـ «مسودة ذكاء اصطناعي» للمراجعة والتعديل قبل تفعيلها للطلاب، وتعتمد على محتوى الدرس المدخل دون تخمين معلومات غير مثبتة.'
                      : 'AI generated questions are always created as drafts for your explicit review and editing before being used with students.'}
                  </p>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">المادة الدراسية</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">الصف والمرحلة</label>
                  <select
                    value={gradeId}
                    onChange={(e) => setGradeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    {grades.map((gr) => (
                      <option key={gr.id} value={gr.id}>{gr.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">الفصل الدراسي</label>
                  <select
                    value={termId}
                    onChange={(e) => setTermId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="term_1">الفصل الدراسي الأول</option>
                    <option value="term_2">الفصل الدراسي الثاني</option>
                    <option value="term_3">الفصل الدراسي الثالث</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">اسم الوحدة التعليمية</label>
                  <input
                    type="text"
                    required
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    placeholder="مثال: الوحدة الأولى: أركان الإيمان"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">عنوان الدرس</label>
                  <input
                    type="text"
                    required
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="مثال: الإيمان بالملائكة"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Lesson Text / Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>محتوى الدرس أو ملخص المعلم (موصى به لدقة الأسئلة)</span>
                  <span className="text-[10px] text-slate-400 font-medium">اختياري</span>
                </label>
                <textarea
                  rows={3}
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  placeholder="الصق هنا ملخص الدرس، أو أهداف الدرس، أو نصوص من الكتاب المدرسي لإنشاء أسئلة مبنية عليها بدقة..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Game type & difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">نوع اللعبة المستهدفة</label>
                  <select
                    value={gameType}
                    onChange={(e) => setGameType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="multiple_choice_challenge">تحدي الاختيارات</option>
                    <option value="true_false_blitz">صح أم خطأ</option>
                    <option value="who_am_i">من أنا؟</option>
                    <option value="treasure_hunt">الكنز التعليمي</option>
                    <option value="speed_race">سباق الإجابات</option>
                    <option value="puzzle_of_day">لغز اليوم</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">مستوى الصعوبة</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="easy">سهل (1 نقطة)</option>
                    <option value="medium">متوسط (2 نقطة)</option>
                    <option value="hard">صعب (3 نقاط)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">عدد الأسئلة</label>
                  <select
                    value={questionsCount}
                    onChange={(e) => setQuestionsCount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value={3}>3 أسئلة</option>
                    <option value={4}>4 أسئلة</option>
                    <option value={5}>5 أسئلة</option>
                    <option value={8}>8 أسئلة</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isGenerating ? 'جارٍ التوليد بالذكاء الاصطناعي...' : 'توليد النشاط والأسئلة'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* DRAFT REVIEW VIEW */
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-amber-900">
                      {isRtl ? 'تم توليد مسودات الأسئلة بنجاح!' : 'Draft questions generated!'}
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      {generationNotice || 'راجع الأسئلة أدناه، واعتمدها لإضافتها إلى بنك الأسئلة أو تشغيلها مباشرة.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGeneratedDrafts([])}
                    className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-800 text-xs font-black"
                  >
                    إعادة المحاولة
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveAll}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>اعتماد الكل</span>
                  </button>
                </div>
              </div>

              {/* Drafts List */}
              <div className="space-y-3">
                {generatedDrafts.map((dq, dIdx) => (
                  <div
                    key={dq.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-indigo-700">السؤال {dIdx + 1} ({dq.type})</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {dq.aiPromptSource === 'lesson_text' ? 'مبني على ملخص المعلم' : 'ذكاء اصطناعي عام'}
                      </span>
                    </div>

                    <p className="font-bold text-slate-900 text-sm">{dq.questionText}</p>

                    {dq.options && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {dq.options.map((opt, oi) => (
                          <div
                            key={oi}
                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold ${
                              opt === dq.correctAnswer
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            {opt} {opt === dq.correctAnswer ? '✓' : ''}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 pt-1">
                      <span className="font-bold text-slate-700">الشرح:</span> {dq.explanation}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Launch with these questions */}
              {onLaunchWithQuestions && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onLaunchWithQuestions(
                        generatedDrafts,
                        `تحدي ذكي: ${lessonTitle}`,
                        gameType
                      );
                    }}
                    className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>بدء اللعبة مباشرة بهذه الأسئلة في الفصل</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
