/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Student } from '../../types/index.ts';
import { apiRequest } from '../../api/client.ts';
import confetti from 'canvas-confetti';
import {
  X,
  Sparkles,
  Award,
  Gamepad2,
  HelpCircle,
  Puzzle,
  CheckCircle2,
  AlertTriangle,
  HeartHandshake,
} from 'lucide-react';

interface AwardPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  selectedStudents: Student[];
  onPointsAwarded: () => void;
}

export const AwardPointsModal: React.FC<AwardPointsModalProps> = ({
  isOpen,
  onClose,
  classId,
  selectedStudents,
  onPointsAwarded,
}) => {
  const [source, setSource] = useState<
    'behavior' | 'participation' | 'games' | 'questions' | 'puzzles'
  >('behavior');

  // Behavior
  const [behaviorCriterion, setBehaviorCriterion] = useState<
    'quiet_etiquette' | 'teacher_instructions' | 'cooperation_cleanliness'
  >('quiet_etiquette');

  // Participation
  const [participationLevel, setParticipationLevel] = useState<'simple' | 'distinguished'>('distinguished');

  // Games
  const [gameRank, setGameRank] = useState<1 | 2 | 3>(1);

  // Questions
  const [questionDifficulty, setQuestionDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Puzzles
  const [puzzleDifficulty, setPuzzleDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const [customNote, setCustomNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resultSummary, setResultSummary] = useState<string | null>(null);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  // Points preview calculation
  let pointsPreview = 1;
  if (source === 'behavior') pointsPreview = 1;
  else if (source === 'participation') pointsPreview = participationLevel === 'distinguished' ? 2 : 1;
  else if (source === 'games') pointsPreview = gameRank === 1 ? 5 : gameRank === 2 ? 3 : 2;
  else if (source === 'questions') pointsPreview = questionDifficulty === 'hard' ? 3 : questionDifficulty === 'medium' ? 2 : 1;
  else if (source === 'puzzles') pointsPreview = puzzleDifficulty === 'hard' ? 10 : puzzleDifficulty === 'medium' ? 5 : 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResultSummary(null);
    setErrorSummary(null);

    try {
      const payload: any = {
        classId,
        studentIds: selectedStudents.map((s) => s.id),
        source,
        customReason: customNote,
      };

      if (source === 'behavior') payload.behaviorCriterion = behaviorCriterion;
      if (source === 'participation') payload.participationLevel = participationLevel;
      if (source === 'games') payload.gameRank = gameRank;
      if (source === 'questions') payload.questionDifficulty = questionDifficulty;
      if (source === 'puzzles') payload.puzzleDifficulty = puzzleDifficulty;

      const res = await apiRequest('/points/award', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Trigger confetti celebration
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {
        // ignore
      }

      const totalGiven = res.results.filter((r: any) => r.pointsAwarded > 0).length;
      setResultSummary(`تم منح النقاط بنجاح لـ ${totalGiven} من الطلاب!`);
      onPointsAwarded();

      setTimeout(() => {
        onClose();
        setResultSummary(null);
      }, 1200);
    } catch (err: any) {
      setErrorSummary(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-700 to-indigo-800 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-300" />
              <h3 className="text-base sm:text-lg font-black">
                منح النقاط التحفيزية
              </h3>
            </div>
            <p className="text-xs text-indigo-200 mt-1">
              محدد لـ ({selectedStudents.length}) من أبطال الفصل
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-xl hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Students Preview Pill */}
        <div className="px-6 py-2.5 bg-indigo-50/60 border-b border-indigo-100 flex items-center gap-2 overflow-x-auto text-xs text-indigo-900">
          <span className="font-bold shrink-0">الطلاب:</span>
          <div className="flex gap-1.5 flex-wrap">
            {selectedStudents.map((s) => (
              <span
                key={s.id}
                className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 font-semibold"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* 7 Sources Categories Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              اختر مصدر النقاط:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSource('behavior')}
                className={`p-3 rounded-2xl text-right border transition-all flex flex-col justify-between ${
                  source === 'behavior'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <HeartHandshake className="w-4 h-4 text-emerald-600 mb-1" />
                <span className="text-xs font-bold">1. السلوك والانضباط</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  أقصى حد 3 يوميًا
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSource('participation')}
                className={`p-3 rounded-2xl text-right border transition-all flex flex-col justify-between ${
                  source === 'participation'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500 mb-1" />
                <span className="text-xs font-bold">2. المشاركة</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  1 إلى 2 نقطة
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSource('games')}
                className={`p-3 rounded-2xl text-right border transition-all flex flex-col justify-between ${
                  source === 'games'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <Gamepad2 className="w-4 h-4 text-purple-600 mb-1" />
                <span className="text-xs font-bold">3. الألعاب</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  المراكز 1 - 3
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSource('questions')}
                className={`p-3 rounded-2xl text-right border transition-all flex flex-col justify-between ${
                  source === 'questions'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-blue-600 mb-1" />
                <span className="text-xs font-bold">4. الأسئلة</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  1 إلى 3 نقاط
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSource('puzzles')}
                className={`p-3 rounded-2xl text-right border transition-all flex flex-col justify-between sm:col-span-2 ${
                  source === 'puzzles'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <Puzzle className="w-4 h-4 text-rose-600 mb-1" />
                <span className="text-xs font-bold">5. الألغاز</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  3 أو 5 أو 10 نقاط
                </span>
              </button>
            </div>
          </div>

          {/* Source-specific Subcriteria */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            {source === 'behavior' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                  <span>معيار السلوك:</span>
                  <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    +1 نقطة (الحد الأقصى اليومي: 3)
                  </span>
                </div>
                {[
                  {
                    id: 'quiet_etiquette',
                    label: 'الالتزام بالهدوء وآداب الفصل',
                  },
                  {
                    id: 'teacher_instructions',
                    label: 'اتباع تعليمات المعلم',
                  },
                  {
                    id: 'cooperation_cleanliness',
                    label: 'التعاون والمحافظة على البيئة الصفية',
                  },
                ].map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      behaviorCriterion === item.id
                        ? 'bg-white border-indigo-500 shadow-2xs font-bold text-indigo-900'
                        : 'bg-white/60 border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="behaviorCrit"
                      value={item.id}
                      checked={behaviorCriterion === item.id}
                      onChange={() => setBehaviorCriterion(item.id as any)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs">{item.label}</span>
                  </label>
                ))}
              </div>
            )}

            {source === 'participation' && (
              <div className="space-y-2">
                <span className="block text-xs font-bold text-slate-800 mb-2">
                  مستوى المشاركة:
                </span>
                <label
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    participationLevel === 'simple'
                      ? 'bg-white border-indigo-500 shadow-2xs font-bold text-indigo-900'
                      : 'bg-white/60 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="partLevel"
                      checked={participationLevel === 'simple'}
                      onChange={() => setParticipationLevel('simple')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs">مشاركة بسيطة ومرتبطة بالدرس</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-600">+1 نقطة</span>
                </label>

                <label
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    participationLevel === 'distinguished'
                      ? 'bg-white border-indigo-500 shadow-2xs font-bold text-indigo-900'
                      : 'bg-white/60 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="partLevel"
                      checked={participationLevel === 'distinguished'}
                      onChange={() => setParticipationLevel('distinguished')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs">مشاركة صحيحة أو متميزة</span>
                  </div>
                  <span className="text-xs font-bold text-amber-600">+2 نقطة</span>
                </label>
              </div>
            )}

            {source === 'games' && (
              <div className="space-y-2">
                <span className="block text-xs font-bold text-slate-800 mb-2">
                  ترتيب الطالب في اللعبة:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { rank: 1, label: 'المركز الأول', pts: 5, color: 'text-amber-600' },
                    { rank: 2, label: 'المركز الثاني', pts: 3, color: 'text-slate-600' },
                    { rank: 3, label: 'المركز الثالث', pts: 2, color: 'text-amber-800' },
                  ].map((g) => (
                    <button
                      key={g.rank}
                      type="button"
                      onClick={() => setGameRank(g.rank as any)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        gameRank === g.rank
                          ? 'bg-white border-indigo-500 shadow-2xs ring-2 ring-indigo-500/20 font-bold'
                          : 'bg-white/60 border-slate-200'
                      }`}
                    >
                      <span className="text-xs block text-slate-800">{g.label}</span>
                      <span className={`text-sm font-extrabold block mt-1 ${g.color}`}>
                        +{g.pts} نقاط
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {source === 'questions' && (
              <div className="space-y-2">
                <span className="block text-xs font-bold text-slate-800 mb-2">
                  مستوى صعوبة السؤال:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'easy', label: 'سهل', pts: 1 },
                    { id: 'medium', label: 'متوسط', pts: 2 },
                    { id: 'hard', label: 'صعب', pts: 3 },
                  ].map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setQuestionDifficulty(q.id as any)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        questionDifficulty === q.id
                          ? 'bg-white border-indigo-500 shadow-2xs ring-2 ring-indigo-500/20 font-bold'
                          : 'bg-white/60 border-slate-200'
                      }`}
                    >
                      <span className="text-xs block text-slate-800">{q.label}</span>
                      <span className="text-sm font-extrabold text-blue-600 block mt-1">
                        +{q.pts} {q.pts === 1 ? 'نقطة' : 'نقاط'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {source === 'puzzles' && (
              <div className="space-y-2">
                <span className="block text-xs font-bold text-slate-800 mb-2">
                  مستوى صعوبة اللغز:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'easy', label: 'لغز سهل', pts: 3 },
                    { id: 'medium', label: 'لغز متوسط', pts: 5 },
                    { id: 'hard', label: 'لغز صعب', pts: 10 },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPuzzleDifficulty(p.id as any)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        puzzleDifficulty === p.id
                          ? 'bg-white border-indigo-500 shadow-2xs ring-2 ring-indigo-500/20 font-bold'
                          : 'bg-white/60 border-slate-200'
                      }`}
                    >
                      <span className="text-xs block text-slate-800">{p.label}</span>
                      <span className="text-sm font-extrabold text-rose-600 block mt-1">
                        +{p.pts} نقاط
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظة أو سبب إضافي (اختياري):
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="مثال: إجابة مميزة في درس الرياضيات"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
            />
          </div>

          {errorSummary && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{errorSummary}</span>
            </div>
          )}

          {resultSummary && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{resultSummary}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs">
              <span className="text-slate-500">القيمة المكتسبة: </span>
              <span className="font-extrabold text-indigo-700 text-base">
                +{pointsPreview} {pointsPreview === 1 ? 'نقطة' : 'نقاط'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
              >
                {submitting ? 'جارٍ الرصد...' : 'اعتماد ومنح النقاط'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
