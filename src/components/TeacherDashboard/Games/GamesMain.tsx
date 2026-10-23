/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * Educational Games & Questions Main Hub (7 Core Teacher Pillars)
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

import React, { useState, useEffect } from 'react';
import {
  GameActivity,
  Question,
  CurriculumSubject,
  CurriculumGrade,
  CurriculumLesson,
  GameSession,
  GameType,
} from '../../../types/games.ts';
import { Classroom, Student } from '../../../types/index.ts';
import { useLanguage } from '../../../context/LanguageContext.tsx';
import { apiRequest } from '../../../api/client.ts';
import { GameRunnerModal } from './GameRunnerModal.tsx';
import { QuestionBankManager } from './QuestionBankManager.tsx';
import { AiActivityModal } from './AiActivityModal.tsx';
import { CurriculumSection } from './CurriculumSection.tsx';
import { ActivitiesSection } from './ActivitiesSection.tsx';
import { ParticipantsSection } from './ParticipantsSection.tsx';
import { ResultsSection } from './ResultsSection.tsx';
import { WinnersSection } from './WinnersSection.tsx';
import {
  BookOpen,
  HelpCircle,
  Gamepad2,
  Trophy,
  Users,
  Medal,
  Award,
  Sparkles,
  Play,
  Puzzle,
  Layers,
  ArrowRight,
  Flame,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface GamesMainProps {
  classroom: Classroom;
  students: Student[];
  onRefreshClassStudents: () => void;
}

export type GamesSubTab =
  | 'curriculum'    // 1. المناهج الدراسية
  | 'questions'     // 2. إدارة الأسئلة
  | 'activities'    // 3. إدارة الأنشطة والألعاب
  | 'competitions'  // 4. إدارة المسابقات
  | 'participants'  // 5. الطلاب المشاركون
  | 'results'       // 6. النتائج والترتيب
  | 'winners';      // 7. الطلاب الفائزون

export const GamesMain: React.FC<GamesMainProps> = ({
  classroom,
  students,
  onRefreshClassStudents,
}) => {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  // Sub-tabs
  const [subTab, setSubTab] = useState<GamesSubTab>('activities');

  // Data
  const [activities, setActivities] = useState<GameActivity[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [grades, setGrades] = useState<CurriculumGrade[]>([]);
  const [lessons, setLessons] = useState<CurriculumLesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Lesson-to-Question pipeline state
  const [preselectedLesson, setPreselectedLesson] = useState<CurriculumLesson | null>(null);

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activePlaySession, setActivePlaySession] = useState<{
    session: GameSession;
    questions: Question[];
    activity: GameActivity;
  } | null>(null);

  // Quick Standalone Point Award Modals
  const [isAwardQModalOpen, setIsAwardQModalOpen] = useState(false);
  const [isAwardPuzModalOpen, setIsAwardPuzModalOpen] = useState(false);
  const [selectedStudentForAward, setSelectedStudentForAward] = useState(students[0]?.id || '');
  const [standaloneDifficulty, setStandaloneDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [standaloneReason, setStandaloneReason] = useState('');

  // Quick Launch Flow State for Competitions Tab
  const [qlSubjectId, setQlSubjectId] = useState('science');
  const [qlGameType, setQlGameType] = useState<GameType>('multiple_choice_challenge');
  const [qlQuestionsCount, setQlQuestionsCount] = useState(3);
  const [qlIsTeamMode, setQlIsTeamMode] = useState(false);
  const [qlTimeLimit, setQlTimeLimit] = useState(30);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchHubData = async () => {
    setLoading(true);
    try {
      const [actData, qData, subData, grData, lesData] = await Promise.all([
        apiRequest<GameActivity[]>('/games/activities'),
        apiRequest<Question[]>('/questions'),
        apiRequest<CurriculumSubject[]>('/curriculum/subjects'),
        apiRequest<CurriculumGrade[]>('/curriculum/grades'),
        apiRequest<CurriculumLesson[]>('/curriculum/lessons'),
      ]);
      setActivities(actData);
      setQuestions(qData);
      setSubjects(subData);
      setGrades(grData);
      setLessons(lesData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubData();
  }, []);

  // Launch a game session
  const handleLaunchActivity = async (activity: GameActivity) => {
    try {
      const session = await apiRequest<GameSession>('/games/sessions', {
        method: 'POST',
        body: JSON.stringify({
          activityId: activity.id,
          classId: classroom.id,
          customQuestionIds: activity.questionIds,
          isTeamMode: activity.isTeamMode,
        }),
      });

      // Fetch questions for this session
      const sessQuestions = questions.filter((q) => activity.questionIds.includes(q.id));

      setActivePlaySession({
        session,
        questions: sessQuestions.length > 0 ? sessQuestions : questions.slice(0, 3),
        activity,
      });
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message || 'تعذر تشغيل النشاط' });
    }
  };

  // Launch from Quick Wizard
  const handleQuickLaunch = async () => {
    const matchingQs = questions.filter((q) => {
      if (q.status !== 'approved') return false;
      if (q.subjectId !== qlSubjectId) return false;
      return true;
    });

    const chosenQs = matchingQs.slice(0, qlQuestionsCount);
    if (chosenQs.length === 0) {
      setStatusBanner({
        type: 'error',
        text: isRtl ? 'لا توجد أسئلة معتمدة كافية لهذه المادة في بنك الأسئلة.' : 'Not enough approved questions.',
      });
      return;
    }

    const tempActivity: GameActivity = {
      id: `act_ql_${Date.now()}`,
      teacherId: 'teacher_osama_1',
      title: `${isRtl ? 'تحدي فوري:' : 'Quick Challenge:'} ${subjects.find((s) => s.id === qlSubjectId)?.name || qlSubjectId}`,
      gameType: qlGameType,
      subjectId: qlSubjectId,
      gradeId: 'elem_5',
      termId: 'term_1',
      lessonTitle: isRtl ? 'تحدي سريع منوع' : 'Quick Variety',
      difficulty: 'medium',
      questionIds: chosenQs.map((q) => q.id),
      questionsCount: chosenQs.length,
      timeLimitSeconds: qlTimeLimit,
      showAnswerInstantly: true,
      allowRetry: false,
      isTeamMode: qlIsTeamMode,
      pointsMode: 'automatic',
      status: 'published',
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    handleLaunchActivity(tempActivity);
  };

  const handleCreateQuestionFromLesson = (lesson: CurriculumLesson) => {
    setPreselectedLesson(lesson);
    setSubTab('questions');
  };

  const handleStandaloneAwardQuestion = async () => {
    if (!selectedStudentForAward) return;
    try {
      await apiRequest('/points/award-question', {
        method: 'POST',
        body: JSON.stringify({
          studentId: selectedStudentForAward,
          difficulty: standaloneDifficulty,
          reason: standaloneReason || (isRtl ? 'إجابة متميزة على سؤال صفي' : 'Distinguished answer'),
        }),
      });
      setIsAwardQModalOpen(false);
      setStandaloneReason('');
      setStatusBanner({ type: 'success', text: isRtl ? 'تم اعتماد ومنح نقاط السؤال الصفي بنجاح' : 'Question points awarded' });
      onRefreshClassStudents();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message || 'تعذر منح نقاط السؤال' });
    }
  };

  const handleStandaloneAwardPuzzle = async () => {
    if (!selectedStudentForAward) return;
    try {
      await apiRequest('/points/award-puzzle', {
        method: 'POST',
        body: JSON.stringify({
          studentId: selectedStudentForAward,
          difficulty: standaloneDifficulty,
          reason: standaloneReason || (isRtl ? 'حل لغز الذكاء الصفي اليومي' : 'Solved brain puzzle'),
        }),
      });
      setIsAwardPuzModalOpen(false);
      setStandaloneReason('');
      setStatusBanner({ type: 'success', text: isRtl ? 'تم اعتماد ومنح نقاط اللغز بنجاح' : 'Puzzle points awarded' });
      onRefreshClassStudents();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message || 'تعذر منح نقاط اللغز' });
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
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="px-2 py-0.5 rounded-lg hover:bg-black/5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Welcome Banner */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-indigo-950 via-indigo-900 to-purple-950 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-800/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 shadow-2xs">
              «أبطال الفصل — Class Heroes»
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            {isRtl ? 'منظومة الألعاب والمسابقات والمناهج التعليمية' : 'Curricula, Questions & Games Management'}
          </h2>
          <p className="text-xs text-indigo-200 max-w-2xl leading-relaxed">
            {isRtl
              ? 'المركز الرئيسي لإدارة المناهج السعودية، بنك الأسئلة، الأنشطة، المسابقات، رصد استجابات الطلاب، والنتائج والفائزين'
              : 'Complete teacher hub for curricula, questions, activities, competitions, student results, and winners'}
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-md transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>{isRtl ? 'أنشئ نشاطًا بالذكاء الاصطناعي' : 'Generate AI Activity'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAwardQModalOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>{isRtl ? 'منح سؤال (+1-3)' : 'Award Question'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAwardPuzModalOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Puzzle className="w-4 h-4 text-amber-400" />
            <span>{isRtl ? 'منح لغز (+3-10)' : 'Award Puzzle'}</span>
          </button>
        </div>
      </div>

      {/* 7 Core Teacher Pillars Navigation Bar */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'curriculum', label: isRtl ? '1. المناهج الدراسية' : '1. Curricula', icon: BookOpen },
            { id: 'questions', label: isRtl ? '2. إدارة الأسئلة' : '2. Questions', icon: HelpCircle },
            { id: 'activities', label: isRtl ? '3. إدارة الأنشطة والألعاب' : '3. Activities', icon: Gamepad2 },
            { id: 'competitions', label: isRtl ? '4. إدارة المسابقات' : '4. Competitions', icon: Play },
            { id: 'participants', label: isRtl ? '5. الطلاب المشاركون' : '5. Participants', icon: Users },
            { id: 'results', label: isRtl ? '6. النتائج والترتيب' : '6. Results', icon: Medal },
            { id: 'winners', label: isRtl ? '7. الطلاب الفائزون' : '7. Winners Podium', icon: Trophy },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as GamesSubTab)}
                className={`py-2.5 px-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. CURRICULUM SECTION */}
      {subTab === 'curriculum' && (
        <CurriculumSection
          subjects={subjects}
          grades={grades}
          lessons={lessons}
          onRefreshData={fetchHubData}
          onCreateQuestionFromLesson={handleCreateQuestionFromLesson}
        />
      )}

      {/* 2. QUESTION BANK SECTION */}
      {subTab === 'questions' && (
        <QuestionBankManager
          questions={questions}
          subjects={subjects}
          grades={grades}
          onRefreshQuestions={fetchHubData}
          preselectedLesson={preselectedLesson}
          onClearPreselectedLesson={() => setPreselectedLesson(null)}
        />
      )}

      {/* 3. ACTIVITIES & GAMES SECTION */}
      {subTab === 'activities' && (
        <ActivitiesSection
          classroom={classroom}
          activities={activities}
          questions={questions}
          subjects={subjects}
          grades={grades}
          lessons={lessons}
          onLaunchActivity={handleLaunchActivity}
          onRefreshData={fetchHubData}
        />
      )}

      {/* 4. COMPETITIONS & LIVE MATCH RUNNER SECTION */}
      {subTab === 'competitions' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Play className="w-5 h-5 text-indigo-600 fill-indigo-600" />
                <span>{isRtl ? 'إدارة المسابقات والتشغيل الصفي الفوري' : 'Classroom Competitions & Live Runner'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isRtl
                  ? 'تجهيز مسابقة صفية حية بالأسئلة المعتمدة، وضبط المؤقت، ونمط الفرق أو الأفراد'
                  : 'Configure a live match with approved questions, timer limit, and team mode'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-bold">
              <div>
                <label className="block text-slate-600 mb-1">{isRtl ? 'المادة الدراسية للمسابقة:' : 'Subject:'}</label>
                <select
                  value={qlSubjectId}
                  onChange={(e) => setQlSubjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">{isRtl ? 'نوع المسابقة:' : 'Mode:'}</label>
                <select
                  value={qlGameType}
                  onChange={(e) => setQlGameType(e.target.value as any)}
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
                  <option value="team_challenge">{isRtl ? 'التحدي الجماعي' : 'Team Challenge'}</option>
                  <option value="speed_race">{isRtl ? 'سباق الإجابات' : 'Speed Race'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">{isRtl ? 'عدد الأسئلة:' : 'Questions Count:'}</label>
                <select
                  value={qlQuestionsCount}
                  onChange={(e) => setQlQuestionsCount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                >
                  <option value={3}>3 {isRtl ? 'أسئلة' : 'Questions'}</option>
                  <option value={4}>4 {isRtl ? 'أسئلة' : 'Questions'}</option>
                  <option value={5}>5 {isRtl ? 'أسئلة' : 'Questions'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">{isRtl ? 'المؤقت الزمني لكل سؤال:' : 'Timer Limit:'}</label>
                <select
                  value={qlTimeLimit}
                  onChange={(e) => setQlTimeLimit(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                >
                  <option value={15}>15 {isRtl ? 'ثانية (تحدي سرعة)' : 'sec'}</option>
                  <option value={30}>30 {isRtl ? 'ثانية (قياسي)' : 'sec'}</option>
                  <option value={45}>45 {isRtl ? 'ثانية' : 'sec'}</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="compTeamMode"
                  checked={qlIsTeamMode}
                  onChange={(e) => setQlIsTeamMode(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="compTeamMode" className="text-slate-700 cursor-pointer">
                  {isRtl ? 'مسابقة فرق جماعية (الصقور والأبطال والنجوم)' : 'Team Battle Mode'}
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold">
                {isRtl ? `الفصل المستهدف: ${classroom.name} (${students.length} بطل)` : `Target Class: ${classroom.name}`}
              </span>

              <button
                type="button"
                onClick={handleQuickLaunch}
                className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isRtl ? 'بدء وتشغيل المسابقة الآن' : 'Start Competition Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. PARTICIPANTS SECTION */}
      {subTab === 'participants' && (
        <ParticipantsSection
          classroom={classroom}
          students={students}
        />
      )}

      {/* 6. RESULTS & RANKINGS SECTION */}
      {subTab === 'results' && (
        <ResultsSection
          classroom={classroom}
          students={students}
        />
      )}

      {/* 7. WINNERS PODIUM SECTION */}
      {subTab === 'winners' && (
        <WinnersSection
          classroom={classroom}
          students={students}
          onRefreshClassStudents={onRefreshClassStudents}
        />
      )}

      {/* MODAL 1: AI ACTIVITY GENERATOR */}
      {isAiModalOpen && (
        <AiActivityModal
          subjects={subjects}
          grades={grades}
          onClose={() => setIsAiModalOpen(false)}
          onQuestionsGenerated={() => fetchHubData()}
          onLaunchWithQuestions={(draftQs, actTitle, actGameType) => {
            setIsAiModalOpen(false);
            const aiActivity: GameActivity = {
              id: `act_ai_${Date.now()}`,
              teacherId: 'teacher_osama_1',
              title: actTitle,
              gameType: actGameType,
              subjectId: draftQs[0]?.subjectId || 'science',
              gradeId: draftQs[0]?.gradeId || 'elem_5',
              termId: draftQs[0]?.termId || 'term_1',
              lessonTitle: draftQs[0]?.lessonTitle || actTitle,
              difficulty: draftQs[0]?.difficulty || 'medium',
              questionIds: draftQs.map((q) => q.id),
              questionsCount: draftQs.length,
              timeLimitSeconds: 30,
              showAnswerInstantly: true,
              allowRetry: false,
              isTeamMode: false,
              pointsMode: 'automatic',
              status: 'published',
              isArchived: false,
              createdAt: new Date().toISOString(),
            };
            handleLaunchActivity(aiActivity);
          }}
        />
      )}

      {/* MODAL 2: GAME RUNNER MODAL */}
      {activePlaySession && (
        <GameRunnerModal
          session={activePlaySession.session}
          questions={activePlaySession.questions}
          activity={activePlaySession.activity}
          students={students}
          onClose={() => {
            setActivePlaySession(null);
            fetchHubData();
            onRefreshClassStudents();
          }}
          onRefreshClassStudents={onRefreshClassStudents}
        />
      )}

      {/* MODAL 3: STANDALONE AWARD QUESTION MODAL */}
      {isAwardQModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              <span>{isRtl ? 'منح نقاط سؤال صفي مباشر' : 'Award Question Points'}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {isRtl ? 'القواعد الصارمة: سهل = 1، متوسط = 2، صعب = 3 نقاط' : 'Rules: easy=1, med=2, hard=3'}
            </p>
            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-slate-600 mb-1">{isRtl ? 'اختر الطالب:' : 'Student:'}</label>
                <select
                  value={selectedStudentForAward}
                  onChange={(e) => setSelectedStudentForAward(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.studentCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">{isRtl ? 'مستوى صعوبة السؤال:' : 'Difficulty:'}</label>
                <select
                  value={standaloneDifficulty}
                  onChange={(e) => setStandaloneDifficulty(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                >
                  <option value="easy">{isRtl ? 'سهل (+1 نقطة)' : 'Easy (+1 pt)'}</option>
                  <option value="medium">{isRtl ? 'متوسط (+2 نقطة)' : 'Medium (+2 pts)'}</option>
                  <option value="hard">{isRtl ? 'صعب (+3 نقاط)' : 'Hard (+3 pts)'}</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">{isRtl ? 'ملاحظة المعلم:' : 'Note:'}</label>
                <input
                  type="text"
                  value={standaloneReason}
                  onChange={(e) => setStandaloneReason(e.target.value)}
                  placeholder={isRtl ? 'مثال: إجابة متميزة على سؤال البناء الضوئي' : 'e.g. Great answer'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAwardQModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 text-xs"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleStandaloneAwardQuestion}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md"
              >
                {isRtl ? 'اعتماد ومنح النقاط' : 'Award Points'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: STANDALONE AWARD PUZZLE MODAL */}
      {isAwardPuzModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Puzzle className="w-5 h-5 text-amber-500" />
              <span>{isRtl ? 'منح نقاط لغز الذكاء الصفي' : 'Award Brain Puzzle Points'}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {isRtl ? 'القواعد الصارمة: سهل = 3، متوسط = 5، صعب = 10 نقاط' : 'Rules: easy=3, med=5, hard=10'}
            </p>
            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-slate-600 mb-1">{isRtl ? 'اختر الطالب:' : 'Student:'}</label>
                <select
                  value={selectedStudentForAward}
                  onChange={(e) => setSelectedStudentForAward(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.studentCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">{isRtl ? 'مستوى صعوبة اللغز:' : 'Difficulty:'}</label>
                <select
                  value={standaloneDifficulty}
                  onChange={(e) => setStandaloneDifficulty(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                >
                  <option value="easy">{isRtl ? 'سهل (+3 نقاط)' : 'Easy (+3 pts)'}</option>
                  <option value="medium">{isRtl ? 'متوسط (+5 نقاط)' : 'Medium (+5 pts)'}</option>
                  <option value="hard">{isRtl ? 'صعب (+10 نقاط)' : 'Hard (+10 pts)'}</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">{isRtl ? 'عنوان اللغز المنجز:' : 'Puzzle Title:'}</label>
                <input
                  type="text"
                  value={standaloneReason}
                  onChange={(e) => setStandaloneReason(e.target.value)}
                  placeholder={isRtl ? 'مثال: لغز العدد والعمليات الحسابية' : 'e.g. Math riddle'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAwardPuzModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 text-xs"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleStandaloneAwardPuzzle}
                className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md"
              >
                {isRtl ? 'اعتماد ومنح نقاط اللغز' : 'Award Puzzle Points'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
