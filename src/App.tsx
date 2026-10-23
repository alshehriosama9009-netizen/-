/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LanguageProvider, useLanguage } from './context/LanguageContext.tsx';
import { AuthScreen } from './components/AuthScreen.tsx';
import { Navbar } from './components/Navbar.tsx';
import { TeacherMain } from './components/TeacherDashboard/TeacherMain.tsx';
import { StudentDashboard } from './components/StudentPortal/StudentDashboard.tsx';
import { PublishingModal } from './components/PublishingModal.tsx';
import { Classroom } from './types/index.ts';
import { apiRequest } from './api/client.ts';
import { OfflineIndicator } from './components/PWA/OfflineIndicator.tsx';

function AppContent() {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isNewClassModalOpen, setIsNewClassModalOpen] = useState(false);
  const [isPublishingModalOpen, setIsPublishingModalOpen] = useState(false);
  const [isSubscriptionsTabOpen, setIsSubscriptionsTabOpen] = useState(false);

  const fetchClasses = async () => {
    if (!user) return;
    try {
      const data = await apiRequest<Classroom[]>('/classes');
      setClassrooms(data);
      if (data.length > 0 && !selectedClassId) {
        setSelectedClassId(data[0].id);
      }
    } catch (err: any) {
      console.warn('Could not fetch classes:', err.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchClasses();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 animate-spin flex items-center justify-center font-black">
          ⭐
        </div>
        <p className="text-xs text-indigo-200 font-bold">
          جارٍ تشغيل منصة أبطال الفصل...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Navbar */}
      <Navbar
        classrooms={classrooms}
        selectedClassId={selectedClassId}
        onSelectClass={setSelectedClassId}
        onOpenNewClassModal={() => setIsNewClassModalOpen(true)}
        onOpenPublishingModal={() => setIsPublishingModalOpen(true)}
        onOpenSubscriptions={() => setIsSubscriptionsTabOpen(true)}
      />

      {/* Main View based on role */}
      <main className="flex-1 pb-16">
        {user.role === 'teacher' ? (
          <TeacherMain
            classrooms={classrooms}
            selectedClassId={selectedClassId}
            onRefreshClassrooms={fetchClasses}
            isNewClassModalOpen={isNewClassModalOpen}
            onCloseNewClassModal={() => setIsNewClassModalOpen(false)}
            isSubscriptionsTabOpen={isSubscriptionsTabOpen}
          />
        ) : (
          <StudentDashboard />
        )}
      </main>

      {/* Footer Credentials */}
      <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-bold text-slate-700">
            {t('appNameAr')} — <strong>{t('appNameEn')}</strong>
          </span>
          <span className="text-[11px] font-bold text-slate-500">
            {t('rightsReserved')}
          </span>
        </div>
      </footer>

      {/* Store Publishing Readiness Modal */}
      <PublishingModal
        isOpen={isPublishingModalOpen}
        onClose={() => setIsPublishingModalOpen(false)}
      />

      {/* Floating Offline Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
