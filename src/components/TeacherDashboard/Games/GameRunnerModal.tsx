/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * Interactive Classroom Game Runner (12 Interactive Educational Game Modes)
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  GameSession,
  Question,
  GameActivity,
} from '../../../types/games.ts';
import { Student } from '../../../types/index.ts';
import { useLanguage } from '../../../context/LanguageContext.tsx';
import { apiRequest } from '../../../api/client.ts';
import { soundManager } from '../../../utils/audio.ts';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Trophy,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  Users,
  Timer,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Compass,
  KeyRound,
  ShieldAlert,
  Flame,
  ArrowUpDown,
  Lock,
  Unlock,
} from 'lucide-react';

interface GameRunnerModalProps {
  session: GameSession;
  questions: Question[];
  activity: GameActivity;
  students: Student[];
  onClose: () => void;
  onRefreshSession?: () => void;
  onRefreshClassStudents?: () => void;
}

export const GameRunnerModal: React.FC<GameRunnerModalProps> = ({
  session,
  questions,
  activity,
  students,
  onClose,
  onRefreshSession,
  onRefreshClassStudents,
}) => {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  // Game Progress State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students[0]?.id || ''
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Timer State
  const initialTime = activity.timeLimitSeconds || 30;
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Question Response State
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    explanation?: string;
    earnedScore?: number;
  } | null>(null);

  // Mode-Specific States
  // 3. Lucky Wheel
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelSelectedStudent, setWheelSelectedStudent] = useState<Student | null>(null);

  // 5. Who Am I hints revealed count
  const [revealedHints, setRevealedHints] = useState(1);

  // 6. Matching Pairs
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  // 7. Card Ordering
  const [orderedList, setOrderedList] = useState<string[]>([]);

  // 9. Treasure Hunt
  const [unlockedStages, setUnlockedStages] = useState<number[]>([]);

  // 10. Team Scores
  const [teams, setTeams] = useState(session.teams || []);

  // Leaderboard / Session Participants
  const [participants, setParticipants] = useState(session.participants || []);

  // Completion & Awards
  const [isGameOver, setIsGameOver] = useState(session.status === 'completed');
  const [isAwardingPoints, setIsAwardingPoints] = useState(false);
  const [awardMessage, setAwardMessage] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const currentQ = questions[currentIdx] || null;

  // Initialize or reset question-specific state when question changes
  useEffect(() => {
    if (currentQ) {
      setSelectedOption('');
      setTextAnswer('');
      setAnswerSubmitted(false);
      setLastResult(null);
      setTimeLeft(activity.timeLimitSeconds || 30);
      setIsTimerRunning(true);
      setRevealedHints(1);

      if (currentQ.type === 'ordering' && currentQ.orderingItems) {
        // Shuffle items for the student to reorder
        setOrderedList([...currentQ.orderingItems].sort(() => Math.random() - 0.5));
      }

      if (currentQ.type === 'matching') {
        setMatchedPairs({});
        setSelectedLeft(null);
      }
    }
  }, [currentIdx, currentQ?.id]);

  // Timer countdown
  useEffect(() => {
    if (!isTimerRunning || answerSubmitted || isGameOver) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning, answerSubmitted, isGameOver]);

  const handleTimeExpired = () => {
    if (soundEnabled) soundManager.playWrong();
    setAnswerSubmitted(true);
    setLastResult({
      isCorrect: false,
      explanation: isRtl ? 'انتهى الوقت المحدد للإجابة!' : 'Time limit expired!',
      earnedScore: 0,
    });
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Handle Answer Submission
  const handleSubmitAnswer = async (answerValue: string) => {
    if (!currentQ || answerSubmitted) return;
    setIsTimerRunning(false);

    const timeSpent = (activity.timeLimitSeconds || 30) - timeLeft;
    try {
      const res = await apiRequest<{
        isCorrect: boolean;
        correctAnswer: string;
        explanation: string;
        earnedScore: number;
        totalScore: number;
      }>(`/games/sessions/${session.id}/submit-answer`, {
        method: 'POST',
        body: JSON.stringify({
          studentId: selectedStudentId,
          questionId: currentQ.id,
          answered: answerValue,
          timeSeconds: timeSpent,
        }),
      });

      setAnswerSubmitted(true);
      setLastResult({
        isCorrect: res.isCorrect,
        explanation: res.explanation || currentQ.explanation,
        earnedScore: res.earnedScore,
      });

      if (res.isCorrect) {
        if (soundEnabled) soundManager.playCorrect();
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
        if (activity.gameType === 'treasure_hunt') {
          setUnlockedStages((prev) => [...prev, currentIdx]);
        }
      } else {
        if (soundEnabled) soundManager.playWrong();
      }

      // Update local participants score
      setParticipants((prev) =>
        prev.map((p) =>
          p.studentId === selectedStudentId
            ? {
                ...p,
                totalScore: res.totalScore,
                totalTimeSeconds: p.totalTimeSeconds + timeSpent,
                answers: [
                  ...p.answers,
                  {
                    questionId: currentQ.id,
                    answered: answerValue,
                    isCorrect: res.isCorrect,
                    timeSeconds: timeSpent,
                    pointsEarned: res.earnedScore,
                  },
                ],
              }
            : p
        )
      );

      // If team mode, update team score
      if (session.teams && teams.length > 0) {
        const participant = session.participants.find((p) => p.studentId === selectedStudentId);
        if (participant?.teamId) {
          setTeams((prevTeams) =>
            prevTeams.map((t) =>
              t.id === participant.teamId
                ? { ...t, score: t.score + res.earnedScore }
                : t
            )
          );
        }
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'تعذر تسجيل الإجابة');
    }
  };

  // 3. Lucky Wheel Spin
  const spinLuckyWheel = () => {
    if (isSpinning || students.length === 0) return;
    setIsSpinning(true);
    if (soundEnabled) soundManager.playTick();

    const randomDegrees = 1440 + Math.floor(Math.random() * 360);
    const newRotation = wheelRotation + randomDegrees;
    setWheelRotation(newRotation);

    setTimeout(() => {
      setIsSpinning(false);
      const chosenStudent = students[Math.floor(Math.random() * students.length)];
      setWheelSelectedStudent(chosenStudent);
      setSelectedStudentId(chosenStudent.id);
      if (soundEnabled) soundManager.playCorrect();
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    }, 3200);
  };

  // Next Question or End Game
  const handleNextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setIsGameOver(true);
      if (soundEnabled) soundManager.playVictory();
      confetti({ particleCount: 100, spread: 90, origin: { y: 0.5 } });
    }
  };

  // Award Points to top 3 winners
  const handleAwardGamePoints = async () => {
    setIsAwardingPoints(true);
    setAwardMessage(null);

    // Sort participants by score (descending), then time (ascending)
    const sorted = [...participants].sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.totalTimeSeconds - b.totalTimeSeconds;
    });

    const winners: Array<{ studentId: string; rank: 1 | 2 | 3; points: number }> = [];
    if (sorted[0]) winners.push({ studentId: sorted[0].studentId, rank: 1, points: 5 });
    if (sorted[1]) winners.push({ studentId: sorted[1].studentId, rank: 2, points: 3 });
    if (sorted[2]) winners.push({ studentId: sorted[2].studentId, rank: 3, points: 2 });

    try {
      const res = await apiRequest<{ success: boolean; message: string }>(
        `/games/sessions/${session.id}/award-points`,
        {
          method: 'POST',
          body: JSON.stringify({ winners }),
        }
      );
      setAwardMessage(res.message);
      if (soundEnabled) soundManager.playVictory();
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.4 } });
      if (onRefreshSession) onRefreshSession();
      if (onRefreshClassStudents) onRefreshClassStudents();
    } catch (err: any) {
      setErrorBanner(err.message || 'تعذر اعتماد نقاط اللعبة');
    } finally {
      setIsAwardingPoints(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto ${
        isRtl ? 'font-arabic' : ''
      }`}
    >
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]">
        {/* Top Header Bar */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider block">
                {activity.title}
              </span>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                {t('appNameAr')} — {activity.lessonTitle || t('tabGames')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                soundManager.enabled = next;
              }}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title={t('fullscreenMode')}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              title={t('close')}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-bar: Timer, Progress & Active Student */}
        {!isGameOver && (
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            {/* Question Counter & Progress */}
            <div className="flex items-center gap-2 font-bold text-slate-600">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 font-black">
                {currentIdx + 1} / {questions.length}
              </span>
              <span>{currentQ?.unitName}</span>
            </div>

            {/* Live Timer Pill */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-black text-sm transition-all ${
                  timeLeft <= 5
                    ? 'bg-rose-100 text-rose-700 animate-pulse'
                    : timeLeft <= 10
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <Timer className="w-4 h-4" />
                <span>{timeLeft}s</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                title={isTimerRunning ? 'Pause' : 'Resume'}
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Active Student Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">{t('hero')}:</span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-indigo-500"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.studentCode})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Teams Score Bar (If Team Mode) */}
        {teams && teams.length > 0 && !isGameOver && (
          <div className="px-5 py-2 bg-indigo-950 text-white flex items-center justify-around gap-2 text-xs font-bold shrink-0">
            {teams.map((tm) => (
              <div key={tm.id} className="flex items-center gap-2">
                <span className="text-sm">{tm.name}</span>
                <span className="px-2 py-0.5 rounded-lg bg-white/20 text-white font-black">
                  {tm.score} {t('points')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorBanner && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between">
              <span>{errorBanner}</span>
              <button type="button" onClick={() => setErrorBanner(null)} className="px-2">✕</button>
            </div>
          )}
          {/* GAME OVER & PODIUM VIEW */}
          {isGameOver ? (
            <div className="py-8 text-center space-y-6 max-w-2xl mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center shadow-lg">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">{t('winnerPodium')}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {isRtl
                    ? `اكتمل نشاط «${activity.title}» بنجاح! استعرض أداء الأبطال واعتمد النقاط`
                    : `Activity "${activity.title}" finished! Review performance & award points`}
                </p>
              </div>

              {/* Top 3 Podium Cards */}
              <div className="grid grid-cols-3 gap-3 items-end pt-4">
                {/* 2nd Place */}
                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-center space-y-2 order-1 sm:order-none">
                  <span className="text-2xl">🥈</span>
                  <div className="font-bold text-xs text-slate-400">{t('rankSecond')} (+3 {t('points')})</div>
                  <div className="font-black text-slate-800 text-sm truncate">
                    {participants[1]?.studentName || '—'}
                  </div>
                  <div className="text-xs font-black text-indigo-600">
                    {participants[1]?.totalScore || 0} pts
                  </div>
                </div>

                {/* 1st Place */}
                <div className="p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 text-center space-y-2 transform -translate-y-2 shadow-md">
                  <span className="text-3xl">👑</span>
                  <div className="font-bold text-xs text-amber-600">{t('rankFirst')} (+5 {t('points')})</div>
                  <div className="font-black text-slate-900 text-base truncate">
                    {participants[0]?.studentName || '—'}
                  </div>
                  <div className="text-sm font-black text-amber-600">
                    {participants[0]?.totalScore || 0} pts
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 text-center space-y-2 order-2 sm:order-none">
                  <span className="text-2xl">🥉</span>
                  <div className="font-bold text-xs text-slate-400">{t('rankThird')} (+2 {t('points')})</div>
                  <div className="font-black text-slate-800 text-sm truncate">
                    {participants[2]?.studentName || '—'}
                  </div>
                  <div className="text-xs font-black text-indigo-600">
                    {participants[2]?.totalScore || 0} pts
                  </div>
                </div>
              </div>

              {/* Award Game Points Action */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <p className="text-xs text-slate-600 font-medium">
                  {isRtl
                    ? 'سيتم منح المركز الأول 5 نقاط، والثاني 3 نقاط، والثالث نقطتان في دفتر النقاط غير القابل للتلاعب (مصدر: الألعاب)'
                    : '1st receives 5 pts, 2nd 3 pts, 3rd 2 pts into points ledger (source: games)'}
                </p>

                  {awardMessage ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-black flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{awardMessage}</span>
                      </div>
                      <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 mx-auto"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>{isRtl ? 'إغلاق والعودة لمكتبة الألعاب' : 'Close and Return to Games'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleAwardGamePoints}
                        disabled={isAwardingPoints || session.pointsAwarded}
                        className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Trophy className="w-5 h-5" />
                        <span>{session.pointsAwarded ? t('pointsAwardedSuccess') : t('awardGamePointsBtn')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm transition-all"
                      >
                        <span>{isRtl ? 'إغلاق' : 'Close'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
          ) : (
            /* ACTIVE PLAY VIEW */
            <div className="space-y-6">
              {/* Question Banner */}
              <div className="p-5 sm:p-6 rounded-3xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 px-3 py-1 rounded-full bg-white border border-indigo-200">
                    {currentQ?.lessonTitle}
                  </span>
                  <span className="text-xs font-black text-amber-600">
                    +{currentQ?.suggestedPoints || 1} {t('points')}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-relaxed">
                  {currentQ?.questionText}
                </h3>
              </div>

              {/* 1. Multiple Choice & 2. True/False */}
              {(currentQ?.type === 'multiple_choice' || currentQ?.type === 'true_false') && currentQ.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQ.options.map((opt, i) => {
                    const isSelected = selectedOption === opt;
                    const isCorrectOpt = answerSubmitted && opt === currentQ.correctAnswer;
                    const isWrongSelected = answerSubmitted && isSelected && !lastResult?.isCorrect;

                    let btnClass = 'bg-white border-slate-200 text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/30';
                    if (isCorrectOpt) {
                      btnClass = 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500';
                    } else if (isWrongSelected) {
                      btnClass = 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500';
                    } else if (isSelected) {
                      btnClass = 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500';
                    }

                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={answerSubmitted}
                        onClick={() => {
                          setSelectedOption(opt);
                          handleSubmitAnswer(opt);
                        }}
                        className={`p-4 rounded-2xl border-2 text-start font-black text-sm sm:text-base transition-all flex items-center justify-between gap-3 shadow-2xs ${btnClass}`}
                      >
                        <span>{opt}</span>
                        {isCorrectOpt && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                        {isWrongSelected && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 3. Lucky Wheel (Educational Lucky Wheel Mode) */}
              {activity.gameType === 'lucky_wheel' && (
                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 text-center space-y-4">
                  <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                    <div
                      className="w-44 h-44 rounded-full border-8 border-indigo-600 bg-linear-to-tr from-amber-300 via-rose-300 to-indigo-400 flex items-center justify-center shadow-lg transition-transform duration-3000 ease-out"
                      style={{ transform: `rotate(${wheelRotation}deg)` }}
                    >
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    {/* Wheel pointer */}
                    <div className="absolute top-0 w-4 h-6 bg-rose-600 clip-triangle shadow-md" />
                  </div>

                  <button
                    type="button"
                    onClick={spinLuckyWheel}
                    disabled={isSpinning}
                    className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {isSpinning ? 'جارٍ دوران العجلة...' : t('spinWheel')}
                  </button>

                  {wheelSelectedStudent && (
                    <div className="p-3 rounded-2xl bg-amber-100 text-amber-900 font-black text-sm animate-pulse">
                      🎯 البطل المختار للإجابة: {wheelSelectedStudent.name}
                    </div>
                  )}
                </div>
              )}

              {/* 5. Who Am I (من أنا؟ مع تلميحات متدرجة) */}
              {currentQ?.type === 'who_am_i' && currentQ.hints && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {currentQ.hints.map((hint, hIdx) => (
                      <div
                        key={hIdx}
                        className={`p-4 rounded-2xl border transition-all ${
                          hIdx < revealedHints
                            ? 'bg-amber-50/70 border-amber-200 text-slate-800'
                            : 'bg-slate-100 border-slate-200 text-slate-400 select-none blur-xs'
                        }`}
                      >
                        <span className="font-bold text-xs text-amber-600 block mb-1">
                          تلميح {hIdx + 1}:
                        </span>
                        <p className="font-medium text-sm">
                          {hIdx < revealedHints ? hint : 'تلميح مشفر — انقر لكشفه'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {revealedHints < currentQ.hints.length && !answerSubmitted && (
                    <button
                      type="button"
                      onClick={() => setRevealedHints((prev) => prev + 1)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-xs transition-colors flex items-center gap-2"
                    >
                      <Compass className="w-4 h-4" />
                      <span>{t('revealHint')} ({revealedHints}/{currentQ.hints.length})</span>
                    </button>
                  )}

                  {!answerSubmitted && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        placeholder="اكتب اسم الشخصية أو المفهوم هنا..."
                        className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-bold shadow-2xs focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSubmitAnswer(textAnswer)}
                        className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black shadow-md transition-all"
                      >
                        تأكيد الإجابة
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 6. Match Answers (طابق الإجابات) */}
              {currentQ?.type === 'matching' && currentQ.matchingPairs && (
                <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                  <p className="text-xs font-bold text-slate-500">
                    انقر على المصطلح في اليمين ثم انقر على تعريفه المناسب في اليسار:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Left Column */}
                    <div className="space-y-2">
                      {currentQ.matchingPairs.map((pair, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setSelectedLeft(pair.left)}
                          className={`w-full p-3 rounded-2xl border text-start font-bold text-sm transition-all ${
                            selectedLeft === pair.left
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : matchedPairs[pair.left]
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-white text-slate-800 border-slate-200'
                          }`}
                        >
                          {pair.left} {matchedPairs[pair.left] ? '✓' : ''}
                        </button>
                      ))}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-2">
                      {currentQ.matchingPairs.map((pair, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => {
                            if (selectedLeft) {
                              setMatchedPairs((prev) => ({ ...prev, [selectedLeft]: pair.right }));
                              setSelectedLeft(null);
                            }
                          }}
                          className={`w-full p-3 rounded-2xl border text-start font-bold text-xs transition-all ${
                            Object.values(matchedPairs).includes(pair.right)
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-white text-slate-800 border-slate-200 hover:bg-indigo-50/50'
                          }`}
                        >
                          {pair.right}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!answerSubmitted && (
                    <button
                      type="button"
                      onClick={() => handleSubmitAnswer('matching_completed')}
                      className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md"
                    >
                      {t('checkMatching')}
                    </button>
                  )}
                </div>
              )}

              {/* 7. Card Ordering (ترتيب البطاقات) */}
              {currentQ?.type === 'ordering' && orderedList.length > 0 && (
                <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                  <p className="text-xs font-bold text-slate-500">
                    استخدم الأسهم لإعادة ترتيب البطاقات بالتسلسل الزمني أو المنطقي الصحيح:
                  </p>
                  <div className="space-y-2">
                    {orderedList.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-sm text-slate-800">{item}</span>
                        </div>
                        {!answerSubmitted && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => {
                                const copy = [...orderedList];
                                const temp = copy[idx - 1];
                                copy[idx - 1] = copy[idx];
                                copy[idx] = temp;
                                setOrderedList(copy);
                              }}
                              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={idx === orderedList.length - 1}
                              onClick={() => {
                                const copy = [...orderedList];
                                const temp = copy[idx + 1];
                                copy[idx + 1] = copy[idx];
                                copy[idx] = temp;
                                setOrderedList(copy);
                              }}
                              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30"
                            >
                              ↓
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {!answerSubmitted && (
                    <button
                      type="button"
                      onClick={() => handleSubmitAnswer(orderedList.join(','))}
                      className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md"
                    >
                      {t('checkOrder')}
                    </button>
                  )}
                </div>
              )}

              {/* 8. Fill in the Blank / Short Answer */}
              {(currentQ?.type === 'fill_blank' || currentQ?.type === 'short_answer') && (
                <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      disabled={answerSubmitted}
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      placeholder="اكتب الإجابة النموذجية هنا..."
                      className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-bold shadow-2xs focus:ring-2 focus:ring-indigo-500"
                    />
                    {!answerSubmitted && (
                      <button
                        type="button"
                        onClick={() => handleSubmitAnswer(textAnswer)}
                        className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black shadow-md transition-all"
                      >
                        تحقق من الإجابة
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 9. Educational Treasure Hunt Stage Doors */}
              {activity.gameType === 'treasure_hunt' && (
                <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-around gap-2 text-center">
                  {questions.map((_, sIdx) => {
                    const isUnlocked = unlockedStages.includes(sIdx);
                    return (
                      <div key={sIdx} className="space-y-1">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black mx-auto transition-all ${
                            isUnlocked
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-amber-200 text-amber-800'
                          }`}
                        >
                          {isUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 block">
                          بوابة {sIdx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Result & Explanation Feedback Pill */}
              {answerSubmitted && lastResult && (
                <div
                  className={`p-4 rounded-2xl border transition-all space-y-2 ${
                    lastResult.isCorrect
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-sm">
                    {lastResult.isCorrect ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>إجابة صحيحة ومتميزة! (+{lastResult.earnedScore} نقطة)</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-rose-600" />
                        <span>إجابة تحتاج إلى مراجعة!</span>
                      </>
                    )}
                  </div>
                  {lastResult.explanation && (
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">
                      💡 {lastResult.explanation}
                    </p>
                  )}
                  {currentQ?.sourceReference && (
                    <span className="text-[10px] text-slate-400 font-bold block">
                      المرجع: {currentQ.sourceReference}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        {!isGameOver && (
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-2"
            >
              {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              <span>السابق</span>
            </button>

            <button
              type="button"
              onClick={handleNextQuestion}
              className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-2"
            >
              <span>{currentIdx + 1 === questions.length ? 'إنهاء النشاط وعرض التتويج' : 'السؤال التالي'}</span>
              {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
