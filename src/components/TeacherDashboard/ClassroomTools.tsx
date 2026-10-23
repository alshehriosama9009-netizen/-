/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student } from '../../types/index.ts';
import { AwardPointsModal } from './AwardPointsModal.tsx';
import confetti from 'canvas-confetti';
import {
  Gamepad2,
  Sparkles,
  Trophy,
  Play,
  RotateCcw,
  Timer,
  UserCheck,
  Award,
  Dice5,
} from 'lucide-react';

interface ClassroomToolsProps {
  classId: string;
  students: Student[];
  onRefresh: () => void;
}

export const ClassroomTools: React.FC<ClassroomToolsProps> = ({
  classId,
  students,
  onRefresh,
}) => {
  // Random Hero Picker
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedHero, setSelectedHero] = useState<Student | null>(null);
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);

  // Countdown Timer
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [initialDuration, setInitialDuration] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      try {
        confetti({ particleCount: 50, spread: 60 });
      } catch (e) {}
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const spinRandomHero = () => {
    if (students.length === 0 || isSpinning) return;
    setIsSpinning(true);
    setSelectedHero(null);

    let count = 0;
    const maxTicks = 25;
    const interval = setInterval(() => {
      const randIndex = Math.floor(Math.random() * students.length);
      setSelectedHero(students[randIndex]);
      count++;

      if (count >= maxTicks) {
        clearInterval(interval);
        setIsSpinning(false);
        try {
          confetti({
            particleCount: 80,
            spread: 90,
            origin: { y: 0.6 },
          });
        } catch (e) {}
      }
    }, 100);
  };

  const handleStartTimer = (secs: number) => {
    setInitialDuration(secs);
    setTimerSeconds(secs);
    setIsTimerRunning(true);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(initialDuration);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1. Wheel of Fortune / Random Hero Picker */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-5">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Dice5 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">
                عجلة اختيار البطل العشوائي
              </h3>
              <p className="text-xs text-slate-400">
                اختيار عشوائي وسريع لطالب للإجابة أو التكريم
              </p>
            </div>
          </div>

          {/* Hero Display Box */}
          <div className="my-6 p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
            <Sparkles className="w-6 h-6 text-amber-300 mx-auto mb-2 animate-bounce" />

            {selectedHero ? (
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-300">
                  {isSpinning ? 'جارٍ السحب العشوائي...' : '🎉 البطل المختار:'}
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-white">
                  {selectedHero.name}
                </h4>
                <p className="text-xs text-indigo-200">
                  كود الطالب: {selectedHero.studentCode} | الرصيد: {selectedHero.availableBalance} نقطة
                </p>
              </div>
            ) : (
              <div className="py-4 text-xs text-indigo-200">
                اضغط الزر أدناه لبدء السحب العشوائي
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={spinRandomHero}
            disabled={isSpinning || students.length === 0}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isSpinning ? 'جارٍ الاختيار...' : 'سحب بطل عشوائي الآن!'}</span>
          </button>

          {selectedHero && !isSpinning && (
            <button
              type="button"
              onClick={() => setWinnerModalOpen(true)}
              className="w-full py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-all flex items-center justify-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              <span>منح نقاط فورية لـ ({selectedHero.name})</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Classroom Timer & Challenge */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-5">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">
                مؤقت التحديات والأنشطة الصفية
              </h3>
              <p className="text-xs text-slate-400">
                مؤقت تنازلي مرئي لإدارة المسابقات وحل الألغاز
              </p>
            </div>
          </div>

          {/* Big Timer Clock Display */}
          <div
            className={`my-6 p-6 rounded-3xl border text-center transition-all ${
              timerSeconds === 0
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : isTimerRunning
                ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <span className="text-4xl sm:text-5xl font-black font-mono tracking-wider">
              {Math.floor(timerSeconds / 60)
                .toString()
                .padStart(2, '0')}
              :{(timerSeconds % 60).toString().padStart(2, '0')}
            </span>
            <span className="block text-xs font-bold mt-2">
              {timerSeconds === 0 ? 'انتهى الوقت!' : isTimerRunning ? 'التحدي جارٍ...' : 'جاهز للبدء'}
            </span>
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-4 gap-2">
            {[15, 30, 60, 120].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleStartTimer(s)}
                className="py-1.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-xs font-bold text-slate-700 transition-colors"
              >
                {s < 60 ? `${s} ثانية` : `${s / 60} دقيقة`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className={`flex-1 py-3 rounded-2xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-1.5 ${
              isTimerRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>{isTimerRunning ? 'إيقاف مؤقت' : 'بدء المؤقت'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetTimer}
            className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600"
            title="إعادة تعيين المؤقت"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Award Points Modal for Chosen Random Hero */}
      {selectedHero && (
        <AwardPointsModal
          isOpen={winnerModalOpen}
          onClose={() => setWinnerModalOpen(false)}
          classId={classId}
          selectedStudents={[selectedHero]}
          onPointsAwarded={onRefresh}
        />
      )}
    </div>
  );
};
