/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Classroom, Student } from '../../types/index.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { apiRequest } from '../../api/client.ts';
import { StudentsRoster } from './StudentsRoster.tsx';
import { QuizzesManagement } from './QuizzesManagement.tsx';
import { HomeworkManagement } from './HomeworkManagement.tsx';
import { RewardsStoreManager } from './RewardsStoreManager.tsx';
import { LeaderboardView } from './LeaderboardView.tsx';
import { ClassroomTools } from './ClassroomTools.tsx';
import { SubscriptionManager } from './SubscriptionManager.tsx';
import { ReportsAndAudit } from './ReportsAndAudit.tsx';
import { GamesMain } from './Games/GamesMain.tsx';
import {
  Users,
  Award,
  BookOpen,
  ShoppingBag,
  Trophy,
  Gamepad2,
  Crown,
  FileSpreadsheet,
  X,
  Coins,
  Sparkles,
  Layers,
  Dices,
} from 'lucide-react';

interface TeacherMainProps {
  classrooms: Classroom[];
  selectedClassId: string;
  onRefreshClassrooms: () => void;
  isNewClassModalOpen: boolean;
  onCloseNewClassModal: () => void;
  isSubscriptionsTabOpen?: boolean;
}

export const TeacherMain: React.FC<TeacherMainProps> = ({
  classrooms,
  selectedClassId,
  onRefreshClassrooms,
  isNewClassModalOpen,
  onCloseNewClassModal,
  isSubscriptionsTabOpen = false,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<
    'students' | 'games' | 'tests' | 'homework' | 'rewards' | 'leaderboard' | 'tools' | 'subscriptions' | 'reports'
  >(isSubscriptionsTabOpen ? 'subscriptions' : 'students');

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // New Class Form State
  const [newClassName, setNewClassName] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState('الخامس الابتدائي');
  const [newSchoolYear, setNewSchoolYear] = useState('1446-1447 هـ');
  const [creatingClass, setCreatingClass] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeClass = classrooms.find((c) => c.id === selectedClassId) || classrooms[0] || null;

  const fetchClassStudents = async () => {
    if (!activeClass) return;
    setLoadingStudents(true);
    try {
      const data = await apiRequest<Student[]>(`/classes/${activeClass.id}/students`);
      setStudents(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (activeClass) {
      fetchClassStudents();
    }
  }, [activeClass?.id]);

  useEffect(() => {
    if (isSubscriptionsTabOpen) {
      setActiveTab('subscriptions');
    }
  }, [isSubscriptionsTabOpen]);

  const handleCreateClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setCreatingClass(true);
    setStatusBanner(null);
    try {
      await apiRequest('/classes', {
        method: 'POST',
        body: JSON.stringify({
          name: newClassName,
          gradeLevel: newGradeLevel,
          schoolYear: newSchoolYear,
        }),
      });
      setStatusBanner({
        type: 'success',
        text: language === 'ar' ? 'تم إنشاء الفصل الدراسي بنجاح.' : 'Classroom created successfully.',
      });
      setNewClassName('');
      onCloseNewClassModal();
      onRefreshClassrooms();
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err.message,
      });
    } finally {
      setCreatingClass(false);
    }
  };

  // Quick statistics
  const totalEarnedInClass = students.reduce((acc, s) => acc + s.historicalAchievement, 0);
  const totalAvailableInClass = students.reduce((acc, s) => acc + s.availableBalance, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
      {/* Overview Stats Bar */}
      {activeClass && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">{t('activeClassStudents')}</span>
              <span className="text-lg sm:text-xl font-black text-slate-900 block">
                {students.length} {t('hero')}
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">{t('totalAwardedPoints')}</span>
              <span className="text-lg sm:text-xl font-black text-emerald-600 block">
                {totalEarnedInClass}
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">{t('availableBalances')}</span>
              <span className="text-lg sm:text-xl font-black text-amber-600 block">
                {totalAvailableInClass}
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">{t('registeredClasses')}</span>
              <span className="text-lg sm:text-xl font-black text-slate-900 block">
                {classrooms.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Feature Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-2xs gap-1 overflow-x-auto">
        {[
          { id: 'students', label: t('tabStudents'), icon: Users },
          { id: 'games', label: t('tabGames'), icon: Dices },
          { id: 'tests', label: t('tabTests'), icon: Award },
          { id: 'homework', label: t('tabHomework'), icon: BookOpen },
          { id: 'rewards', label: t('tabRewards'), icon: ShoppingBag },
          { id: 'leaderboard', label: t('tabLeaderboard'), icon: Trophy },
          { id: 'tools', label: t('tabTools'), icon: Gamepad2 },
          { id: 'subscriptions', label: t('tabSubscriptions'), icon: Crown },
          { id: 'reports', label: t('tabReports'), icon: FileSpreadsheet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'students' && (
        <StudentsRoster
          classrooms={classrooms}
          activeClass={activeClass}
          students={students}
          onRefresh={fetchClassStudents}
        />
      )}

      {activeTab === 'games' && activeClass && (
        <GamesMain
          classroom={activeClass}
          students={students}
          onRefreshClassStudents={fetchClassStudents}
        />
      )}

      {activeTab === 'tests' && activeClass && (
        <QuizzesManagement
          classId={activeClass.id}
          students={students}
          onRefresh={fetchClassStudents}
        />
      )}

      {activeTab === 'homework' && activeClass && (
        <HomeworkManagement
          classId={activeClass.id}
          students={students}
          onRefresh={fetchClassStudents}
        />
      )}

      {activeTab === 'rewards' && (
        <RewardsStoreManager onRefresh={fetchClassStudents} />
      )}

      {activeTab === 'leaderboard' && activeClass && (
        <LeaderboardView classId={activeClass.id} />
      )}

      {activeTab === 'tools' && activeClass && (
        <ClassroomTools
          classId={activeClass.id}
          students={students}
          onRefresh={fetchClassStudents}
        />
      )}

      {activeTab === 'subscriptions' && (
        <SubscriptionManager onRefresh={onRefreshClassrooms} />
      )}

      {activeTab === 'reports' && <ReportsAndAudit />}

      {/* Create New Class Modal */}
      {isNewClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>{language === 'ar' ? 'إنشاء فصل دراسي جديد' : 'Create New Classroom'}</span>
              </h3>
              <button
                type="button"
                onClick={onCloseNewClassModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClassSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'اسم الفصل:' : 'Classroom Name:'}
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Grade 5A - Elementary"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'المرحلة الدراسية:' : 'Grade Level:'}
                </label>
                <input
                  type="text"
                  required
                  value={newGradeLevel}
                  onChange={(e) => setNewGradeLevel(e.target.value)}
                  placeholder="Elementary Grade 5"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'العام الدراسي:' : 'Academic Year:'}
                </label>
                <input
                  type="text"
                  value={newSchoolYear}
                  onChange={(e) => setNewSchoolYear(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onCloseNewClassModal}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creatingClass}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-2xs"
                >
                  {creatingClass ? t('loading') : t('newClassBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
