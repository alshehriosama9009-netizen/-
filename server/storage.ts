/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * Persistent Storage & Database Engine
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

import fs from 'fs';
import path from 'path';
import {
  PointSource,
  SubscriptionTier,
  SUBSCRIPTION_PLANS,
  calculateTestPoints,
  calculateHomeworkPoints,
  canAwardBehaviorPoints,
  calculateGamePoints,
  calculateQuestionPoints,
  calculatePuzzlePoints,
  computeLedger,
  HomeworkQuality,
} from '../src/utils/rules.ts';
import {
  CurriculumSubject,
  CurriculumGrade,
  CurriculumLesson,
  Question,
  CurriculumBook,
  GameActivity,
  GameSession,
} from '../src/types/games.ts';
import {
  DEFAULT_SUBJECTS,
  DEFAULT_GRADES,
  DEFAULT_BOOKS,
  DEFAULT_LESSONS,
  DEFAULT_QUESTIONS,
  DEFAULT_READY_ACTIVITIES,
} from './curriculum_seed.ts';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'teacher' | 'student';
  passwordHash: string; // for prototype: salted or direct hash check
  token: string;
  createdAt: string;
  teacherProfile?: {
    schoolName: string;
    subscriptionTier: SubscriptionTier;
    subscriptionExpiresAt?: string;
    isAutoRenewing?: boolean;
    purchaseHistory?: Array<{
      id: string;
      platform: 'apple_app_store' | 'google_play' | 'web';
      productId: string;
      tier: SubscriptionTier;
      amountSar: number;
      date: string;
      status: 'verified' | 'refunded' | 'expired';
      receiptOrToken: string;
    }>;
  };
  studentProfile?: {
    classId: string;
    studentCode: string;
    pinCode: string;
    gradeLevel: string;
  };
}

export interface Classroom {
  id: string;
  teacherId: string;
  name: string;
  gradeLevel: string;
  schoolYear: string;
  leaderboardVisible: boolean;
  showStudentNames: boolean;
  archived: boolean;
  createdAt: string;
}

export interface Student {
  id: string;
  teacherId: string;
  classId: string;
  studentCode: string;
  pinCode: string;
  name: string;
  availableBalance: number;
  totalEarned: number;
  totalSpent: number;
  historicalAchievement: number;
  badges: string[];
  activeTitle?: string;
  archived: boolean;
  createdAt: string;
}

export interface PointTransaction {
  id: string;
  teacherId: string;
  classId: string;
  studentId: string;
  studentName: string;
  source: PointSource;
  subType?: string;
  points: number;
  reason: string;
  performedBy: string;
  performedByName: string;
  date: string; // ISO string
  dayDate: string; // YYYY-MM-DD
  isAdjustment?: boolean;
  correctionOfId?: string;
  correctionReason?: string;
}

export interface RewardItem {
  id: string;
  teacherId: string;
  classId?: string;
  title: string;
  costPoints: number;
  description: string;
  icon: string;
  stock: number | null; // null = unlimited
  isActive: boolean;
}

