/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { Student, RewardItem, RewardRequest, PointTransaction } from '../../types/index.ts';
import { apiRequest } from '../../api/client.ts';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Sparkles,
  Coins,
  ShoppingBag,
  Gift,
  Award,
  Crown,
  FileText,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Gamepad2,
  Puzzle,
  Compass,
  Play,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [student, setStudent] = useState<Student | null>(null);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [myRequests, setMyRequests] = useState<RewardRequest[]>([]);
  const [myTransactions, setMyTransactions] = useState<PointTransaction[]>([]);
  const [myTests, setMyTests] = useState<any[]>([]);
  const [myHomework, setMyHomework] = useState<any[]>([]);
  const [myQuestions, setMyQuestions] = useState<any[]>([]);
  const [availableActivities, setAvailableActivities] = useState<any[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'store' | 'games' | 'tests' | 'leaderboard' | 'history'>('store');
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Student Daily Puzzle State
  const [puzzleAnswer, setPuzzleAnswer] = useState('');
  const [puzzleResult, setPuzzleResult] = useState<{ isCorrect: boolean; message: string } | null>(null);

  // Student Interactive Activity Play State
  const [activePlayQuiz, setActivePlayQuiz] = useState<{
    activity: any;
    questions: any[];
  } | null>(null);
  const [currentQuizQIdx, setCurrentQuizQIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [currentQuizAnswer, setCurrentQuizAnswer] = useState('');
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizResultSummary, setQuizResultSummary] = useState<any | null>(null);

  const fetchStudentData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [historyData, rewardsData, requestsData, testsData, hwData, lbData, qData, actData] =
        await Promise.all([
          apiRequest<{ student: Student; transactions: PointTransaction[] }>(
            `/students/${user.id}/history`
          ),
          apiRequest<RewardItem[]>('/rewards'),
          apiRequest<RewardRequest[]>('/rewards/requests'),
          apiRequest<any[]>('/tests'),
          apiRequest<any[]>('/homework'),
          apiRequest<any>('/leaderboard'),
          apiRequest<any[]>('/questions'),
          apiRequest<any[]>('/student/games/available'),
        ]);

      setStudent(historyData.student);
      setMyTransactions(historyData.transactions);
      setRewards(rewardsData);
      setMyRequests(requestsData);
      setMyTests(testsData);
      setMyHomework(hwData);
      setLeaderboardData(lbData);
      setMyQuestions(qData || []);
      setAvailableActivities(actData || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  // Start Playing Interactive Challenge
  const handleStartActivity = async (activity: any) => {
    try {
      const data = await apiRequest<{ activity: any; questions: any[] }>('/student/games/start-session', {
        method: 'POST',
        body: JSON.stringify({ activityId: activity.id }),
      });
      setActivePlayQuiz(data);
      setCurrentQuizQIdx(0);
      setQuizAnswers({});
      setCurrentQuizAnswer('');
      setQuizResultSummary(null);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'تعذر بدء النشاط' });
    }
  };

  const handleNextQuizQuestion = () => {
    if (!activePlayQuiz) return;
    const currentQ = activePlayQuiz.questions[currentQuizQIdx];
    if (currentQ) {
      setQuizAnswers((prev) => ({
        ...prev,
        [currentQ.id]: currentQuizAnswer,
      }));
    }
    if (currentQuizQIdx + 1 < activePlayQuiz.questions.length) {
      setCurrentQuizQIdx((prev) => prev + 1);
      setCurrentQuizAnswer('');
    } else {
      // Final submit
      handleSubmitQuiz();
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activePlayQuiz) return;
    const currentQ = activePlayQuiz.questions[currentQuizQIdx];
    const finalAnswersObj: Record<string, string> = {
      ...quizAnswers,
      ...(currentQ?.id ? { [currentQ.id]: currentQuizAnswer } : {}),
    };

    const answersPayload = activePlayQuiz.questions.map((q: any) => ({
      questionId: q.id,
      answer: finalAnswersObj[q.id] || '',
      timeSeconds: 10,
    }));

    setIsSubmittingQuiz(true);
    try {
      const res = await apiRequest<any>('/student/games/submit-quiz', {
        method: 'POST',
        body: JSON.stringify({
          activityId: activePlayQuiz.activity.id,
          answers: answersPayload,
        }),
      });

      setQuizResultSummary(res);
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      // Refresh student balance & ledger immediately!
      fetchStudentData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'تعذر إرسال الإجابات' });
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const handleRedeemReward = async (reward: RewardItem) => {
    if (!student) return;
    setStatusMessage(null);

    if (student.availableBalance < reward.costPoints) {
      setStatusMessage({
        type: 'error',
        text: `نقاطك المتاحة (${student.availableBalance}) أقل من سعر المكافأة (${reward.costPoints})`,
      });
      return;
    }

    setRedeemingId(reward.id);
    try {
      const res = await apiRequest(`/rewards/${reward.id}/redeem`, {
        method: 'POST',
      });

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      setStatusMessage({
        type: 'success',
        text: res.message || 'تم إرسال طلب المكافأة بنجاح!',
      });
      fetchStudentData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message,
      });
    } finally {
      setRedeemingId(null);
    }
  };

  if (loading && !student) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500 text-xs">
        جارٍ تحميل منصة الأبطال...
      </div>
    );
  }

  const studentName = student?.name || user?.name || 'البطل';
  const availableBalance = student?.availableBalance || 0;
  const totalEarned = student?.historicalAchievement || 0;
  const totalSpent = student?.totalSpent || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center text-amber-200 shadow-inner">
              <Trophy className="w-9 h-9 sm:w-11 sm:h-11" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs">
                  {t('studentCode')}: {student?.studentCode}
                </span>
                {student?.activeTitle && (
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-300 text-amber-950">
                    👑 {student.activeTitle}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                {t('welcomeHero', { name: studentName })}
              </h2>
              <p className="text-xs sm:text-sm text-amber-100 font-medium mt-1">
                {user?.studentProfile?.className || (language === 'ar' ? 'فصل الأبطال' : 'Heroes Classroom')} •{' '}
                {language === 'ar' ? 'البوابة التعليمية الرسمية للطالب' : 'Official Student Portal'}
              </p>
            </div>
          </div>

          {/* Badges showcase */}
          {student?.badges && student.badges.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {student.badges.map((badge, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-100 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{badge}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3 Prominent Stat Cards (Mandatory Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Available Balance */}
        <div className="p-5 rounded-3xl bg-white border border-indigo-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">
              {t('availableForRedeem')}
            </span>
            <span className="text-3xl font-black text-indigo-700 block mt-1">
              {availableBalance}
            </span>
            <span className="text-[11px] text-indigo-600 font-semibold">
              {t('availableForRedeemSub')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Total Earned (Historical Achievement) */}
        <div className="p-5 rounded-3xl bg-white border border-emerald-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">
              {t('totalEarnedBanner')}
            </span>
            <span className="text-3xl font-black text-emerald-600 block mt-1">
              {totalEarned}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold">
              {t('totalEarnedBannerSub')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* Spent Points */}
        <div className="p-5 rounded-3xl bg-white border border-amber-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">
              {t('spentPointsBanner')}
            </span>
            <span className="text-3xl font-black text-amber-600 block mt-1">
              {totalSpent}
            </span>
            <span className="text-[11px] text-amber-600 font-semibold">
              {t('spentPointsBannerSub')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Status Alert if any */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-2xs gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('store')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'store'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>متجر المكافآت ({rewards.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('games')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'games'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Gamepad2 className="w-4 h-4 text-amber-500" />
          <span>{language === 'ar' ? 'ألعاب وتحديات صفي' : 'Class Challenges'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tests')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'tests'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>نتائجي واختباراتي ({myTests.length})</span>
        </button>

        {leaderboardData?.leaderboardVisible !== false && (
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'leaderboard'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>لوحة المتصدرين</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>سجل نقاطي ({myTransactions.length})</span>
        </button>
      </div>

      {/* Tab 1: Rewards Store */}
      {activeTab === 'store' && (
        <div className="space-y-6">
          {/* My Active Requests Section */}
          {myRequests.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>طلباتي السابقة وحالتها:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {myRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">
                        {req.rewardTitle}
                      </h5>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString('ar-SA')}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'approved'
                          ? 'bg-blue-100 text-blue-800'
                          : req.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.status === 'delivered'
                        ? 'تم الاستلام'
                        : req.status === 'approved'
                        ? 'معتمد للاستلام'
                        : req.status === 'rejected'
                        ? 'مرفوض ومسترد'
                        : 'بانتظار المعلم'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rewards Catalog Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => {
              const canAfford = availableBalance >= reward.costPoints;
              const isOutOfStock = reward.stock !== null && reward.stock <= 0;

              return (
                <div
                  key={reward.id}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <Gift className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                        {reward.costPoints} نقطة
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-slate-900">
                      {reward.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {reward.description || 'مكافأة رائعة من معلم الفصل'}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        المخزون:{' '}
                        {reward.stock === null ? 'متاح دائمًا' : `${reward.stock} متوفر`}
                      </span>
                      {!canAfford && (
                        <span className="text-rose-500 font-bold">
                          ينقصك {reward.costPoints - availableBalance} نقطة
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!canAfford || isOutOfStock || redeemingId === reward.id}
                      onClick={() => handleRedeemReward(reward)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-2xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700"
                    >
                      {redeemingId === reward.id ? (
                        'جارٍ إرسال الطلب...'
                      ) : isOutOfStock ? (
                        'نفد المخزون'
                      ) : canAfford ? (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>طلب استبدال المكافأة</span>
                        </>
                      ) : (
                        'رصيدك غير كافٍ'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: My Tests and Homework */}
      {activeTab === 'tests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tests */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>نتائج الاختبارات والتقييمات الفصلية</span>
            </h4>

            {myTests.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                لا توجد اختبارات مسجلة لك بعد.
              </p>
            ) : (
              <div className="space-y-2">
                {myTests.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{t.title}</h5>
                      <span className="text-[11px] text-slate-400">التاريخ: {t.date}</span>
                    </div>

                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-700 block">
                        الدرجة: {t.myScoreOutOf20 ?? '-'} / 20
                      </span>
                      <span className="text-xs font-extrabold text-indigo-700 block">
                        +{t.myPointsAwarded ?? 0} نقاط
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Homework */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>نتائج الواجبات والمهام المنزلية</span>
            </h4>

            {myHomework.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                لا توجد واجبات مرصودة لك بعد.
              </p>
            ) : (
              <div className="space-y-2">
                {myHomework.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{h.title}</h5>
                      <span className="text-[11px] text-slate-400">التسليم: {h.dueDate}</span>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        {h.myEvaluation === 'complete_correct'
                          ? 'مكتمل وصحيح'
                          : h.myEvaluation === 'minor_errors'
                          ? 'أخطاء بسيطة'
                          : 'أخطاء كثيرة'}
                      </span>
                      <span className="text-xs font-extrabold text-amber-700 block">
                        +{h.myPointsAwarded ?? 0} نقاط
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Leaderboard */}
      {activeTab === 'leaderboard' && leaderboardData && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>ترتيب أبطال الصف ({leaderboardData.classroomName})</span>
            </h4>
          </div>

          <div className="divide-y divide-slate-100">
            {leaderboardData.students?.map((st: any, idx: number) => {
              const isMe = st.id === user?.id;

              return (
                <div
                  key={st.id}
                  className={`p-4 flex items-center justify-between transition-colors ${
                    isMe ? 'bg-indigo-50/70 border-r-4 border-r-indigo-600' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                        idx === 0
                          ? 'bg-amber-400 text-amber-950'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-800'
                          : idx === 2
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs sm:text-sm font-extrabold ${
                            isMe ? 'text-indigo-900 font-black' : 'text-slate-800'
                          }`}
                        >
                          {st.name} {isMe ? '(أنت)' : ''}
                        </span>
                        {st.activeTitle && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                            {st.activeTitle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs sm:text-sm font-black text-indigo-700">
                    {st.points} نقطة
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Points History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>سجل الحركات والنقاط الممنوحة لك</span>
            </h4>
          </div>

          {myTransactions.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">
              لم تُسجل أي حركات نقاط بعد.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {myTransactions.map((tx) => (
                <div key={tx.id} className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {tx.reason}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(tx.date).toLocaleDateString('ar-SA')} -{' '}
                      {new Date(tx.date).toLocaleTimeString('ar-SA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-black ${
                      tx.points > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {tx.points > 0 ? `+${tx.points}` : tx.points} نقطة
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Educational Games & Challenges */}
      {activeTab === 'games' && (
        <div className="space-y-6">
          {/* Daily Puzzle Section */}
          <div className="p-6 rounded-3xl bg-linear-to-br from-purple-900 via-indigo-900 to-slate-900 text-white shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                <span>{language === 'ar' ? 'لغز اليوم الذكي' : 'Daily Brain Puzzle'}</span>
              </span>
              <span className="text-xs font-black text-amber-300">
                +10 {t('points')}
              </span>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-black leading-snug">
                {language === 'ar'
                  ? 'عدد إذا ضربته في نفسه وأضفت إليه 5 كان الناتج 30، وإذا طرحت منه 2 أصبح الناتج 3. فما هو هذا العدد؟'
                  : 'A number multiplied by itself plus 5 equals 30, and subtracted by 2 equals 3. What is this number?'}
              </h3>
              <p className="text-xs text-indigo-200 mt-1">
                {language === 'ar'
                  ? 'تحدي الذكاء الرياضي اليومي لأبطال الفصل'
                  : 'Daily Classroom Math Challenge'}
              </p>
            </div>

            {puzzleResult ? (
              <div
                className={`p-4 rounded-2xl font-black text-xs flex items-center gap-2 ${
                  puzzleResult.isCorrect
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {puzzleResult.isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
                <span>{puzzleResult.message}</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={puzzleAnswer}
                  onChange={(e) => setPuzzleAnswer(e.target.value)}
                  placeholder={language === 'ar' ? 'اكتب إجابتك هنا...' : 'Enter your answer...'}
                  className="bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-2xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const norm = puzzleAnswer.trim();
                    if (norm === '5' || norm === 'خمسة' || norm === 'five') {
                      setPuzzleResult({
                        isCorrect: true,
                        message: language === 'ar' ? 'إجابة عبقرية وصحيحة! تم تسجيل إنجازك بنجاح' : 'Genius answer! Solved correctly!',
                      });
                      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
                    } else {
                      setPuzzleResult({
                        isCorrect: false,
                        message: language === 'ar' ? 'حاول مجددًا! فكّر في الرقم واضربه في نفسه' : 'Try again! Think of a number squared.',
                      });
                    }
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all shrink-0"
                >
                  {language === 'ar' ? 'إرسال الإجابة' : 'Submit Answer'}
                </button>
              </div>
            )}
          </div>

          {/* Active Published Activities & Quizzes */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-indigo-600" />
                <span>{language === 'ar' ? `أنشطة ومسابقات الفصل التفاعلية (${availableActivities.length})` : `Active Classroom Challenges (${availableActivities.length})`}</span>
              </h4>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                {language === 'ar' ? 'نقاط حقيقية تُضاف لرصيدك مباشرة' : 'Real points awarded'}
              </span>
            </div>

            {availableActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center font-bold">
                {language === 'ar' ? 'لا توجد أنشطة صفية مفعلة حاليًا من قبل المعلم.' : 'No active challenges at the moment.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3 hover:shadow-md transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-800">
                          {act.subjectId}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">⏱️ {act.timeLimitSeconds}s</span>
                      </div>
                      <h5 className="text-xs font-black text-slate-900 leading-snug">{act.title}</h5>
                      {act.lessonTitle && (
                        <p className="text-[11px] text-slate-500 font-medium">{act.lessonTitle}</p>
                      )}
                      <span className="text-[10px] font-bold text-slate-400 block">
                        {act.questionIds?.length || 3} {language === 'ar' ? 'أسئلة' : 'questions'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartActivity(act)}
                      className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{language === 'ar' ? 'بدء التحدي واللعب' : 'Start Challenge'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* INTERACTIVE STUDENT QUIZ MODAL */}
      {activePlayQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 border border-slate-200 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  {activePlayQuiz.activity.title}
                </span>
                {!quizResultSummary && (
                  <span className="text-xs font-bold text-slate-400 block mt-1">
                    {language === 'ar' ? `السؤال ${currentQuizQIdx + 1} من ${activePlayQuiz.questions.length}` : `Question ${currentQuizQIdx + 1} of ${activePlayQuiz.questions.length}`}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setActivePlayQuiz(null);
                  setQuizResultSummary(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* QUIZ SUMMARY VIEW */}
            {quizResultSummary ? (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <Trophy className="w-8 h-8" />
                </div>
                <h4 className="text-base font-black text-slate-900">
                  {language === 'ar' ? 'أحسنت يا بطل! اكتمل التحدي بنجاح' : 'Great Job! Challenge Completed'}
                </h4>
                <p className="text-xs text-slate-500 font-bold">
                  {language === 'ar'
                    ? `أجبت بشكل صحيح على ${quizResultSummary.correctCount} من ${quizResultSummary.totalQuestions} وحصلت على +${quizResultSummary.pointsAwarded} نقطة!`
                    : `Correct answers: ${quizResultSummary.correctCount}/${quizResultSummary.totalQuestions} (+${quizResultSummary.pointsAwarded} pts)`}
                </p>
                {quizResultSummary.notice && (
                  <p className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl font-bold">
                    {quizResultSummary.notice}
                  </p>
                )}

                {/* Question Review List */}
                <div className="text-right space-y-2 max-h-60 overflow-y-auto pt-2">
                  {quizResultSummary.reviewItems?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl text-xs space-y-1 border ${
                        item.isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-black">
                        <span className="text-slate-800">{item.questionText}</span>
                        <span className={item.isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                          {item.isCorrect ? (language === 'ar' ? '✓ صحيح' : 'Correct') : (language === 'ar' ? '✗ يحتاج مراجعة' : 'Incorrect')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">
                        {language === 'ar' ? `إجابتك: ${item.studentAnswer || '(لم تُجب)'}` : `Your answer: ${item.studentAnswer || '-'}`}
                      </p>
                      {item.explanation && (
                        <p className="text-[10px] text-slate-500 font-bold">💡 {item.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActivePlayQuiz(null);
                    setQuizResultSummary(null);
                  }}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all"
                >
                  {language === 'ar' ? 'إغلاق والعودة للتحديات' : 'Close and Return'}
                </button>
              </div>
            ) : (
              /* ACTIVE QUESTION VIEW */
              (() => {
                const q = activePlayQuiz.questions[currentQuizQIdx];
                if (!q) return null;

                return (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-1">
                      <span className="text-[10px] font-bold text-indigo-600 block">{q.unitName || q.lessonTitle}</span>
                      <h4 className="text-sm font-black text-slate-900 leading-relaxed">{q.questionText}</h4>
                    </div>

                    {/* Options if Multiple Choice or True/False */}
                    {q.options && q.options.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt: string, oIdx: number) => {
                          const isSelected = currentQuizAnswer === opt;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => setCurrentQuizAnswer(opt)}
                              className={`p-3 rounded-2xl border text-xs font-bold text-right transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                              }`}
                            >
                              <span>{opt}</span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      /* Text Input if Short Answer or Fill Blank */
                      <div>
                        <input
                          type="text"
                          value={currentQuizAnswer}
                          onChange={(e) => setCurrentQuizAnswer(e.target.value)}
                          placeholder={language === 'ar' ? 'اكتب إجابتك هنا...' : 'Type answer...'}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    {/* Bottom Nav */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-bold">
                        +{q.suggestedPoints || 1} {t('points')}
                      </span>

                      <button
                        type="button"
                        disabled={!currentQuizAnswer.trim() || isSubmittingQuiz}
                        onClick={handleNextQuizQuestion}
                        className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all disabled:opacity-40 flex items-center gap-2"
                      >
                        <span>
                          {currentQuizQIdx + 1 === activePlayQuiz.questions.length
                            ? (isSubmittingQuiz ? (language === 'ar' ? 'جاري الرصد...' : 'Submitting...') : (language === 'ar' ? 'تسليم الإجابات واعتماد النقاط' : 'Submit & Award'))
                            : (language === 'ar' ? 'السؤال التالي' : 'Next Question')}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
};
