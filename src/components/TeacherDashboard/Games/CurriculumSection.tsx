/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * Saudi Curriculum & Textbooks Management Section
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

import React, { useState, useEffect } from 'react';
import {
  CurriculumSubject,
  CurriculumGrade,
  CurriculumLesson,
  CurriculumBook,
} from '../../../types/games.ts';
import { useLanguage } from '../../../context/LanguageContext.tsx';
import { apiRequest } from '../../../api/client.ts';
import {
  BookOpen,
  FileText,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Search,
  Plus,
  RefreshCw,
  FolderOpen,
  Layers,
  FileCheck,
} from 'lucide-react';

interface CurriculumSectionProps {
  subjects: CurriculumSubject[];
  grades: CurriculumGrade[];
  lessons: CurriculumLesson[];
  onRefreshData: () => void;
  onCreateQuestionFromLesson: (lesson: CurriculumLesson) => void;
}

export const CurriculumSection: React.FC<CurriculumSectionProps> = ({
  subjects,
  grades,
  lessons,
  onRefreshData,
  onCreateQuestionFromLesson,
}) => {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  const [books, setBooks] = useState<CurriculumBook[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);

  // Filters
  const [selectedStage, setSelectedStage] = useState<'all' | 'elementary' | 'middle' | 'high'>('elementary');
  const [selectedGradeId, setSelectedGradeId] = useState<string>('elem_5');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedTermId, setSelectedTermId] = useState<string>('term_1');
  const [searchQuery, setSearchQuery] = useState('');

  // Importer Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importFileSize, setImportFileSize] = useState<number>(0);
  const [importGradeId, setImportGradeId] = useState('elem_5');
  const [importSubjectId, setImportSubjectId] = useState('science');
  const [importTermId, setImportTermId] = useState('term_1');
  const [importEdition, setImportEdition] = useState('طبعة 1446-1447هـ المعتمدة');
  const [importUnitName, setImportUnitName] = useState('الوحدة الأولى: المخلوقات الحية');
  const [importLessonTitle, setImportLessonTitle] = useState('');
  const [importLessonText, setImportLessonText] = useState('');
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);

  const fetchBooks = async () => {
    setLoadingBooks(true);
    try {
      const data = await apiRequest<CurriculumBook[]>('/curriculum/books');
      setBooks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBooks(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Filtered grades by selected stage
  const stageGrades = grades.filter((g) => {
    if (selectedStage === 'all') return true;
    return g.stage === selectedStage;
  });

  // Filtered books
  const filteredBooks = books.filter((b) => {
    if (selectedStage !== 'all' && b.stage !== selectedStage) return false;
    if (selectedGradeId !== 'all' && b.gradeId !== selectedGradeId) return false;
    if (selectedSubjectId !== 'all' && b.subjectId !== selectedSubjectId) return false;
    if (selectedTermId !== 'all' && b.termId !== selectedTermId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return b.title.toLowerCase().includes(q) || b.subjectName.toLowerCase().includes(q);
    }
    return true;
  });

  // Filtered lessons
  const filteredLessons = lessons.filter((l) => {
    if (selectedGradeId !== 'all' && l.gradeId !== selectedGradeId) return false;
    if (selectedSubjectId !== 'all' && l.subjectId !== selectedSubjectId) return false;
    if (selectedTermId !== 'all' && l.termId !== selectedTermId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return l.lessonTitle.toLowerCase().includes(q) || l.unitName.toLowerCase().includes(q);
    }
    return true;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFileName(file.name);
      setImportFileSize(file.size);
      if (!importLessonTitle) {
        setImportLessonTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportErrorMsg(null);
    if (!importLessonTitle.trim()) {
      setImportErrorMsg(isRtl ? 'يرجى كتابة عنوان الدرس' : 'Please provide a lesson title');
      return;
    }

    setIsSubmittingImport(true);
    setImportSuccessMsg(null);

    try {
      await apiRequest('/curriculum/import-pdf', {
        method: 'POST',
        body: JSON.stringify({
          fileName: importFileName || 'منهج_تعليمي.pdf',
          fileSizeBytes: importFileSize || 12000000,
          gradeId: importGradeId,
          subjectId: importSubjectId,
          termId: importTermId,
          editionYear: importEdition,
          unitName: importUnitName,
          lessonTitle: importLessonTitle,
          lessonText: importLessonText || 'محتوى الدرس المستخرج من وثائق المنهج المعتمدة.',
        }),
      });

      setImportSuccessMsg(isRtl ? 'تم استيراد الدرس والتحقق من صحته بنجاح!' : 'Curriculum lesson imported successfully!');
      onRefreshData();
      fetchBooks();
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportSuccessMsg(null);
        setImportLessonTitle('');
        setImportLessonText('');
        setImportFileName('');
      }, 1200);
    } catch (err: any) {
      setImportErrorMsg(err.message || 'تعذر استيراد ملف المنهج');
    } finally {
      setIsSubmittingImport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Platform Transparency Box */}
      <div className="p-5 sm:p-6 rounded-3xl bg-linear-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white shadow-md border border-emerald-500/20 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black">
                {isRtl ? 'المناهج الدراسية السعودية المعتمدة — التحقق والربط النظامي' : 'Official Saudi Curricula Repository'}
              </h3>
              <p className="text-xs text-slate-300">
                {isRtl
                  ? 'بوابة عين الوطنية للتعليم، منصة منهجي، ومنصة كتبي المدرسية'
                  : 'Official educational sources: Ien National Portal, Manhaji & Kutobi'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-2 shrink-0"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isRtl ? 'استيراد كتاب أو درس (PDF)' : 'Import Book / Lesson (PDF)'}</span>
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs leading-relaxed text-slate-300">
          <p>
            {isRtl
              ? 'تنويه الأمان والامتثال: منصات المناهج الحكومية الرسمية (بوابة عين، منصة مدرستي، منهجي) تتطلب مصادقة وطنية موحدة (نفاذ)، ولا توفر اتصالًا مباشرًا مفتوحًا بدون حسابات وزارة التعليم. لذلك يوفر التطبيق مكتبة رقمية محققة للمناهج السعودية الابتدائية والمتوسطة والثانوية، مع أداة استيراد الكتب والملفات بصيغة PDF وتحديث الطبعات تلقائيًا.'
              : 'Official Notice: Saudi Ministry educational platforms require National Single Sign-On (Nafath) and do not offer unrestricted public APIs. Class Heroes provides verified Saudi curriculum taxonomies with a full PDF & lesson importer for new textbook editions.'}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Stage Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-400 shrink-0">{isRtl ? 'المرحلة:' : 'Stage:'}</span>
          {[
            { id: 'all', label: isRtl ? 'جميع المراحل' : 'All Stages' },
            { id: 'elementary', label: isRtl ? 'المرحلة الابتدائية (1-6)' : 'Elementary (1-6)' },
            { id: 'middle', label: isRtl ? 'المرحلة المتوسطة (1-3)' : 'Middle School (1-3)' },
            { id: 'high', label: isRtl ? 'المرحلة الثانوية والمسارات' : 'Secondary & Tracks' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => {
                setSelectedStage(st.id as any);
                if (st.id === 'elementary') setSelectedGradeId('elem_5');
                else if (st.id === 'middle') setSelectedGradeId('mid_1');
                else if (st.id === 'high') setSelectedGradeId('high_1');
                else setSelectedGradeId('all');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedStage === st.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Grade, Subject, Term Dropdowns & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-500 font-bold mb-1">{isRtl ? 'الصف الدراسي:' : 'Grade:'}</label>
            <select
              value={selectedGradeId}
              onChange={(e) => setSelectedGradeId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{isRtl ? 'جميع الصفوف' : 'All Grades'}</option>
              {stageGrades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">{isRtl ? 'المادة الدراسية:' : 'Subject:'}</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{isRtl ? 'جميع المواد' : 'All Subjects'}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">{isRtl ? 'الفصل الدراسي:' : 'Term:'}</label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{isRtl ? 'جميع الفصول' : 'All Terms'}</option>
              <option value="term_1">{isRtl ? 'الفصل الدراسي الأول' : 'Term 1'}</option>
              <option value="term_2">{isRtl ? 'الفصل الدراسي الثاني' : 'Term 2'}</option>
              <option value="term_3">{isRtl ? 'الفصل الدراسي الثالث' : 'Term 3'}</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">{isRtl ? 'بحث في الدروس والكتب:' : 'Search:'}</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute top-2.5 right-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'اسم الدرس أو الكتاب...' : 'Lesson or book name...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Official Books Library */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>{isRtl ? `الكتب والمقررات المعتمدة (${filteredBooks.length})` : `Approved Textbooks (${filteredBooks.length})`}</span>
          </h4>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
            {isRtl ? 'طبعات 1446-1447هـ' : '1446-1447 AH Editions'}
          </span>
        </div>

        {loadingBooks ? (
          <div className="text-center py-8 text-xs text-slate-400">{isRtl ? 'جارٍ تحميل الكتب...' : 'Loading books...'}</div>
        ) : filteredBooks.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400">
            {isRtl ? 'لا توجد كتب مطابقة لخيارات الفلترة الحالية.' : 'No textbooks matching the filter.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredBooks.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-all space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 text-indigo-700">
                      {b.gradeName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 flex items-center gap-1">
                      <FileCheck className="w-3 h-3" />
                      <span>{isRtl ? 'معتمد' : 'Verified'}</span>
                    </span>
                  </div>

                  <h5 className="text-xs font-black text-slate-900 leading-snug">{b.title}</h5>
                  <p className="text-[11px] text-slate-500 font-medium">{b.editionYear}</p>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                    <span>{b.unitsCount} {isRtl ? 'وحدات' : 'Units'}</span>
                    <span>•</span>
                    <span>{b.lessonsCount} {isRtl ? 'درسًا' : 'Lessons'}</span>
                    <span>•</span>
                    <span className="truncate">{b.sourcePlatformName}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-bold">
                    {Math.round((b.fileSizeBytes || 10000000) / (1024 * 1024))} MB
                  </span>
                  <a
                    href={b.pdfUrl || 'https://ien.edu.sa'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 font-black flex items-center gap-1 text-[11px]"
                  >
                    <span>{isRtl ? 'عرض المصدر' : 'Source'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Lessons List with Question Generation */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>{isRtl ? `دروس المنهج ومحتواها النصي (${filteredLessons.length})` : `Lessons & Text Content (${filteredLessons.length})`}</span>
          </h4>
          <span className="text-xs font-bold text-slate-400">
            {isRtl ? 'اضغط «إنشاء أسئلة» لتوليد واشتقاق أسئلة مباشرة من محتوى الدرس' : 'Click "Create Questions" to generate questions from lesson'}
          </span>
        </div>

        {filteredLessons.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {isRtl ? 'لا توجد دروس مسجلة لهذا الاختيار. يمكنك استيراد درس جديد عبر زر الاستيراد أعلاه.' : 'No lessons found. You can import new lessons using the button above.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLessons.map((les) => (
              <div key={les.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">{les.lessonTitle}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                      {les.unitName}
                    </span>
                  </div>
                  {les.rawContent && (
                    <p className="text-[11px] text-slate-600 font-medium line-clamp-2 max-w-2xl bg-slate-50 p-2 rounded-xl border border-slate-100">
                      {les.rawContent}
                    </p>
                  )}
                  {les.sourceReference && (
                    <span className="text-[10px] text-slate-400 font-bold block">
                      {isRtl ? `المرجع المعتمد: ${les.sourceReference}` : `Reference: ${les.sourceReference}`}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onCreateQuestionFromLesson(les)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-2xs transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'إنشاء أسئلة من هذا الدرس' : 'Create Questions from Lesson'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDF & Curriculum Importer Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-600 font-black">
                <UploadCloud className="w-5 h-5" />
                <h3 className="text-base font-black text-slate-900">
                  {isRtl ? 'استيراد كتاب أو درس تعليمي من المنهج (PDF)' : 'Import Textbook / Lesson (PDF)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {importSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-black flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{importSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleImportSubmit} className="space-y-4 text-xs font-bold">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">{isRtl ? 'المرحلة والصف:' : 'Grade:'}</label>
                    <select
                      value={importGradeId}
                      onChange={(e) => setImportGradeId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    >
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">{isRtl ? 'المادة الدراسية:' : 'Subject:'}</label>
                    <select
                      value={importSubjectId}
                      onChange={(e) => setImportSubjectId(e.target.value)}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">{isRtl ? 'الفصل الدراسي:' : 'Term:'}</label>
                    <select
                      value={importTermId}
                      onChange={(e) => setImportTermId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    >
                      <option value="term_1">{isRtl ? 'الفصل الدراسي الأول' : 'Term 1'}</option>
                      <option value="term_2">{isRtl ? 'الفصل الدراسي الثاني' : 'Term 2'}</option>
                      <option value="term_3">{isRtl ? 'الفصل الدراسي الثالث' : 'Term 3'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">{isRtl ? 'طبعة المنهج:' : 'Edition:'}</label>
                    <input
                      type="text"
                      value={importEdition}
                      onChange={(e) => setImportEdition(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">{isRtl ? 'اسم الوحدة التعليمية:' : 'Unit Name:'}</label>
                  <input
                    type="text"
                    value={importUnitName}
                    onChange={(e) => setImportUnitName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">{isRtl ? 'عنوان الدرس:' : 'Lesson Title:'}</label>
                  <input
                    type="text"
                    value={importLessonTitle}
                    onChange={(e) => setImportLessonTitle(e.target.value)}
                    placeholder={isRtl ? 'مثال: دورة حياة النباتات الزهرية' : 'e.g. Plant Life Cycle'}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>

                {/* File Upload Trigger */}
                <div>
                  <label className="block text-slate-600 mb-1">{isRtl ? 'ملف الكتاب أو المستند (PDF):' : 'PDF Document:'}</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {importFileName && (
                    <span className="text-[11px] text-emerald-600 font-bold block mt-1">
                      ✓ {importFileName} ({Math.round(importFileSize / 1024)} KB)
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">
                    {isRtl ? 'نص الدرس أو الملخص التعليمي المستخرج:' : 'Lesson Text Extract:'}
                  </label>
                  <textarea
                    rows={4}
                    value={importLessonText}
                    onChange={(e) => setImportLessonText(e.target.value)}
                    placeholder={isRtl ? 'الصق نص الدرس أو النقاط الجوهرية من الكتاب ليتم بناء الأسئلة عليها بدقة...' : 'Paste text here...'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingImport}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{isSubmittingImport ? (isRtl ? 'جارٍ الاستيراد...' : 'Importing...') : (isRtl ? 'حفظ وتأكيد الاستيراد' : 'Confirm Import')}</span>
                  </button>
                </div>
                {importErrorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                    {importErrorMsg}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