export interface RewardRequest {
  id: string;
  teacherId: string;
  classId: string;
  studentId: string;
  studentName: string;
  rewardId: string;
  rewardTitle: string;
  costPoints: number;
  status: 'pending' | 'approved' | 'rejected' | 'delivered';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestRecord {
  id: string;
  teacherId: string;
  classId: string;
  title: string;
  date: string;
  maxScore: number; // default 20
  grades: Array<{
    studentId: string;
    studentName: string;
    scoreOutOf20: number;
    pointsAwarded: number;
    transactionId: string;
  }>;
}

export interface HomeworkRecord {
  id: string;
  teacherId: string;
  classId: string;
  title: string;
  dueDate: string;
  submissions: Array<{
    studentId: string;
    studentName: string;
    quality: HomeworkQuality;
    submittedOnTime: boolean;
    pointsAwarded: number;
    transactionId: string;
  }>;
}

export interface AuditLog {
  id: string;
  teacherId: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface DatabaseSchema {
  users: User[];
  classrooms: Classroom[];
  students: Student[];
  transactions: PointTransaction[];
  rewards: RewardItem[];
  rewardRequests: RewardRequest[];
  tests: TestRecord[];
  homeworks: HomeworkRecord[];
  auditLogs: AuditLog[];
  subjects: CurriculumSubject[];
  grades: CurriculumGrade[];
  books: CurriculumBook[];
  lessons: CurriculumLesson[];
  questions: Question[];
  activities: GameActivity[];
  gameSessions: GameSession[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'class_heroes_db.json');

// Initial seed data
function getInitialSeedData(): DatabaseSchema {
  const teacherId = 'teacher_osama_1';
  const classId1 = 'class_5a';
  const classId2 = 'class_6b';

  const defaultRewards: RewardItem[] = [
    { id: 'rew_1', teacherId, title: 'اختيار اللغز القادم', costPoints: 30, description: 'يحق للطالب اختيار اللغز الصفي لليوم التالي', icon: 'Sparkles', stock: null, isActive: true },
    { id: 'rew_2', teacherId, title: 'اختيار لعبة صفية', costPoints: 50, description: 'اختيار لعبة تفاعلية يلعبها الفصل بالكامل', icon: 'Gamepad2', stock: null, isActive: true },
    { id: 'rew_3', teacherId, title: 'لقب خاص في لوحة المتصدرين', costPoints: 75, description: 'منح لقب شرفي مخصص يظهر بجانب اسم البطل', icon: 'Crown', stock: null, isActive: true },
    { id: 'rew_4', teacherId, title: 'اختيار المقعد ليوم واحد', costPoints: 100, description: 'حرية اختيار مكان الجلوس المفضل ليوم كامل', icon: 'Armchair', stock: 5, isActive: true },
    { id: 'rew_5', teacherId, title: 'قلم مميز', costPoints: 150, description: 'قلم فاخر هدية للمتميزين في الفصل', icon: 'PenTool', stock: 12, isActive: true },
    { id: 'rew_6', teacherId, title: 'دفتر مع أقلام', costPoints: 250, description: 'دفتر بتصميم مميز مع مجموعة أقلام تلوين', icon: 'BookOpen', stock: 8, isActive: true },
    { id: 'rew_7', teacherId, title: 'صندوق المفاجآت', costPoints: 400, description: 'صندوق هدايا سرية يحتوي على مفاجآت تحفيزية', icon: 'Gift', stock: 4, isActive: true },
    { id: 'rew_8', teacherId, title: 'بطل الشهر', costPoints: 600, description: 'تكريم رسمي كبطل الفصل للشهر وشهادة تقدير', icon: 'Award', stock: 2, isActive: true },
    { id: 'rew_9', teacherId, title: 'الجائزة الكبرى', costPoints: 1000, description: 'كأس الفصل المذهب وجائزة كبرى قيمة', icon: 'Trophy', stock: 1, isActive: true },
  ];

  const studentsList: Student[] = [
    { id: 'stu_101', teacherId, classId: classId1, studentCode: 'S101', pinCode: '1111', name: 'خالد العتيبي', availableBalance: 145, totalEarned: 185, totalSpent: 40, historicalAchievement: 185, badges: ['بطل المشاركة', 'المثالي'], activeTitle: 'البطل الذهبي', archived: false, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: 'stu_102', teacherId, classId: classId1, studentCode: 'S102', pinCode: '2222', name: 'فهد الشمري', availableBalance: 120, totalEarned: 150, totalSpent: 30, historicalAchievement: 150, badges: ['عبقري الألغاز'], activeTitle: 'نجم التحدي', archived: false, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: 'stu_103', teacherId, classId: classId1, studentCode: 'S103', pinCode: '3333', name: 'عبدالله القحطاني', availableBalance: 95, totalEarned: 95, totalSpent: 0, historicalAchievement: 95, badges: ['منضبط الفصل'], activeTitle: undefined, archived: false, createdAt: new Date(Date.now() - 28 * 86400000).toISOString() },
    { id: 'stu_104', teacherId, classId: classId1, studentCode: 'S104', pinCode: '4444', name: 'عمر الغامدي', availableBalance: 80, totalEarned: 80, totalSpent: 0, historicalAchievement: 80, badges: ['صديق البيئة'], activeTitle: undefined, archived: false, createdAt: new Date(Date.now() - 25 * 86400000).toISOString() },
    { id: 'stu_105', teacherId, classId: classId1, studentCode: 'S105', pinCode: '5555', name: 'سلمان الدوسري', availableBalance: 110, totalEarned: 110, totalSpent: 0, historicalAchievement: 110, badges: ['فارس الأسئلة'], activeTitle: undefined, archived: false, createdAt: new Date(Date.now() - 25 * 86400000).toISOString() },
    { id: 'stu_106', teacherId, classId: classId1, studentCode: 'S106', pinCode: '6666', name: 'سعود الحربي', availableBalance: 65, totalEarned: 65, totalSpent: 0, historicalAchievement: 65, badges: [], activeTitle: undefined, archived: false, createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: 'stu_107', teacherId, classId: classId1, studentCode: 'S107', pinCode: '7777', name: 'عبدالعزيز الشهري', availableBalance: 130, totalEarned: 160, totalSpent: 30, historicalAchievement: 160, badges: ['أول الألعاب'], activeTitle: 'نجم الصف', archived: false, createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: 'stu_108', teacherId, classId: classId1, studentCode: 'S108', pinCode: '8888', name: 'محمد المطيري', availableBalance: 75, totalEarned: 75, totalSpent: 0, historicalAchievement: 75, badges: ['المتعاون'], activeTitle: undefined, archived: false, createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
  ];

  const nowIso = new Date().toISOString();
  const todayDate = nowIso.slice(0, 10);

  const initialTransactions: PointTransaction[] = [
    {
      id: 'tx_seed_1',
      teacherId,
      classId: classId1,
      studentId: 'stu_101',
      studentName: 'خالد العتيبي',
      source: 'behavior',
      subType: 'quiet_etiquette',
      points: 1,
      reason: 'الالتزام بالهدوء وآداب الفصل',
      performedBy: teacherId,
      performedByName: 'المعلم أسامة الشهري',
      date: new Date(Date.now() - 3600000 * 2).toISOString(),
      dayDate: todayDate,
    },
    {
      id: 'tx_seed_2',
      teacherId,
      classId: classId1,
      studentId: 'stu_101',
      studentName: 'خالد العتيبي',
      source: 'participation',
      subType: 'distinguished',
      points: 2,
      reason: 'مشاركة صحيحة ومتميزة في شرح المسألة',
      performedBy: teacherId,
      performedByName: 'المعلم أسامة الشهري',
      date: new Date(Date.now() - 3600000).toISOString(),
      dayDate: todayDate,
    },
    {
      id: 'tx_seed_3',
      teacherId,
      classId: classId1,
      studentId: 'stu_102',
      studentName: 'فهد الشمري',
      source: 'puzzles',
      subType: 'medium',
      points: 5,
      reason: 'حل لغز الذكاء الصفي بنجاح',
      performedBy: teacherId,
      performedByName: 'المعلم أسامة الشهري',
      date: new Date(Date.now() - 1800000).toISOString(),
      dayDate: todayDate,
    },
  ];

  const initialRewardRequests: RewardRequest[] = [
    {
      id: 'req_seed_1',
      teacherId,
      classId: classId1,
      studentId: 'stu_101',
      studentName: 'خالد العتيبي',
      rewardId: 'rew_1',
      rewardTitle: 'اختيار اللغز القادم',
      costPoints: 30,
      status: 'pending',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ];

  return {
    users: [
      {
        id: teacherId,
        email: 'alshehriosama9009@gmail.com',
        name: 'المعلم أسامة الشهري',
        role: 'teacher',
        passwordHash: 'password123',
        token: 'token_teacher_osama_valid',
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        teacherProfile: {
          schoolName: 'مدرسة رواد المستقبل الابتدائية والمتوسطة',
          subscriptionTier: 'plus', // Plus tier by default for rich features
          subscriptionExpiresAt: new Date(Date.now() + 180 * 86400000).toISOString(),
          isAutoRenewing: true,
          purchaseHistory: [
            {
              id: 'pur_seed_1',
              platform: 'apple_app_store',
              productId: 'sa.classheroes.sub.plus.annual',
              tier: 'plus',
              amountSar: 99,
              date: new Date(Date.now() - 30 * 86400000).toISOString(),
              status: 'verified',
              receiptOrToken: 'apple_receipt_verified_99sar',
            },
          ],
        },
      },
      ...studentsList.map((st) => ({
        id: st.id,
        email: `${st.studentCode.toLowerCase()}@heroes.local`,
        name: st.name,
        role: 'student' as const,
        passwordHash: st.pinCode,
        token: `token_student_${st.id}`,
        createdAt: st.createdAt,
        studentProfile: {
          classId: st.classId,
          studentCode: st.studentCode,
          pinCode: st.pinCode,
          gradeLevel: 'الصف الخامس',
        },
      })),
    ],
    classrooms: [
      {
        id: classId1,
        teacherId,
        name: 'أبطال الصف الخامس (أ)',
        gradeLevel: 'الخامس الابتدائي',
        schoolYear: '1446-1447 هـ',
        leaderboardVisible: true,
        showStudentNames: true,
        archived: false,
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        id: classId2,
        teacherId,
        name: 'فرسان الصف السادس (ب)',
        gradeLevel: 'السادس الابتدائي',
        schoolYear: '1446-1447 هـ',
        leaderboardVisible: true,
        showStudentNames: true,
        archived: false,
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
    ],
    students: studentsList,
    transactions: initialTransactions,
    rewards: defaultRewards,
    rewardRequests: initialRewardRequests,
    tests: [
      {
        id: 'test_1',
        teacherId,
        classId: classId1,
        title: 'اختبار الرياضيات الفصلي الأول',
        date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
        maxScore: 20,
        grades: [
          { studentId: 'stu_101', studentName: 'خالد العتيبي', scoreOutOf20: 19.5, pointsAwarded: 10, transactionId: 'tx_t1_1' },
          { studentId: 'stu_102', studentName: 'فهد الشمري', scoreOutOf20: 18, pointsAwarded: 7, transactionId: 'tx_t1_2' },
          { studentId: 'stu_103', studentName: 'عبدالله القحطاني', scoreOutOf20: 16, pointsAwarded: 5, transactionId: 'tx_t1_3' },
          { studentId: 'stu_104', studentName: 'عمر الغامدي', scoreOutOf20: 14, pointsAwarded: 3, transactionId: 'tx_t1_4' },
          { studentId: 'stu_105', studentName: 'سلمان الدوسري', scoreOutOf20: 9, pointsAwarded: 1, transactionId: 'tx_t1_5' },
        ],
      },
    ],
    homeworks: [
      {
        id: 'hw_1',
        teacherId,
        classId: classId1,
        title: 'واجب العلوم: دورة حياة النبات',
        dueDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
        submissions: [
          { studentId: 'stu_101', studentName: 'خالد العتيبي', quality: 'complete_correct', submittedOnTime: true, pointsAwarded: 5, transactionId: 'tx_hw_1' },
          { studentId: 'stu_102', studentName: 'فهد الشمري', quality: 'minor_errors', submittedOnTime: true, pointsAwarded: 4, transactionId: 'tx_hw_2' },
          { studentId: 'stu_103', studentName: 'عبدالله القحطاني', quality: 'many_errors', submittedOnTime: false, pointsAwarded: 1, transactionId: 'tx_hw_3' },
        ],
      },
    ],
    auditLogs: [
      {
        id: 'log_1',
        teacherId,
        action: 'تهيئة النظام',
        details: 'تم بدء عام دراسي جديد وتفعيل باقة المعلم بلس',
        timestamp: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
    ],
    subjects: DEFAULT_SUBJECTS,
    grades: DEFAULT_GRADES,
    books: DEFAULT_BOOKS,
    lessons: DEFAULT_LESSONS,
    questions: DEFAULT_QUESTIONS,
    activities: DEFAULT_READY_ACTIVITIES,
    gameSessions: [],
  };
}

class StorageEngine {
  private db: DatabaseSchema;

  constructor() {
    this.ensureDirectoryExists();
    this.db = this.loadDatabase();
  }

  private ensureDirectoryExists() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure new arrays are present if reading an earlier database file
        if (!parsed.subjects || parsed.subjects.length === 0) parsed.subjects = DEFAULT_SUBJECTS;
        if (!parsed.grades || parsed.grades.length < DEFAULT_GRADES.length) parsed.grades = DEFAULT_GRADES;
        if (!parsed.books || parsed.books.length === 0) parsed.books = DEFAULT_BOOKS;
        if (!parsed.lessons || parsed.lessons.length === 0) parsed.lessons = DEFAULT_LESSONS;
        if (!parsed.questions || parsed.questions.length === 0) parsed.questions = DEFAULT_QUESTIONS;
        if (!parsed.activities || parsed.activities.length === 0) parsed.activities = DEFAULT_READY_ACTIVITIES;
        if (!parsed.gameSessions) parsed.gameSessions = [];
        if (Array.isArray(parsed.rewards)) {
          parsed.rewards.forEach((r: RewardItem) => {
            if (r.id === 'rew_5' && r.description.includes('أسامة الشهري')) {
              r.description = 'قلم فاخر هدية للمتميزين في الفصل';
            }
          });
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading DB file, will reseed:', e);
    }
    const seed = getInitialSeedData();
    this.saveDatabase(seed);
    return seed;
  }

  private saveDatabase(data: DatabaseSchema) {
    try {
      this.ensureDirectoryExists();
      const tmp = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmp, DB_FILE);
    } catch (e) {
      console.error('Error writing DB file:', e);
    }
  }

  public getDb(): DatabaseSchema {
    return this.db;
  }

  public persist() {
    this.saveDatabase(this.db);
  }

  // Find User by Token
  public findUserByToken(token: string): User | undefined {
    return this.db.users.find((u) => u.token === token);
  }

  // Find Teacher
  public findTeacher(teacherId: string): User | undefined {
    return this.db.users.find((u) => u.id === teacherId && u.role === 'teacher');
  }

  // Find Student
  public findStudent(studentId: string): Student | undefined {
    return this.db.students.find((s) => s.id === studentId);
  }

  // Recalculate Student Ledger
  public refreshStudentLedger(studentId: string): Student | undefined {
    const student = this.findStudent(studentId);
    if (!student) return undefined;

    const studentTx = this.db.transactions.filter((tx) => tx.studentId === studentId);
    let totalEarned = 0;
    let totalSpent = 0;

    for (const tx of studentTx) {
      if (tx.points > 0) {
        totalEarned += tx.points;
      } else {
        totalSpent += Math.abs(tx.points);
      }
    }

    // Also include approved reward requests if any direct spend deduction was recorded
    const spentFromApprovedRewards = this.db.rewardRequests
      .filter((r) => r.studentId === studentId && (r.status === 'approved' || r.status === 'delivered'))
      .reduce((sum, r) => sum + r.costPoints, 0);

    const actualSpent = Math.max(totalSpent, spentFromApprovedRewards);
    student.totalEarned = totalEarned;
    student.totalSpent = actualSpent;
    student.availableBalance = Math.max(0, totalEarned - actualSpent);
    student.historicalAchievement = totalEarned; // Achievement never drops

    this.persist();
    return student;
  }

  // Add audit log
  public logAudit(teacherId: string, action: string, details: string) {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      teacherId,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    this.db.auditLogs.unshift(log);
    if (this.db.auditLogs.length > 500) {
      this.db.auditLogs.pop();
    }
    this.persist();
  }

  // --- Curriculum & Question Bank Helpers ---
  public findQuestion(id: string): Question | undefined {
    return this.db.questions.find((q) => q.id === id);
  }

  public findActivity(id: string): GameActivity | undefined {
    return this.db.activities.find((a) => a.id === id);
  }

  public findGameSession(id: string): GameSession | undefined {
    return this.db.gameSessions.find((s) => s.id === id);
  }

  public awardPointTransaction(params: {
    teacherId: string;
    classId: string;
    studentId: string;
    studentName: string;
    source: PointSource;
    subType?: string;
    points: number;
    reason: string;
    performedBy: string;
    performedByName: string;
  }): PointTransaction {
    const student = this.findStudent(params.studentId);
    if (!student) throw new Error('الطالب غير موجود');

    const now = new Date();
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tx: PointTransaction = {
      id: txId,
      teacherId: params.teacherId,
      classId: params.classId,
      studentId: params.studentId,
      studentName: params.studentName,
      source: params.source,
      subType: params.subType,
      points: params.points,
      reason: params.reason,
      performedBy: params.performedBy,
      performedByName: params.performedByName,
      date: now.toISOString(),
      dayDate: now.toISOString().slice(0, 10),
    };

    this.db.transactions.push(tx);
    this.refreshStudentLedger(params.studentId);
    this.persist();
    return tx;
  }

  // Award game points idempotently (1st place=5, 2nd=3, 3rd=2 under source: 'games')
  public awardGameSessionPoints(
    sessionId: string,
    teacherId: string,
    teacherName: string,
    winners: Array<{ studentId: string; rank: 1 | 2 | 3; points: number }>
  ): { success: boolean; message: string; awardedCount: number } {
    const session = this.findGameSession(sessionId);
    if (!session) {
      return { success: false, message: 'جلسة اللعبة غير موجودة', awardedCount: 0 };
    }
    if (session.pointsAwarded) {
      return { success: false, message: 'تم منح نقاط هذه اللعبة مسبقًا ويمنع التكرار', awardedCount: 0 };
    }

    const todayDate = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    let count = 0;

    for (const w of winners) {
      const student = this.findStudent(w.studentId);
      if (!student) continue;

      const points = calculateGamePoints(w.rank);
      const rankTitleAr = w.rank === 1 ? 'المركز الأول' : w.rank === 2 ? 'المركز الثاني' : 'المركز الثالث';

      const tx: PointTransaction = {
        id: `tx_game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        teacherId,
        classId: session.classId,
        studentId: student.id,
        studentName: student.name,
        source: 'games',
        subType: `rank_${w.rank}`,
        points,
        reason: `الفوز بـ ${rankTitleAr} في لعبة «${session.title}»`,
        performedBy: teacherId,
        performedByName: teacherName,
        date: nowIso,
        dayDate: todayDate,
      };

      this.db.transactions.unshift(tx);
      this.refreshStudentLedger(student.id);

      // Record transactionId on participant record if exists
      const p = session.participants.find((part) => part.studentId === student.id);
      if (p) {
        p.awardedPoints = points;
        p.transactionId = tx.id;
        p.rank = w.rank;
      }
      count++;
    }

    session.pointsAwarded = true;
    session.awardedAt = nowIso;
    session.status = 'completed';
    session.completedAt = nowIso;

    this.logAudit(
      teacherId,
      'اعتماد نقاط اللعبة',
      `تم اعتماد وتوزيع نقاط لعبة «${session.title}» لعدد ${count} من الطلاب الفائزين`
    );

    this.persist();
    return { success: true, message: 'تم اعتماد وتوزيع نقاط اللعبة بنجاح', awardedCount: count };
  }

  // Award standalone question points (easy=1, med=2, hard=3 under source: 'questions')
  public awardQuestionPoints(
    studentId: string,
    questionId: string,
    teacherId: string,
    teacherName: string,
    questionTitle: string,
    points: number
  ): PointTransaction {
    const student = this.findStudent(studentId);
    if (!student) throw new Error('الطالب غير موجود');

    const todayDate = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    const tx: PointTransaction = {
      id: `tx_q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      teacherId,
      classId: student.classId,
      studentId: student.id,
      studentName: student.name,
      source: 'questions',
      points,
      reason: `إجابة صحيحة لسؤال «${questionTitle}»`,
      performedBy: teacherId,
      performedByName: teacherName,
      date: nowIso,
      dayDate: todayDate,
    };

    this.db.transactions.unshift(tx);
    this.refreshStudentLedger(student.id);
    this.persist();
    return tx;
  }

  // Award standalone puzzle points (easy=3, med=5, hard=10 under source: 'puzzles')
  public awardPuzzlePoints(
    studentId: string,
    puzzleId: string,
    teacherId: string,
    teacherName: string,
    puzzleTitle: string,
    points: number
  ): PointTransaction {
    const student = this.findStudent(studentId);
    if (!student) throw new Error('الطالب غير موجود');

    const todayDate = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    const tx: PointTransaction = {
      id: `tx_puz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      teacherId,
      classId: student.classId,
      studentId: student.id,
      studentName: student.name,
      source: 'puzzles',
      points,
      reason: `حل لغز الذكاء الصفي «${puzzleTitle}»`,
      performedBy: teacherId,
      performedByName: teacherName,
      date: nowIso,
      dayDate: todayDate,
    };

    this.db.transactions.unshift(tx);
    this.refreshStudentLedger(student.id);
    this.persist();
    return tx;
  }
}

export const storage = new StorageEngine();

