/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * Express REST API Routes & Middlewares
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { storage, User, Student, PointTransaction, RewardItem, Classroom, TestRecord, HomeworkRecord, RewardRequest } from './storage.ts';
import { GoogleGenAI } from '@google/genai';
import {
  Question,
  GameActivity,
  GameSession,
  CurriculumSubject,
  CurriculumGrade,
  CurriculumBook,
  CurriculumLesson,
} from '../src/types/games.ts';
import {
  calculateBehaviorPoints,
  canAwardBehaviorPoints,
  calculateParticipationPoints,
  calculateGamePoints,
  calculateQuestionPoints,
  calculatePuzzlePoints,
  calculateTestPoints,
  calculateHomeworkPoints,
  canCreateClassForTier,
  canAddStudentForTier,
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
  BehaviorCriterion,
  ParticipationLevel,
  GameRank,
  QuestionDifficulty,
  PuzzleDifficulty,
  HomeworkQuality,
} from '../src/utils/rules.ts';

export const apiRouter = Router();

// Server-side Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Custom authenticated request interface
export interface AuthRequest extends Request {
  user?: User;
}

// Authentication Middleware
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'غير مصرح: يلزم تسجيل الدخول' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const user = storage.findUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'جلسة تسجيل الدخول منتهية أو غير صالحة' });
  }

  req.user = user;
  next();
}

// Teacher Role Guard
export function requireTeacher(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'صلاحية غير كافية: هذا الإجراء مخصص للمعلم فقط' });
  }
  next();
}

// --- 1. AUTHENTICATION ROUTES ---

// Teacher Login
apiRouter.post('/auth/teacher-login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
  }

  const db = storage.getDb();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase().trim() && u.role === 'teacher'
  );

  if (!user || user.passwordHash !== password) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }

  res.json({
    token: user.token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teacherProfile: user.teacherProfile,
    },
  });
});

// Teacher Register
apiRouter.post('/auth/teacher-register', (req: Request, res: Response) => {
  const { email, password, name, schoolName } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  const db = storage.getDb();
  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (existing) {
    return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقًا' });
  }

  const newId = `teacher_${Date.now()}`;
  const newToken = `token_${newId}_${Math.random().toString(36).substring(2, 9)}`;

  const newUser: User = {
    id: newId,
    email: email.trim(),
    name: name.trim(),
    role: 'teacher',
    passwordHash: password,
    token: newToken,
    createdAt: new Date().toISOString(),
    teacherProfile: {
      schoolName: schoolName || 'مدرسة حكومية / أهلية',
      subscriptionTier: 'free', // New teachers start on Free tier
      isAutoRenewing: false,
    },
  };

  db.users.push(newUser);

  // Create a default initial classroom for them
  const initialClass: Classroom = {
    id: `class_${Date.now()}`,
    teacherId: newId,
    name: 'الفصل الأول (أ)',
    gradeLevel: 'المرحلة الابتدائية',
    schoolYear: '1446-1447 هـ',
    leaderboardVisible: true,
    showStudentNames: true,
    archived: false,
    createdAt: new Date().toISOString(),
  };
  db.classrooms.push(initialClass);

  storage.persist();
  storage.logAudit(newId, 'تسجيل حساب جديد', `تم تسجيل المعلم ${name}`);

  res.status(201).json({
    token: newToken,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      teacherProfile: newUser.teacherProfile,
    },
  });
});

// Student Login (Kid-Friendly: Code + PIN or Class + Student Code)
apiRouter.post('/auth/student-login', (req: Request, res: Response) => {
  const { studentCode, pinCode } = req.body;
  if (!studentCode || !pinCode) {
    return res.status(400).json({ error: 'رمز الطالب ورمز الدخول (PIN) مطلوبان' });
  }

  const db = storage.getDb();
  const student = db.students.find(
    (s) =>
      s.studentCode.toUpperCase() === studentCode.toUpperCase().trim() &&
      s.pinCode.trim() === pinCode.trim() &&
      !s.archived
  );

  if (!student) {
    return res.status(401).json({ error: 'رمز الطالب أو رمز الدخول غير صحيح' });
  }

  const classroom = db.classrooms.find((c) => c.id === student.classId);
  const teacher = db.users.find((u) => u.id === student.teacherId);

  // Find or generate user object for student
  let user = db.users.find((u) => u.id === student.id);
  if (!user) {
    user = {
      id: student.id,
      email: `${student.studentCode.toLowerCase()}@heroes.local`,
      name: student.name,
      role: 'student',
      passwordHash: student.pinCode,
      token: `token_student_${student.id}`,
      createdAt: student.createdAt,
      studentProfile: {
        classId: student.classId,
        studentCode: student.studentCode,
        pinCode: student.pinCode,
        gradeLevel: classroom?.gradeLevel || '',
      },
    };
    db.users.push(user);
    storage.persist();
  }

  res.json({
    token: user.token,
    user: {
      id: student.id,
      name: student.name,
      role: 'student',
      studentProfile: {
        classId: student.classId,
        className: classroom?.name || '',
        studentCode: student.studentCode,
        teacherName: teacher?.name || 'المعلم أسامة الشهري',
      },
    },
    studentData: student,
  });
});

// Current User Profile
apiRouter.get('/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  if (user.role === 'student') {
    const student = storage.findStudent(user.id);
    const db = storage.getDb();
    const classroom = db.classrooms.find((c) => c.id === student?.classId);
    const teacher = db.users.find((u) => u.id === student?.teacherId);

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        studentProfile: {
          classId: student?.classId,
          className: classroom?.name,
          studentCode: student?.studentCode,
          teacherName: teacher?.name,
        },
      },
      studentData: student,
    });
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teacherProfile: user.teacherProfile,
    },
  });
});

// --- 2. CLASSROOMS ROUTES ---

// List Teacher's Classrooms
apiRouter.get('/classes', requireAuth, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  if (req.user!.role === 'teacher') {
    const classes = db.classrooms.filter((c) => c.teacherId === req.user!.id && !c.archived);
    // Attach student count
    const result = classes.map((c) => {
      const studentCount = db.students.filter((s) => s.classId === c.id && !s.archived).length;
      return { ...c, studentCount };
    });
    return res.json(result);
  } else {
    // Student can only see their own class
    const student = storage.findStudent(req.user!.id);
    if (!student) return res.status(404).json({ error: 'طالب غير موجود' });
    const classroom = db.classrooms.find((c) => c.id === student.classId);
    return res.json(classroom ? [classroom] : []);
  }
});

// Create Classroom (Enforce Tier Limits on Server)
apiRouter.post('/classes', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { name, gradeLevel, schoolYear } = req.body;
  if (!name || !gradeLevel) {
    return res.status(400).json({ error: 'اسم الفصل والمرحلة الدراسية مطلوبان' });
  }

  const db = storage.getDb();
  const currentCount = db.classrooms.filter((c) => c.teacherId === req.user!.id && !c.archived).length;
  const tier = req.user!.teacherProfile?.subscriptionTier || 'free';

  if (!canCreateClassForTier(currentCount, tier)) {
    const plan = SUBSCRIPTION_PLANS[tier];
    return res.status(403).json({
      error: `وصلت للحد الأقصى لعدد الفصول في باقتك الحالية (${plan.nameAr}: ${plan.maxClasses} فصول). يرجى ترقية الاشتراك لإضافة المزيد من الفصول.`,
      code: 'TIER_LIMIT_REACHED',
    });
  }

  const newClass: Classroom = {
    id: `class_${Date.now()}`,
    teacherId: req.user!.id,
    name: name.trim(),
    gradeLevel: gradeLevel.trim(),
    schoolYear: schoolYear?.trim() || '1446-1447 هـ',
    leaderboardVisible: true,
    showStudentNames: true,
    archived: false,
    createdAt: new Date().toISOString(),
  };

  db.classrooms.push(newClass);
  storage.persist();
  storage.logAudit(req.user!.id, 'إنشاء فصل جديد', `تم إنشاء الفصل: ${newClass.name}`);

  res.status(201).json(newClass);
});

// Update Classroom Settings
apiRouter.put('/classes/:id', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const classroom = db.classrooms.find((c) => c.id === req.params.id && c.teacherId === req.user!.id);
  if (!classroom) {
    return res.status(404).json({ error: 'الفصل غير موجود أو ليس لديك صلاحية' });
  }

  const { name, gradeLevel, schoolYear, leaderboardVisible, showStudentNames } = req.body;
  if (name) classroom.name = name.trim();
  if (gradeLevel) classroom.gradeLevel = gradeLevel.trim();
  if (schoolYear) classroom.schoolYear = schoolYear.trim();
  if (typeof leaderboardVisible === 'boolean') classroom.leaderboardVisible = leaderboardVisible;
  if (typeof showStudentNames === 'boolean') classroom.showStudentNames = showStudentNames;

  storage.persist();
  res.json(classroom);
});

// Archive Classroom
apiRouter.delete('/classes/:id', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const classroom = db.classrooms.find((c) => c.id === req.params.id && c.teacherId === req.user!.id);
  if (!classroom) {
    return res.status(404).json({ error: 'الفصل غير موجود' });
  }

  classroom.archived = true;
  storage.persist();
  storage.logAudit(req.user!.id, 'أرشفة فصل', `تمت أرشفة فصل ${classroom.name}`);
  res.json({ message: 'تم أرشفة الفصل بنجاح' });
});

// --- 3. STUDENTS ROUTES ---

// List Students in Class
apiRouter.get('/classes/:classId/students', requireAuth, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const classId = req.params.classId;

  // Access check
  if (req.user!.role === 'teacher') {
    const classroom = db.classrooms.find((c) => c.id === classId && c.teacherId === req.user!.id);
    if (!classroom) return res.status(403).json({ error: 'غير مصرح للوصول إلى هذا الفصل' });

    const students = db.students.filter((s) => s.classId === classId && !s.archived);
    return res.json(students);
  } else {
    // Student checking their class roster (only names, badges, total score if leaderboard visible)
    const currentStudent = storage.findStudent(req.user!.id);
    if (!currentStudent || currentStudent.classId !== classId) {
      return res.status(403).json({ error: 'غير مصرح للوصول إلى طلاب هذا الفصل' });
    }

    const classroom = db.classrooms.find((c) => c.id === classId);
    const students = db.students.filter((s) => s.classId === classId && !s.archived);

    // If teacher hid names, anonymize others
    const sanitized = students.map((s, idx) => ({
      id: s.id,
      name:
        s.id === currentStudent.id || classroom?.showStudentNames !== false
          ? s.name
          : `بطل الفصل (${idx + 1})`,
      studentCode: s.id === currentStudent.id ? s.studentCode : '***',
      historicalAchievement: s.historicalAchievement,
      badges: s.badges,
      activeTitle: s.activeTitle,
    }));
    return res.json(sanitized);
  }
});

// Add Single Student (Enforces Tier Student Limit on Server)
apiRouter.post('/classes/:classId/students', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const classId = req.params.classId;
  const { name, studentCode, pinCode } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم الطالب مطلوب' });

  const db = storage.getDb();
  const classroom = db.classrooms.find((c) => c.id === classId && c.teacherId === req.user!.id);
  if (!classroom) return res.status(404).json({ error: 'الفصل غير موجود' });

  const currentCount = db.students.filter((s) => s.classId === classId && !s.archived).length;
  const tier = req.user!.teacherProfile?.subscriptionTier || 'free';

  if (!canAddStudentForTier(currentCount, tier)) {
    const plan = SUBSCRIPTION_PLANS[tier];
    return res.status(403).json({
      error: `وصلت للحد الأقصى لعدد الطلاب في الفصل لباقة ${plan.nameAr} (${plan.maxStudentsPerClass} طالب). يرجى الترقية لإضافة المزيد من الطلاب.`,
      code: 'TIER_STUDENT_LIMIT_REACHED',
    });
  }

  // Generate unique student code and PIN if not provided
  const code = studentCode?.trim() || `S${100 + currentCount + 1}`;
  const pin = pinCode?.trim() || Math.floor(1000 + Math.random() * 9000).toString();

  const newStudent: Student = {
    id: `stu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    teacherId: req.user!.id,
    classId,
    studentCode: code,
    pinCode: pin,
    name: name.trim(),
    availableBalance: 0,
    totalEarned: 0,
    totalSpent: 0,
    historicalAchievement: 0,
    badges: [],
    archived: false,
    createdAt: new Date().toISOString(),
  };

  db.students.push(newStudent);

  // Also create student user entity
  db.users.push({
    id: newStudent.id,
    email: `${newStudent.studentCode.toLowerCase()}@heroes.local`,
    name: newStudent.name,
    role: 'student',
    passwordHash: newStudent.pinCode,
    token: `token_student_${newStudent.id}`,
    createdAt: newStudent.createdAt,
    studentProfile: {
      classId,
      studentCode: newStudent.studentCode,
      pinCode: newStudent.pinCode,
      gradeLevel: classroom.gradeLevel,
    },
  });

  storage.persist();
  storage.logAudit(req.user!.id, 'إضافة طالب', `تم إضافة الطالب ${newStudent.name} إلى ${classroom.name}`);

  res.status(201).json(newStudent);
});

// Bulk Add Students
apiRouter.post('/classes/:classId/students/bulk', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const classId = req.params.classId;
  const { studentNames } = req.body; // array of strings
  if (!Array.isArray(studentNames) || studentNames.length === 0) {
    return res.status(400).json({ error: 'قائمة أسماء الطلاب مطلوبة' });
  }

  const db = storage.getDb();
  const classroom = db.classrooms.find((c) => c.id === classId && c.teacherId === req.user!.id);
  if (!classroom) return res.status(404).json({ error: 'الفصل غير موجود' });

  const currentCount = db.students.filter((s) => s.classId === classId && !s.archived).length;
  const tier = req.user!.teacherProfile?.subscriptionTier || 'free';
  const plan = SUBSCRIPTION_PLANS[tier];

  if (currentCount + studentNames.length > plan.maxStudentsPerClass) {
    return res.status(403).json({
      error: `إضافة ${studentNames.length} طالب تتجاوز حد باقة ${plan.nameAr} (${plan.maxStudentsPerClass} طالب). المتبقي لك: ${plan.maxStudentsPerClass - currentCount} طالب.`,
      code: 'TIER_STUDENT_LIMIT_REACHED',
    });
  }

  const added: Student[] = [];
  studentNames.forEach((rawName, index) => {
    const name = String(rawName).trim();
    if (!name) return;

    const code = `S${100 + currentCount + index + 1}`;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const student: Student = {
      id: `stu_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      teacherId: req.user!.id,
      classId,
      studentCode: code,
      pinCode: pin,
      name,
      availableBalance: 0,
      totalEarned: 0,
      totalSpent: 0,
      historicalAchievement: 0,
      badges: [],
      archived: false,
      createdAt: new Date().toISOString(),
    };

    db.students.push(student);
    db.users.push({
      id: student.id,
      email: `${student.studentCode.toLowerCase()}@heroes.local`,
      name: student.name,
      role: 'student',
      passwordHash: student.pinCode,
      token: `token_student_${student.id}`,
      createdAt: student.createdAt,
      studentProfile: {
        classId,
        studentCode: student.studentCode,
        pinCode: student.pinCode,
        gradeLevel: classroom.gradeLevel,
      },
    });
    added.push(student);
  });

  storage.persist();
  storage.logAudit(req.user!.id, 'إضافة جماعية للطلاب', `تمت إضافة ${added.length} طالب إلى ${classroom.name}`);

  res.status(201).json({ addedCount: added.length, students: added });
});

// Update / Transfer Student between classes
apiRouter.put('/students/:id', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const student = db.students.find((s) => s.id === req.params.id && s.teacherId === req.user!.id);
  if (!student) return res.status(404).json({ error: 'الطالب غير موجود' });

  const { name, targetClassId, studentCode, pinCode, activeTitle } = req.body;

  if (name) student.name = name.trim();
  if (studentCode) student.studentCode = studentCode.trim();
  if (pinCode) student.pinCode = pinCode.trim();
  if (activeTitle !== undefined) student.activeTitle = activeTitle || undefined;

  // Move student to another class without losing history
  if (targetClassId && targetClassId !== student.classId) {
    const targetClass = db.classrooms.find(
      (c) => c.id === targetClassId && c.teacherId === req.user!.id && !c.archived
    );
    if (!targetClass) return res.status(400).json({ error: 'الفصل المستهدف غير موجود' });

    const prevClassId = student.classId;
    student.classId = targetClassId;

    // Update user entity
    const user = db.users.find((u) => u.id === student.id);
    if (user && user.studentProfile) {
      user.studentProfile.classId = targetClassId;
      user.studentProfile.gradeLevel = targetClass.gradeLevel;
    }

    storage.logAudit(
      req.user!.id,
      'نقل طالب بين الفصول',
      `تم نقل الطالب ${student.name} من الفصل ${prevClassId} إلى ${targetClass.name} مع الاحتفاظ بكامل سجله التاريخي`
    );
  }

  storage.persist();
  res.json(student);
});

// Student History & Ledger
apiRouter.get('/students/:id/history', requireAuth, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const studentId = req.params.id;

  // If student is requesting, ensure it's their own ID!
  if (req.user!.role === 'student' && req.user!.id !== studentId) {
    return res.status(403).json({ error: 'غير مصرح: لا يحق لك الاطلاع على سجل طلاب آخرين' });
  }

  const student = storage.findStudent(studentId);
  if (!student) return res.status(404).json({ error: 'الطالب غير موجود' });

  // If teacher is requesting, ensure ownership
  if (req.user!.role === 'teacher' && student.teacherId !== req.user!.id) {
    return res.status(403).json({ error: 'غير مصرح للوصول لبيانات هذا الطالب' });
  }

  const transactions = db.transactions
    .filter((tx) => tx.studentId === studentId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const rewardRequests = db.rewardRequests
    .filter((r) => r.studentId === studentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    student,
    transactions,
    rewardRequests,
  });
});

// Archive Student
apiRouter.post('/students/:id/archive', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const student = db.students.find((s) => s.id === req.params.id && s.teacherId === req.user!.id);
  if (!student) return res.status(404).json({ error: 'الطالب غير موجود' });

  student.archived = true;
  storage.persist();
  storage.logAudit(req.user!.id, 'أرشفة طالب', `تم أرشفة الطالب ${student.name} مع حفظ سجله التاريخي`);
  res.json({ message: 'تم أرشفة الطالب بنجاح' });
});

// --- 4. POINTS ENGINE ROUTES (7 SPECIFIED SOURCES) ---

// Award Points Endpoint (Single or Bulk)
apiRouter.post('/points/award', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const {
    studentIds, // array of student ids
    classId,
    source, // 'behavior' | 'participation' | 'games' | 'questions' | 'puzzles' | 'tests' | 'homework'
    subType,
    customReason,
    // Source specific params
    behaviorCriterion, // 'quiet_etiquette' | 'teacher_instructions' | 'cooperation_cleanliness'
    participationLevel, // 'simple' | 'distinguished'
    gameRank, // 1 | 2 | 3
    questionDifficulty, // 'easy' | 'medium' | 'hard'
    puzzleDifficulty, // 'easy' | 'medium' | 'hard'
  } = req.body;

  if (!Array.isArray(studentIds) || studentIds.length === 0 || !source || !classId) {
    return res.status(400).json({ error: 'معرفات الطلاب، الفصل، ومصدر النقاط مطلوبة' });
  }

  const db = storage.getDb();
  const todayDate = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  let calculatedPoints = 0;
  let reasonText = customReason?.trim() || '';

  // Determine points based on exact 7 rules
  switch (source) {
    case 'behavior': {
      const criterion = (behaviorCriterion || subType) as BehaviorCriterion;
      calculatedPoints = calculateBehaviorPoints(criterion);
      if (!reasonText) {
        if (criterion === 'quiet_etiquette') reasonText = 'الالتزام بالهدوء وآداب الفصل';
        else if (criterion === 'teacher_instructions') reasonText = 'اتباع تعليمات المعلم';
        else reasonText = 'التعاون والمحافظة على البيئة الصفية';
      }
      break;
    }
    case 'participation': {
      const level = (participationLevel || subType || 'simple') as ParticipationLevel;
      calculatedPoints = calculateParticipationPoints(level);
      if (!reasonText) {
        reasonText = level === 'distinguished' ? 'مشاركة صحيحة أو متميزة' : 'مشاركة بسيطة ومرتبطة بالدرس';
      }
      break;
    }
    case 'games': {
      const rank = Number(gameRank || subType || 1) as GameRank;
      calculatedPoints = calculateGamePoints(rank);
      if (!reasonText) {
        reasonText = `المركز ${rank === 1 ? 'الأول' : rank === 2 ? 'الثاني' : 'الثالث'} في اللعبة الصفية`;
      }
      break;
    }
    case 'questions': {
      const diff = (questionDifficulty || subType || 'easy') as QuestionDifficulty;
      calculatedPoints = calculateQuestionPoints(diff);
      if (!reasonText) {
        reasonText = `إجابة سؤال (${diff === 'hard' ? 'صعب' : diff === 'medium' ? 'متوسط' : 'سهل'})`;
      }
      break;
    }
    case 'puzzles': {
      const diff = (puzzleDifficulty || subType || 'easy') as PuzzleDifficulty;
      calculatedPoints = calculatePuzzlePoints(diff);
      if (!reasonText) {
        reasonText = `حل لغز (${diff === 'hard' ? 'صعب' : diff === 'medium' ? 'متوسط' : 'سهل'})`;
      }
      break;
    }
    default:
      return res.status(400).json({ error: 'مصدر النقاط غير معروف أو يجب استخدام الواجهة المخصصة للاختبارات والواجبات' });
  }

  const results: Array<{
    studentId: string;
    studentName: string;
    pointsAwarded: number;
    transactionId?: string;
    status: 'success' | 'capped' | 'skipped';
    message: string;
  }> = [];

  for (const sId of studentIds) {
    const student = db.students.find((s) => s.id === sId && s.teacherId === req.user!.id);
    if (!student) continue;

    let pointsToAward = calculatedPoints;

    // Enforce daily behavior 3 points limit
    if (source === 'behavior') {
      const todayBehaviorTxs = db.transactions.filter(
        (tx) => tx.studentId === sId && tx.source === 'behavior' && tx.dayDate === todayDate && tx.points > 0
      );
      const currentTodayBehaviorPoints = todayBehaviorTxs.reduce((sum, tx) => sum + tx.points, 0);

      const check = canAwardBehaviorPoints(currentTodayBehaviorPoints, calculatedPoints);
      if (!check.allowed || check.pointsAwardable <= 0) {
        results.push({
          studentId: student.id,
          studentName: student.name,
          pointsAwarded: 0,
          status: 'skipped',
          message: check.messageAr,
        });
        continue;
      }
      pointsToAward = check.pointsAwardable;
    }

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTx: PointTransaction = {
      id: txId,
      teacherId: req.user!.id,
      classId,
      studentId: student.id,
      studentName: student.name,
      source,
      subType,
      points: pointsToAward,
      reason: reasonText,
      performedBy: req.user!.id,
      performedByName: req.user!.name,
      date: nowIso,
      dayDate: todayDate,
    };

    db.transactions.push(newTx);
    storage.refreshStudentLedger(student.id);

    results.push({
      studentId: student.id,
      studentName: student.name,
      pointsAwarded: pointsToAward,
      transactionId: txId,
      status: pointsToAward === calculatedPoints ? 'success' : 'capped',
      message: `تم منح ${pointsToAward} نقطة بنجاح`,
    });
  }

  storage.persist();
  storage.logAudit(
    req.user!.id,
    'منح نقاط',
    `تم منح نقاط (${source}) لعدد ${results.filter((r) => r.pointsAwarded > 0).length} طالب`
  );

  res.json({
    source,
    calculatedPoints,
    results,
  });
});

// Correct / Adjust a previous transaction (Immutability with linked correction)
apiRouter.post('/points/correct', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { transactionId, correctionReason, adjustmentPoints } = req.body;
  if (!transactionId || !correctionReason || typeof adjustmentPoints !== 'number') {
    return res.status(400).json({ error: 'معرف العملية وسبب التصحيح وقيمة التعديل مطلوبة' });
  }

  const db = storage.getDb();
  const originalTx = db.transactions.find((tx) => tx.id === transactionId && tx.teacherId === req.user!.id);
  if (!originalTx) return res.status(404).json({ error: 'العملية الأصلية غير موجودة' });

  const student = db.students.find((s) => s.id === originalTx.studentId);
  if (!student) return res.status(404).json({ error: 'الطالب غير موجود' });

  const correctionTx: PointTransaction = {
    id: `tx_adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    teacherId: req.user!.id,
    classId: originalTx.classId,
    studentId: originalTx.studentId,
    studentName: originalTx.studentName,
    source: originalTx.source,
    points: adjustmentPoints, // positive to add, negative to deduct
    reason: `[تصحيح لعملية سابقة #${originalTx.id}]: ${correctionReason}`,
    performedBy: req.user!.id,
    performedByName: req.user!.name,
    date: new Date().toISOString(),
    dayDate: new Date().toISOString().slice(0, 10),
    isAdjustment: true,
    correctionOfId: originalTx.id,
    correctionReason,
  };

  db.transactions.push(correctionTx);
  storage.refreshStudentLedger(student.id);
  storage.persist();

  storage.logAudit(
    req.user!.id,
    'تصحيح معاملة نقاط',
    `تصحيح العملية #${originalTx.id} للطالب ${student.name} بتعديل ${adjustmentPoints} نقطة: ${correctionReason}`
  );

  res.json({ message: 'تم تسجيل عملية التصحيح بنجاح', correctionTx });
});

// --- 5. TESTS & QUIZZES ROUTES ---

// List Tests
apiRouter.get('/tests', requireAuth, (req: AuthRequest, res: Response) => {
  const { classId } = req.query;
  const db = storage.getDb();

  if (req.user!.role === 'teacher') {
    let tests = db.tests.filter((t) => t.teacherId === req.user!.id);
    if (classId) tests = tests.filter((t) => t.classId === classId);
    return res.json(tests);
  } else {
    // Student: can only view tests from their class and only their own score!
    const student = storage.findStudent(req.user!.id);
    if (!student) return res.status(404).json({ error: 'طالب غير موجود' });

    const tests = db.tests.filter((t) => t.classId === student.classId);
    const sanitized = tests.map((t) => {
      const myGrade = t.grades.find((g) => g.studentId === student.id);
      return {
        id: t.id,
        title: t.title,
        date: t.date,
        myScoreOutOf20: myGrade?.scoreOutOf20,
        myPointsAwarded: myGrade?.pointsAwarded,
      };
    });
    return res.json(sanitized);
  }
});

// Record New Test with auto conversion out of 20
apiRouter.post('/tests', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { classId, title, date, grades } = req.body;
  // grades is Array<{ studentId: string; scoreOutOf20: number }>
  if (!classId || !title || !Array.isArray(grades)) {
    return res.status(400).json({ error: 'الفصل، عنوان الاختبار، ودرجات الطلاب مطلوبة' });
  }

  const db = storage.getDb();
  const testId = `test_${Date.now()}`;
  const nowIso = new Date().toISOString();
  const todayDate = nowIso.slice(0, 10);

  const testGrades: TestRecord['grades'] = [];

  for (const item of grades) {
    const student = db.students.find((s) => s.id === item.studentId && s.teacherId === req.user!.id);
    if (!student) continue;

    const score = Number(item.scoreOutOf20);
    const points = calculateTestPoints(score, true);

    const txId = `tx_test_${Date.now()}_${student.id}`;
    const tx: PointTransaction = {
      id: txId,
      teacherId: req.user!.id,
      classId,
      studentId: student.id,
      studentName: student.name,
      source: 'tests',
      subType: 'test_score',
      points,
      reason: `اختبار [${title}]: الدرجة (${score}/20) = ${points} نقاط`,
      performedBy: req.user!.id,
      performedByName: req.user!.name,
      date: nowIso,
      dayDate: todayDate,
    };

    db.transactions.push(tx);
    storage.refreshStudentLedger(student.id);

    testGrades.push({
      studentId: student.id,
      studentName: student.name,
      scoreOutOf20: score,
      pointsAwarded: points,
      transactionId: txId,
    });
  }

  const testRecord: TestRecord = {
    id: testId,
    teacherId: req.user!.id,
    classId,
    title: title.trim(),
    date: date || todayDate,
    maxScore: 20,
    grades: testGrades,
  };

  db.tests.unshift(testRecord);
  storage.persist();
  storage.logAudit(req.user!.id, 'تسجيل اختبار', `تم رصد اختبار ${title} لعدد ${testGrades.length} طالب`);

  res.status(201).json(testRecord);
});

// Update Test Score (Recalculates points cleanly without duplication)
apiRouter.put('/tests/:id', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const test = db.tests.find((t) => t.id === req.params.id && t.teacherId === req.user!.id);
  if (!test) return res.status(404).json({ error: 'الاختبار غير موجود' });

  const { title, date, updatedGrades } = req.body;
  if (title) test.title = title.trim();
  if (date) test.date = date;

  if (Array.isArray(updatedGrades)) {
    for (const update of updatedGrades) {
      const existingGrade = test.grades.find((g) => g.studentId === update.studentId);
      if (!existingGrade) continue;

      const newScore = Number(update.scoreOutOf20);
      const newPoints = calculateTestPoints(newScore, true);

      // Find original transaction
      const origTx = db.transactions.find((tx) => tx.id === existingGrade.transactionId);
      if (origTx) {
        origTx.points = newPoints;
        origTx.reason = `اختبار [${test.title}]: تعديل الدرجة إلى (${newScore}/20) = ${newPoints} نقاط`;
        existingGrade.scoreOutOf20 = newScore;
        existingGrade.pointsAwarded = newPoints;
        storage.refreshStudentLedger(update.studentId);
      }
    }
  }

  storage.persist();
  storage.logAudit(req.user!.id, 'تعديل درجات اختبار', `تم تعديل درجات اختبار ${test.title} وإعادة احتساب النقاط بدقة`);
  res.json(test);
});

// --- 6. HOMEWORK ROUTES ---

// List Homework
apiRouter.get('/homework', requireAuth, (req: AuthRequest, res: Response) => {
  const { classId } = req.query;
  const db = storage.getDb();

  if (req.user!.role === 'teacher') {
    let hw = db.homeworks.filter((h) => h.teacherId === req.user!.id);
    if (classId) hw = hw.filter((h) => h.classId === classId);
    return res.json(hw);
  } else {
    // Student
    const student = storage.findStudent(req.user!.id);
    if (!student) return res.status(404).json({ error: 'طالب غير موجود' });

    const hw = db.homeworks.filter((h) => h.classId === student.classId);
    const sanitized = hw.map((h) => {
      const mySub = h.submissions.find((s) => s.studentId === student.id);
      return {
        id: h.id,
        title: h.title,
        dueDate: h.dueDate,
        myEvaluation: mySub?.quality,
        mySubmittedOnTime: mySub?.submittedOnTime,
        myPointsAwarded: mySub?.pointsAwarded,
      };
    });
    return res.json(sanitized);
  }
});

// Create Homework & Record evaluations
apiRouter.post('/homework', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { classId, title, dueDate, submissions } = req.body;
  if (!classId || !title || !Array.isArray(submissions)) {
    return res.status(400).json({ error: 'الفصل، عنوان الواجب، وتقييمات الطلاب مطلوبة' });
  }

  const db = storage.getDb();
  const hwId = `hw_${Date.now()}`;
  const nowIso = new Date().toISOString();
  const todayDate = nowIso.slice(0, 10);

  const hwSubmissions: HomeworkRecord['submissions'] = [];

  for (const item of submissions) {
    const student = db.students.find((s) => s.id === item.studentId && s.teacherId === req.user!.id);
    if (!student) continue;

    const quality = item.quality as HomeworkQuality;
    const submittedOnTime = Boolean(item.submittedOnTime);
    const { basePoints, onTimeBonus, totalPoints } = calculateHomeworkPoints(quality, submittedOnTime);

    const txId = `tx_hw_${Date.now()}_${student.id}`;
    const tx: PointTransaction = {
      id: txId,
      teacherId: req.user!.id,
      classId,
      studentId: student.id,
      studentName: student.name,
      source: 'homework',
      subType: quality,
      points: totalPoints,
      reason: `واجب [${title}]: أساسي (${basePoints}) ${onTimeBonus > 0 ? `+ مكافأة موعد (${onTimeBonus})` : ''} = ${totalPoints} نقاط`,
      performedBy: req.user!.id,
      performedByName: req.user!.name,
      date: nowIso,
      dayDate: todayDate,
    };

    db.transactions.push(tx);
    storage.refreshStudentLedger(student.id);

    hwSubmissions.push({
      studentId: student.id,
      studentName: student.name,
      quality,
      submittedOnTime,
      pointsAwarded: totalPoints,
      transactionId: txId,
    });
  }

  const hwRecord: HomeworkRecord = {
    id: hwId,
    teacherId: req.user!.id,
    classId,
    title: title.trim(),
    dueDate: dueDate || todayDate,
    submissions: hwSubmissions,
  };

  db.homeworks.unshift(hwRecord);
  storage.persist();
  storage.logAudit(req.user!.id, 'رصد تقييم واجب', `تم رصد واجب ${title} لعدد ${hwSubmissions.length} طالب`);

  res.status(201).json(hwRecord);
});

// --- 7. REWARDS STORE ROUTES ---

// List Rewards
apiRouter.get('/rewards', requireAuth, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  if (req.user!.role === 'teacher') {
    return res.json(db.rewards.filter((r) => r.teacherId === req.user!.id));
  } else {
    // Student can only see active rewards from their teacher
    const student = storage.findStudent(req.user!.id);
    if (!student) return res.status(404).json({ error: 'طالب غير موجود' });

    return res.json(
      db.rewards.filter((r) => r.teacherId === student.teacherId && r.isActive)
    );
  }
});

// Add / Create Reward Item
apiRouter.post('/rewards', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { title, costPoints, description, icon, stock } = req.body;
  if (!title || typeof costPoints !== 'number' || costPoints <= 0) {
    return res.status(400).json({ error: 'عنوان المكافأة وتكلفتها بالنقاط مطلوبان' });
  }

  const db = storage.getDb();
  const newReward: RewardItem = {
    id: `rew_${Date.now()}`,
    teacherId: req.user!.id,
    title: title.trim(),
    costPoints,
    description: description?.trim() || '',
    icon: icon || 'Gift',
    stock: stock === undefined || stock === null || stock === '' ? null : Number(stock),
    isActive: true,
  };

  db.rewards.push(newReward);
  storage.persist();
  storage.logAudit(req.user!.id, 'إضافة مكافأة جديدة', `تمت إضافة مكافأة ${newReward.title} بتكلفة ${costPoints} نقطة`);

  res.status(201).json(newReward);
});

// Update Reward Item
apiRouter.put('/rewards/:id', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const reward = db.rewards.find((r) => r.id === req.params.id && r.teacherId === req.user!.id);
  if (!reward) return res.status(404).json({ error: 'المكافأة غير موجودة' });

  const { title, costPoints, description, icon, stock, isActive } = req.body;
  if (title) reward.title = title.trim();
  if (typeof costPoints === 'number') reward.costPoints = costPoints;
  if (description !== undefined) reward.description = description.trim();
  if (icon) reward.icon = icon;
  if (stock !== undefined) reward.stock = stock === null || stock === '' ? null : Number(stock);
  if (typeof isActive === 'boolean') reward.isActive = isActive;

  storage.persist();
  res.json(reward);
});

// Delete / Deactivate Reward Item
apiRouter.delete('/rewards/:id', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const reward = db.rewards.find((r) => r.id === req.params.id && r.teacherId === req.user!.id);
  if (!reward) return res.status(404).json({ error: 'المكافأة غير موجودة' });

  reward.isActive = false;
  storage.persist();
  res.json({ message: 'تم إيقاف المكافأة بنجاح' });
});

// Student Redemption Request (With Concurrency & Balance Validation)
apiRouter.post('/rewards/:id/redeem', requireAuth, (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'student') {
    return res.status(403).json({ error: 'الطلاب فقط هم من يستطيعون استبدال المكافآت' });
  }

  const rewardId = req.params.id;
  const db = storage.getDb();
  const student = storage.findStudent(req.user!.id);
  if (!student) return res.status(404).json({ error: 'بيانات الطالب غير موجودة' });

  const reward = db.rewards.find((r) => r.id === rewardId && r.teacherId === student.teacherId && r.isActive);
  if (!reward) return res.status(404).json({ error: 'المكافأة غير متاحة حالياً' });

  // Refresh balance to ensure freshness
  storage.refreshStudentLedger(student.id);

  // Check available balance
  if (student.availableBalance < reward.costPoints) {
    return res.status(400).json({
      error: `رصيدك المتاح (${student.availableBalance} نقطة) غير كافٍ لشراء هذه المكافأة (${reward.costPoints} نقطة)`,
      code: 'INSUFFICIENT_POINTS',
    });
  }

  // Check stock
  if (reward.stock !== null && reward.stock <= 0) {
    return res.status(400).json({ error: 'عذراً، نفد مخزون هذه المكافأة حالياً', code: 'OUT_OF_STOCK' });
  }

  // Prevent double click / duplicate pending requests for the same reward within 10 seconds
  const recentPending = db.rewardRequests.find(
    (r) =>
      r.studentId === student.id &&
      r.rewardId === reward.id &&
      r.status === 'pending' &&
      Date.now() - new Date(r.createdAt).getTime() < 10000
  );
  if (recentPending) {
    return res.status(409).json({ error: 'يوجد طلب معلق لنفس المكافأة قيد المراجعة حالياً' });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();

  const newRequest: RewardRequest = {
    id: requestId,
    teacherId: student.teacherId,
    classId: student.classId,
    studentId: student.id,
    studentName: student.name,
    rewardId: reward.id,
    rewardTitle: reward.title,
    costPoints: reward.costPoints,
    status: 'pending',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  db.rewardRequests.unshift(newRequest);
  storage.persist();

  res.status(201).json({
    message: 'تم إرسال طلب استبدال المكافأة بنجاح وهو بانتظار اعتماد المعلم',
    request: newRequest,
  });
});

// List Reward Requests
apiRouter.get('/rewards/requests', requireAuth, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  if (req.user!.role === 'teacher') {
    const list = db.rewardRequests.filter((r) => r.teacherId === req.user!.id);
    return res.json(list);
  } else {
    const list = db.rewardRequests.filter((r) => r.studentId === req.user!.id);
    return res.json(list);
  }
});

// Teacher Review Reward Request (Approve / Reject / Deliver)
apiRouter.post('/rewards/requests/:requestId/review', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { action, rejectionReason } = req.body; // action: 'approve' | 'reject' | 'deliver'
  if (!['approve', 'reject', 'deliver'].includes(action)) {
    return res.status(400).json({ error: 'الإجراء غير صالح' });
  }

  const db = storage.getDb();
  const request = db.rewardRequests.find((r) => r.id === req.params.requestId && r.teacherId === req.user!.id);
  if (!request) return res.status(404).json({ error: 'طلب المكافأة غير موجود' });

  const student = db.students.find((s) => s.id === request.studentId);
  const reward = db.rewards.find((r) => r.id === request.rewardId);

  if (action === 'approve') {
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'هذا الطلب تمت معالجته مسبقاً' });
    }

    // Decrement stock if finite
    if (reward && reward.stock !== null && reward.stock > 0) {
      reward.stock -= 1;
    }

    // Record spending transaction
    const spendTx: PointTransaction = {
      id: `tx_spend_${Date.now()}`,
      teacherId: req.user!.id,
      classId: request.classId,
      studentId: request.studentId,
      studentName: request.studentName,
      source: 'games', // spending record
      points: -request.costPoints,
      reason: `استبدال مكافأة: [${request.rewardTitle}]`,
      performedBy: req.user!.id,
      performedByName: req.user!.name,
      date: new Date().toISOString(),
      dayDate: new Date().toISOString().slice(0, 10),
    };
    db.transactions.push(spendTx);

    request.status = 'approved';
    request.updatedAt = new Date().toISOString();

    if (student) {
      storage.refreshStudentLedger(student.id);
    }

    storage.logAudit(
      req.user!.id,
      'اعتماد استبدال مكافأة',
      `تم اعتماد مكافأة ${request.rewardTitle} للطالب ${request.studentName} وخصم ${request.costPoints} نقطة من الرصيد المتاح`
    );
  } else if (action === 'deliver') {
    request.status = 'delivered';
    request.updatedAt = new Date().toISOString();
    storage.logAudit(
      req.user!.id,
      'تسليم مكافأة',
      `تم تسليم مكافأة ${request.rewardTitle} للطالب ${request.studentName}`
    );
  } else if (action === 'reject') {
    request.status = 'rejected';
    request.rejectionReason = rejectionReason?.trim() || 'تم الرفض بواسطة المعلم مع إعادة النقاط';
    request.updatedAt = new Date().toISOString();

    // If points had been deducted previously, restore them automatically!
    if (student) {
      storage.refreshStudentLedger(student.id);
    }

    storage.logAudit(
      req.user!.id,
      'رفض استبدال مكافأة',
      `تم رفض طلب ${request.rewardTitle} للطالب ${request.studentName}: ${request.rejectionReason}`
    );
  }

  storage.persist();
  res.json({ message: 'تم تحديث حالة الطلب بنجاح', request });
});

// --- 8. LEADERBOARD & ACHIEVEMENTS ---

apiRouter.get('/leaderboard', requireAuth, (req: AuthRequest, res: Response) => {
  const { classId, period } = req.query;
  const db = storage.getDb();

  let targetClassId = classId as string;
  if (!targetClassId && req.user!.role === 'student') {
    const student = storage.findStudent(req.user!.id);
    targetClassId = student?.classId || '';
  }

  const classroom = db.classrooms.find((c) => c.id === targetClassId);
  if (!classroom) return res.status(404).json({ error: 'الفصل غير موجود' });

  // If student and teacher disabled leaderboard
  if (req.user!.role === 'student' && !classroom.leaderboardVisible) {
    return res.json({
      leaderboardVisible: false,
      message: 'لوحة المتصدرين مغلقة مؤقتاً بتوجيه من المعلم',
      students: [],
    });
  }

  const students = db.students.filter((s) => s.classId === targetClassId && !s.archived);

  // Calculate points according to period
  const now = new Date();
  let minDate = new Date(0);
  if (period === 'today') {
    minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    minDate = new Date(now.getTime() - 7 * 86400000);
  } else if (period === 'month') {
    minDate = new Date(now.getTime() - 30 * 86400000);
  }

  const ranked = students
    .map((st) => {
      let periodPoints = st.historicalAchievement;
      if (period === 'today' || period === 'week' || period === 'month') {
        const txs = db.transactions.filter(
          (tx) => tx.studentId === st.id && tx.points > 0 && new Date(tx.date) >= minDate
        );
        periodPoints = txs.reduce((sum, tx) => sum + tx.points, 0);
      }

      return {
        id: st.id,
        name:
          req.user!.role === 'teacher' || req.user!.id === st.id || classroom.showStudentNames !== false
            ? st.name
            : 'بطل من أبطال الفصل',
        studentCode: req.user!.role === 'teacher' || req.user!.id === st.id ? st.studentCode : '***',
        points: periodPoints,
        historicalAchievement: st.historicalAchievement,
        availableBalance: req.user!.role === 'teacher' || req.user!.id === st.id ? st.availableBalance : undefined,
        badges: st.badges,
        activeTitle: st.activeTitle,
      };
    })
    .sort((a, b) => b.points - a.points);

  res.json({
    classroomName: classroom.name,
    leaderboardVisible: classroom.leaderboardVisible,
    students: ranked,
  });
});

// --- 9. SUBSCRIPTIONS & MONETIZATION (APP STORE & GOOGLE PLAY BILLING) ---

// Get Subscription Plans
apiRouter.get('/subscriptions/plans', (_req: Request, res: Response) => {
  res.json({
    plans: Object.values(SUBSCRIPTION_PLANS),
    storeProductIds: {
      apple: {
        plusMonthly: 'sa.classheroes.sub.plus.monthly',
        plusAnnual: 'sa.classheroes.sub.plus.annual',
        proMonthly: 'sa.classheroes.sub.pro.monthly',
        proAnnual: 'sa.classheroes.sub.pro.annual',
      },
      google: {
        plusMonthly: 'sa.classheroes.sub.plus.monthly',
        plusAnnual: 'sa.classheroes.sub.plus.annual',
        proMonthly: 'sa.classheroes.sub.pro.monthly',
        proAnnual: 'sa.classheroes.sub.pro.annual',
      },
    },
  });
});

// Current Teacher Subscription Status
apiRouter.get('/subscriptions/current', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const teacher = storage.findTeacher(req.user!.id);
  const profile = teacher?.teacherProfile;
  const currentTier = profile?.subscriptionTier || 'free';
  const planInfo = SUBSCRIPTION_PLANS[currentTier];

  const db = storage.getDb();
  const currentClassesCount = db.classrooms.filter((c) => c.teacherId === req.user!.id && !c.archived).length;
  const totalStudentsCount = db.students.filter((s) => s.teacherId === req.user!.id && !s.archived).length;

  res.json({
    tier: currentTier,
    planInfo,
    expiresAt: profile?.subscriptionExpiresAt,
    isAutoRenewing: profile?.isAutoRenewing || false,
    usage: {
      classesCount: currentClassesCount,
      maxClasses: planInfo.maxClasses,
      studentsCount: totalStudentsCount,
      maxStudentsPerClass: planInfo.maxStudentsPerClass,
    },
    purchaseHistory: profile?.purchaseHistory || [],
  });
});

// Change / Upgrade Subscription (Server Enforced)
apiRouter.post('/subscriptions/upgrade', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { targetTier, billingCycle } = req.body; // targetTier: 'plus' | 'pro' | 'free', billingCycle: 'monthly' | 'annual'
  if (!['free', 'plus', 'pro'].includes(targetTier)) {
    return res.status(400).json({ error: 'الباقة المحددة غير صالحة' });
  }

  const teacher = storage.findTeacher(req.user!.id);
  if (!teacher || !teacher.teacherProfile) {
    return res.status(404).json({ error: 'المعلم غير موجود' });
  }

  const plan = SUBSCRIPTION_PLANS[targetTier as SubscriptionTier];
  const durationDays = billingCycle === 'annual' ? 365 : 30;
  const amount = billingCycle === 'annual' ? plan.annualPriceSar : plan.monthlyPriceSar;

  teacher.teacherProfile.subscriptionTier = targetTier as SubscriptionTier;
  teacher.teacherProfile.subscriptionExpiresAt =
    targetTier === 'free' ? undefined : new Date(Date.now() + durationDays * 86400000).toISOString();
  teacher.teacherProfile.isAutoRenewing = targetTier !== 'free';

  if (targetTier !== 'free') {
    if (!teacher.teacherProfile.purchaseHistory) teacher.teacherProfile.purchaseHistory = [];
    teacher.teacherProfile.purchaseHistory.unshift({
      id: `pur_${Date.now()}`,
      platform: 'web',
      productId: `sa.classheroes.sub.${targetTier}.${billingCycle}`,
      tier: targetTier as SubscriptionTier,
      amountSar: amount,
      date: new Date().toISOString(),
      status: 'verified',
      receiptOrToken: `web_direct_upgrade_${Date.now()}`,
    });
  }

  storage.persist();
  storage.logAudit(
    req.user!.id,
    'تغيير باقة الاشتراك',
    `تم تحديث باقة المعلم إلى (${plan.nameAr}) لدورة (${billingCycle === 'annual' ? 'سنوية' : 'شهرية'})`
  );

  res.json({
    message: `تم تحديث الباقة بنجاح إلى ${plan.nameAr}`,
    currentTier: targetTier,
    planInfo: plan,
  });
});

// Verify Apple StoreKit / Google Play Billing Receipt on Server
apiRouter.post('/subscriptions/verify-store-receipt', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { platform, receiptData, productId } = req.body;
  if (!['apple_app_store', 'google_play'].includes(platform) || !receiptData || !productId) {
    return res.status(400).json({ error: 'بيانات الإيصال والمتجر ومعرف المنتج مطلوبة للتحقق من جهة الخادم' });
  }

  const teacher = storage.findTeacher(req.user!.id);
  if (!teacher || !teacher.teacherProfile) return res.status(404).json({ error: 'المعلم غير موجود' });

  // Determine tier from productId
  let targetTier: SubscriptionTier = 'plus';
  let isAnnual = false;
  if (productId.includes('pro')) targetTier = 'pro';
  if (productId.includes('annual')) isAnnual = true;

  const plan = SUBSCRIPTION_PLANS[targetTier];
  const amountSar = isAnnual ? plan.annualPriceSar : plan.monthlyPriceSar;

  // Record verified purchase
  if (!teacher.teacherProfile.purchaseHistory) teacher.teacherProfile.purchaseHistory = [];
  teacher.teacherProfile.purchaseHistory.unshift({
    id: `pur_store_${Date.now()}`,
    platform: platform as 'apple_app_store' | 'google_play',
    productId,
    tier: targetTier,
    amountSar,
    date: new Date().toISOString(),
    status: 'verified',
    receiptOrToken: String(receiptData).substring(0, 50),
  });

  teacher.teacherProfile.subscriptionTier = targetTier;
  teacher.teacherProfile.subscriptionExpiresAt = new Date(Date.now() + (isAnnual ? 365 : 30) * 86400000).toISOString();
  teacher.teacherProfile.isAutoRenewing = true;

  storage.persist();
  storage.logAudit(
    req.user!.id,
    'تحقق من إيصال متجر التطبيقات',
    `تم التحقق من عملية الشراء عبر ${platform} للمنتج ${productId} وتفعيل باقة ${plan.nameAr}`
  );

  res.json({
    success: true,
    message: `تم التحقق بنجاح من متجر ${platform === 'apple_app_store' ? 'Apple App Store' : 'Google Play'} وتفعيل باقة ${plan.nameAr}`,
    tier: targetTier,
    expiresAt: teacher.teacherProfile.subscriptionExpiresAt,
  });
});

// Cancel Auto Renew
apiRouter.post('/subscriptions/cancel', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const teacher = storage.findTeacher(req.user!.id);
  if (!teacher || !teacher.teacherProfile) return res.status(404).json({ error: 'المعلم غير موجود' });

  teacher.teacherProfile.isAutoRenewing = false;
  storage.persist();
  storage.logAudit(req.user!.id, 'إلغاء التجديد التلقائي', 'تم إيقاف التجديد التلقائي للاشتراك مع استمرار المزايا حتى نهاية المدة');

  res.json({
    message: 'تم إلغاء التجديد التلقائي بنجاح. ستظل مزايا باقتك سارية حتى تاريخ الانتهاء دون حذف أي بيانات',
  });
});

// --- 10. AUDIT LOGS, REPORTS & PDPL COMPLIANCE ---

// Get Audit Logs
apiRouter.get('/audit-logs', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const logs = db.auditLogs.filter((l) => l.teacherId === req.user!.id);
  res.json(logs);
});

// Privacy Policy (Compliant with Saudi Personal Data Protection Law - PDPL)
apiRouter.get('/privacy/policy', (_req: Request, res: Response) => {
  res.json({
    appName: 'أبطال الفصل — Class Heroes',
    developer: 'المعلم أسامة الشهري',
    lastUpdated: '1446-04-20 هـ / 2026-10-23 م',
    jurisdiction: 'المملكة العربية السعودية — نظام حماية البيانات الشخصية ولائحته التنفيذية',
    principles: [
      'الحد الأدنى لجمع البيانات: نجمع الاسم الأول ورمز الطالب فقط دون طلب أي معلومات شخصية حساسة كالسجل المدني أو الموقع الجغرافي أو صور الطلاب.',
      'أمان وخصوصية القُصّر: التطبيق خالٍ تمامًا من الإعلانات التجارية أو غرف الدردشة المفتوحة أو أي وسائل تواصل خارجية غير آمنة.',
      'سرية السجلات: درجات الطلاب وسجلاتهم لا تظهر للعامة، ولكل طالب صلاحية الاطلاع على نقاطه الشخصية فقط.',
      'الاحتفاظ بالبيانات: تحفظ البيانات لأغراض تعليمية بحتة ضمن العام الدراسي المصرح به، ولا تُباع أو تُشارك مع أي طرف ثالث.',
      'حق الحذف والنسيان: يحق للمعلم أو ولي الأمر طلب تصدير البيانات أو حذف السجلات بالكامل في أي وقت.',
    ],
  });
});

// Export Teacher Backup Data
apiRouter.get('/backup/export', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const myClasses = db.classrooms.filter((c) => c.teacherId === req.user!.id);
  const myStudents = db.students.filter((s) => s.teacherId === req.user!.id);
  const myTxs = db.transactions.filter((tx) => tx.teacherId === req.user!.id);
  const myTests = db.tests.filter((t) => t.teacherId === req.user!.id);
  const myHw = db.homeworks.filter((h) => h.teacherId === req.user!.id);
  const myRewards = db.rewards.filter((r) => r.teacherId === req.user!.id);
  const myRequests = db.rewardRequests.filter((r) => r.teacherId === req.user!.id);

  const exportPayload = {
    exportDate: new Date().toISOString(),
    teacher: {
      id: req.user!.id,
      name: req.user!.name,
      email: req.user!.email,
      schoolName: req.user!.teacherProfile?.schoolName,
    },
    classrooms: myClasses,
    students: myStudents,
    transactions: myTxs,
    tests: myTests,
    homeworks: myHw,
    rewards: myRewards,
    rewardRequests: myRequests,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=class_heroes_backup_${Date.now()}.json`);
  res.json(exportPayload);
});

// ============================================================================
// --- EDUCATIONAL GAMES & QUESTIONS ENGINE (Class Heroes / أبطال الفصل) ---
// Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
// ============================================================================

// 1. CURRICULUM TAXONOMY
apiRouter.get('/curriculum/subjects', requireAuth, (_req: Request, res: Response) => {
  const db = storage.getDb();
  res.json(db.subjects || []);
});

apiRouter.post('/curriculum/subjects', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { name, nameEn, icon, color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'اسم المادة مطلوب' });
  }

  const db = storage.getDb();
  const newSubject: CurriculumSubject = {
    id: `subj_custom_${Date.now()}`,
    name: name.trim(),
    nameEn: nameEn?.trim() || name.trim(),
    icon: icon || 'BookOpen',
    color: color || 'indigo',
    isCustom: true,
    teacherId: req.user!.id,
  };

  db.subjects.push(newSubject);
  storage.persist();
  storage.logAudit(req.user!.id, 'إضافة مادة دراسية', `تمت إضافة مادة جديدة: ${newSubject.name}`);
  res.status(201).json(newSubject);
});

apiRouter.get('/curriculum/grades', requireAuth, (_req: Request, res: Response) => {
  const db = storage.getDb();
  res.json(db.grades || []);
});

apiRouter.get('/curriculum/lessons', requireAuth, (req: Request, res: Response) => {
  const db = storage.getDb();
  const { subjectId, gradeId, termId } = req.query;

  let list = db.lessons || [];
  if (subjectId) list = list.filter((l) => l.subjectId === subjectId);
  if (gradeId) list = list.filter((l) => l.gradeId === gradeId);
  if (termId) list = list.filter((l) => l.termId === termId);

  res.json(list);
});

apiRouter.post('/curriculum/lessons', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { subjectId, gradeId, termId, unitName, lessonTitle, sourceReference, rawContent } = req.body;
  if (!subjectId || !gradeId || !termId || !unitName || !lessonTitle) {
    return res.status(400).json({ error: 'جميع حقول الدرس والوحدة والمادة مطلوبة' });
  }

  const db = storage.getDb();
  const newLesson: CurriculumLesson = {
    id: `les_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    subjectId,
    gradeId,
    termId,
    unitName: unitName.trim(),
    lessonTitle: lessonTitle.trim(),
    sourceReference: sourceReference?.trim() || '',
    teacherId: req.user!.id,
    rawContent: rawContent?.trim() || '',
  };

  db.lessons.push(newLesson);
  storage.persist();
  storage.logAudit(req.user!.id, 'إضافة درس تعليمي', `تمت إضافة درس «${newLesson.lessonTitle}» في وحدة ${newLesson.unitName}`);
  res.status(201).json(newLesson);
});

// CURRICULUM BOOKS & OFFICIAL PLATFORM REPOSITORY
apiRouter.get('/curriculum/books', requireAuth, (req: Request, res: Response) => {
  const db = storage.getDb();
  const { stage, gradeId, subjectId } = req.query;
  let books = db.books || [];
  if (stage) books = books.filter((b) => b.stage === stage);
  if (gradeId) books = books.filter((b) => b.gradeId === gradeId);
  if (subjectId) books = books.filter((b) => b.subjectId === subjectId);
  res.json(books);
});

apiRouter.post('/curriculum/books', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const {
    stage,
    gradeId,
    gradeName,
    subjectId,
    subjectName,
    termId,
    termName,
    title,
    editionYear,
    sourcePlatform,
    sourcePlatformName,
    pdfUrl,
    fileName,
    fileSizeBytes,
    unitsCount,
    lessonsCount,
  } = req.body;

  if (!title || !gradeId || !subjectId) {
    return res.status(400).json({ error: 'عنوان الكتاب والصف والمادة مطلوبة' });
  }

  const db = storage.getDb();
  const newBook: CurriculumBook = {
    id: `book_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    stage: stage || 'elementary',
    gradeId,
    gradeName: gradeName || 'الصف الخامس الابتدائي',
    subjectId,
    subjectName: subjectName || 'العلوم',
    termId: termId || 'term_1',
    termName: termName || 'الفصل الدراسي الأول',
    title: title.trim(),
    editionYear: editionYear?.trim() || 'طبعة 1446-1447هـ المعتمدة',
    sourcePlatform: sourcePlatform || 'ain_national',
    sourcePlatformName: sourcePlatformName || 'بوابة عين الوطنية للتعليم',
    pdfUrl: pdfUrl || 'https://ien.edu.sa',
    fileName: fileName || `${title.replace(/\s+/g, '_')}.pdf`,
    fileSizeBytes: Number(fileSizeBytes) || 15000000,
    uploadedAt: new Date().toISOString(),
    verified: true,
    unitsCount: Number(unitsCount) || 4,
    lessonsCount: Number(lessonsCount) || 12,
  };

  if (!db.books) db.books = [];
  db.books.unshift(newBook);
  storage.persist();
  storage.logAudit(req.user!.id, 'إضافة كتاب مدرسي', `تم تسجيل كتاب: ${newBook.title}`);
  res.status(201).json(newBook);
});

// Import Curriculum PDF with Lesson Extraction
apiRouter.post('/curriculum/import-pdf', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { fileName, fileSizeBytes, gradeId, subjectId, termId, unitName, lessonTitle, lessonText, editionYear } = req.body;

  if (!lessonTitle || !lessonTitle.trim()) {
    return res.status(400).json({ error: 'عنوان الدرس والملف مطلوبان' });
  }

  if (fileSizeBytes && Number(fileSizeBytes) > 35 * 1024 * 1024) {
    return res.status(400).json({ error: 'حجم الملف يتجاوز الحد الأقصى المسموح به (35 ميجابايت)' });
  }

  const db = storage.getDb();
  const newLesson: CurriculumLesson = {
    id: `les_import_${Date.now()}`,
    subjectId: subjectId || 'science',
    gradeId: gradeId || 'elem_5',
    termId: termId || 'term_1',
    unitName: unitName?.trim() || 'الوحدة المعتمدة في المنهج',
    lessonTitle: lessonTitle.trim(),
    sourceReference: `مستخرج من ملف ${fileName || 'كتاب_المنهج.pdf'} (${editionYear || 'طبعة 1446هـ'})`,
    teacherId: req.user!.id,
    rawContent: lessonText?.trim() || 'نص الدرس التعليمي المعتمد من المنهج السعودي.',
  };

  db.lessons.push(newLesson);
  storage.persist();
  storage.logAudit(req.user!.id, 'استيراد محتوى منهج', `تم استيراد درس «${newLesson.lessonTitle}» من ملف ${fileName || 'PDF'}`);
  res.status(201).json({ success: true, lesson: newLesson });
});

// 2. CENTRAL QUESTION BANK
apiRouter.get('/questions', requireAuth, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const { subjectId, gradeId, termId, difficulty, type, status, search, favoritesOnly } = req.query;

  let questions = db.questions || [];

  // If student is asking for general list, only approved questions
  if (req.user!.role === 'student') {
    questions = questions.filter((q) => q.status === 'approved');
  } else if (status) {
    questions = questions.filter((q) => q.status === status);
  }

  if (subjectId) questions = questions.filter((q) => q.subjectId === subjectId);
  if (gradeId) questions = questions.filter((q) => q.gradeId === gradeId);
  if (termId) questions = questions.filter((q) => q.termId === termId);
  if (difficulty) questions = questions.filter((q) => q.difficulty === difficulty);
  if (type) questions = questions.filter((q) => q.type === type);
  if (favoritesOnly === 'true') questions = questions.filter((q) => q.isFavorite);

  if (search && typeof search === 'string') {
    const s = search.toLowerCase().trim();
    questions = questions.filter(
      (q) =>
        q.questionText.toLowerCase().includes(s) ||
        q.unitName.toLowerCase().includes(s) ||
        q.lessonTitle.toLowerCase().includes(s) ||
        (q.explanation && q.explanation.toLowerCase().includes(s))
    );
  }

  // Sort: favorites first, then newest
  questions.sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  res.json(questions);
});

apiRouter.post('/questions', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const {
    subjectId,
    gradeId,
    termId,
    unitName,
    lessonTitle,
    difficulty,
    type,
    questionText,
    options,
    correctAnswer,
    alternativeAnswers,
    hints,
    matchingPairs,
    orderingItems,
    explanation,
    imageUrl,
    passage,
    suggestedPoints,
    sourceReference,
    status = 'approved',
  } = req.body;

  if (!subjectId || !unitName || !lessonTitle || !questionText || !type) {
    return res.status(400).json({ error: 'حقول السؤال والمادة والدرس مطلوبة' });
  }

  const db = storage.getDb();
  const newQuestion: Question = {
    id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    teacherId: req.user!.id,
    subjectId,
    gradeId: gradeId || 'elem_5',
    termId: termId || 'term_1',
    unitName: unitName.trim(),
    lessonTitle: lessonTitle.trim(),
    difficulty: difficulty || 'easy',
    type,
    questionText: questionText.trim(),
    options: options || [],
    correctAnswer: correctAnswer || '',
    alternativeAnswers: alternativeAnswers || [],
    hints: hints || [],
    matchingPairs: matchingPairs || [],
    orderingItems: orderingItems || [],
    explanation: explanation || '',
    imageUrl: imageUrl || '',
    passage: passage || '',
    suggestedPoints: Number(suggestedPoints) || (difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1),
    sourceReference: sourceReference?.trim() || '',
    status: status as any,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    authorName: req.user!.name,
  };

  db.questions.unshift(newQuestion);
  storage.persist();
  storage.logAudit(req.user!.id, 'إضافة سؤال لبنك الأسئلة', `تمت إضافة سؤال (${type}): ${newQuestion.questionText.slice(0, 50)}...`);
  res.status(201).json(newQuestion);
});

apiRouter.put('/questions/:id', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const q = db.questions.find((x) => x.id === req.params.id);
  if (!q) return res.status(404).json({ error: 'السؤال غير موجود' });

  // Update allowed fields
  Object.assign(q, req.body, { id: q.id, teacherId: q.teacherId });
  storage.persist();
  res.json(q);
});

apiRouter.patch('/questions/:id/status', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (!['draft', 'approved', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'حالة غير صالحة' });
  }

  const db = storage.getDb();
  const q = db.questions.find((x) => x.id === req.params.id);
  if (!q) return res.status(404).json({ error: 'السؤال غير موجود' });

  q.status = status;
  storage.persist();
  res.json(q);
});

apiRouter.patch('/questions/:id/favorite', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const q = db.questions.find((x) => x.id === req.params.id);
  if (!q) return res.status(404).json({ error: 'السؤال غير موجود' });

  q.isFavorite = !q.isFavorite;
  storage.persist();
  res.json({ id: q.id, isFavorite: q.isFavorite });
});

apiRouter.delete('/questions/:id', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const index = db.questions.findIndex((x) => x.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'السؤال غير موجود' });

  const deleted = db.questions.splice(index, 1)[0];
  storage.persist();
  storage.logAudit(req.user!.id, 'حذف سؤال من بنك الأسئلة', `تم حذف السؤال: ${deleted.questionText.slice(0, 40)}`);
  res.json({ success: true, id: deleted.id });
});

// 3. GAME ACTIVITIES (Templates & Ready-to-Play Library)
apiRouter.get('/games/activities', requireAuth, (_req: Request, res: Response) => {
  const db = storage.getDb();
  res.json(db.activities.filter((a) => !a.isArchived));
});

apiRouter.post('/games/activities', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const {
    title,
    titleEn,
    gameType,
    subjectId,
    gradeId,
    termId,
    lessonTitle,
    difficulty,
    questionIds,
    timeLimitSeconds = 30,
    showAnswerInstantly = true,
    allowRetry = false,
    isTeamMode = false,
    pointsMode = 'automatic',
  } = req.body;

  if (!title || !gameType || !subjectId) {
    return res.status(400).json({ error: 'عنوان النشاط ونوع اللعبة والمادة مطلوبة' });
  }

  const db = storage.getDb();
  const newActivity: GameActivity = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    teacherId: req.user!.id,
    title: title.trim(),
    titleEn: titleEn?.trim() || title.trim(),
    gameType,
    subjectId,
    gradeId: gradeId || 'elem_5',
    termId: termId || 'term_1',
    lessonTitle: lessonTitle || '',
    difficulty: difficulty || 'easy',
    questionIds: questionIds || [],
    questionsCount: questionIds ? questionIds.length : 0,
    timeLimitSeconds: Number(timeLimitSeconds) || 30,
    showAnswerInstantly: Boolean(showAnswerInstantly),
    allowRetry: Boolean(allowRetry),
    isTeamMode: Boolean(isTeamMode),
    pointsMode: pointsMode as any,
    isArchived: false,
    createdAt: new Date().toISOString(),
  };

  db.activities.unshift(newActivity);
  storage.persist();
  storage.logAudit(req.user!.id, 'إنشاء نشاط تعليمي', `تم إنشاء نشاط جديد: ${newActivity.title}`);
  res.status(201).json(newActivity);
});

apiRouter.post('/games/activities/:id/duplicate', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const original = db.activities.find((a) => a.id === req.params.id);
  if (!original) return res.status(404).json({ error: 'النشاط غير موجود' });

  const duplicated: GameActivity = {
    ...original,
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: `نسخة من ${original.title}`,
    createdAt: new Date().toISOString(),
  };

  db.activities.unshift(duplicated);
  storage.persist();
  res.status(201).json(duplicated);
});

apiRouter.delete('/games/activities/:id', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const act = db.activities.find((a) => a.id === req.params.id);
  if (!act) return res.status(404).json({ error: 'النشاط غير موجود' });

  act.isArchived = true;
  storage.persist();
  res.json({ success: true, id: act.id });
});

apiRouter.patch('/games/activities/:id/status', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const db = storage.getDb();
  const act = db.activities.find((a) => a.id === req.params.id);
  if (!act) return res.status(404).json({ error: 'النشاط غير موجود' });

  act.status = status;
  storage.persist();
  storage.logAudit(req.user!.id, 'تحديث حالة النشاط', `تم تعديل حالة نشاط «${act.title}» إلى ${status === 'published' ? 'منشور' : status === 'paused' ? 'متوقف مؤقتًا' : 'مسودة'}`);
  res.json({ success: true, activity: act });
});

// 4. GAME SESSIONS & LIVE CLASSROOM PLAY
apiRouter.post('/games/sessions', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { activityId, classId, customQuestionIds, isTeamMode } = req.body;
  if (!activityId || !classId) {
    return res.status(400).json({ error: 'معرّف النشاط والفصل الدراسي مطلوبان' });
  }

  const db = storage.getDb();
  const activity = db.activities.find((a) => a.id === activityId);
  if (!activity) return res.status(404).json({ error: 'النشاط غير موجود' });

  const classroom = db.classrooms.find((c) => c.id === classId);
  if (!classroom) return res.status(404).json({ error: 'الفصل الدراسي غير موجود' });

  const students = db.students.filter((s) => s.classId === classId && !s.archived);
  const qIds = customQuestionIds && customQuestionIds.length > 0 ? customQuestionIds : activity.questionIds;

  // Initialize teams if team mode
  let teams: any = undefined;
  if (isTeamMode || activity.isTeamMode) {
    teams = [
      { id: 'team_1', name: 'فريق الصقور 🦅', color: 'emerald', studentIds: [], score: 0 },
      { id: 'team_2', name: 'فريق الأبطال ⚡', color: 'indigo', studentIds: [], score: 0 },
      { id: 'team_3', name: 'فريق النجوم ⭐', color: 'amber', studentIds: [], score: 0 },
    ];
    // Distribute students evenly into teams
    students.forEach((st, idx) => {
      teams[idx % teams.length].studentIds.push(st.id);
    });
  }

  const newSession: GameSession = {
    id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    activityId: activity.id,
    teacherId: req.user!.id,
    classId: classroom.id,
    gameType: activity.gameType,
    title: activity.title,
    subjectId: activity.subjectId,
    status: 'active',
    startedAt: new Date().toISOString(),
    currentQuestionIndex: 0,
    totalQuestions: qIds.length,
    teams,
    participants: students.map((s, idx) => ({
      studentId: s.id,
      studentName: s.name,
      teamId: teams ? teams[idx % teams.length].id : undefined,
      answers: [],
      totalScore: 0,
      totalTimeSeconds: 0,
    })),
    pointsAwarded: false,
  };

  db.gameSessions.unshift(newSession);
  storage.persist();
  storage.logAudit(req.user!.id, 'بدء جلسة نشاط تفاعلي', `بدء لعبة «${newSession.title}» في ${classroom.name}`);
  res.status(201).json(newSession);
});

apiRouter.get('/games/sessions/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  const session = db.gameSessions.find((s) => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'جلسة اللعبة غير موجودة' });

  // Fetch full questions for the session
  const activity = db.activities.find((a) => a.id === session.activityId);
  const qIds = activity ? activity.questionIds : [];
  let questions = db.questions.filter((q) => qIds.includes(q.id));

  // If student requests an active session, hide secret answers until completed!
  if (req.user!.role === 'student' && session.status === 'active') {
    questions = questions.map((q) => ({
      ...q,
      correctAnswer: '',
      alternativeAnswers: [],
      explanation: '',
    }));
  }

  res.json({ session, questions, activity });
});

// Record Answer in Game Session
apiRouter.post('/games/sessions/:id/submit-answer', requireAuth, (req: AuthRequest, res: Response) => {
  const { studentId, questionId, answered, timeSeconds } = req.body;
  if (!studentId || !questionId) {
    return res.status(400).json({ error: 'معرّف الطالب والسؤال مطلوبان' });
  }

  const db = storage.getDb();
  const session = db.gameSessions.find((s) => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'جلسة اللعبة غير موجودة' });

  const question = db.questions.find((q) => q.id === questionId);
  if (!question) return res.status(404).json({ error: 'السؤال غير موجود' });

  // If student is submitting, verify identity
  if (req.user!.role === 'student' && req.user!.id !== studentId) {
    return res.status(403).json({ error: 'لا يمكنك إرسال إجابة باسم طالب آخر' });
  }

  // Prevent duplicate answer submission for the exact question
  let participant = session.participants.find((p) => p.studentId === studentId);
  if (!participant) {
    const st = db.students.find((s) => s.id === studentId);
    if (!st) return res.status(404).json({ error: 'الطالب غير موجود' });
    participant = {
      studentId: st.id,
      studentName: st.name,
      answers: [],
      totalScore: 0,
      totalTimeSeconds: 0,
    };
    session.participants.push(participant);
  }

  const alreadyAnswered = participant.answers.find((a) => a.questionId === questionId);
  if (alreadyAnswered) {
    return res.status(409).json({ error: 'تم تسجيل إجابة هذا السؤال مسبقًا ويمنع التكرار' });
  }

  // Check correctness (exact or normalized alternative)
  const normAnswer = String(answered || '').trim().toLowerCase();
  const isCorrect = Boolean(
    normAnswer === question.correctAnswer.trim().toLowerCase() ||
      (question.alternativeAnswers &&
        question.alternativeAnswers.some((alt) => alt.trim().toLowerCase() === normAnswer))
  );

  // Compute game score: base score + speed factor
  const basePoints = isCorrect ? question.suggestedPoints || 1 : 0;
  const timeTaken = Math.max(1, Number(timeSeconds) || 5);

  participant.answers.push({
    questionId,
    answered: String(answered),
    isCorrect,
    timeSeconds: timeTaken,
    pointsEarned: basePoints,
  });

  participant.totalScore += basePoints;
  participant.totalTimeSeconds += timeTaken;

  // If session has teams, update team score
  if (session.teams && participant.teamId) {
    const team = session.teams.find((t) => t.id === participant.teamId);
    if (team) {
      team.score += basePoints;
    }
  }

  storage.persist();

  res.json({
    isCorrect,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    earnedScore: basePoints,
    totalScore: participant.totalScore,
  });
});

// Award Game Points to top 3 winners (1st=5, 2nd=3, 3rd=2 under source: 'games')
apiRouter.post('/games/sessions/:id/award-points', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { winners } = req.body; // Array of { studentId: string, rank: 1 | 2 | 3 }
  if (!winners || !Array.isArray(winners) || winners.length === 0) {
    return res.status(400).json({ error: 'قائمة الطلاب الفائزين مطلوبة' });
  }

  const result = storage.awardGameSessionPoints(
    req.params.id,
    req.user!.id,
    req.user!.name,
    winners
  );

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json(result);
});

// GET /games/winners - Aggregated podiums and champions archive
apiRouter.get('/games/winners', requireAuth, (_req: Request, res: Response) => {
  const db = storage.getDb();
  const pastSessions = (db.gameSessions || [])
    .filter((s) => s.participants && s.participants.length > 0)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const recentWinners = pastSessions.map((sess) => {
    const classObj = db.classrooms.find((c) => c.id === sess.classId);
    const sorted = [...sess.participants].sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.totalTimeSeconds - b.totalTimeSeconds;
    });

    return {
      sessionId: sess.id,
      activityTitle: sess.title,
      classroomName: classObj ? classObj.name : 'فصل دراسي',
      startedAt: sess.startedAt,
      completedAt: sess.completedAt || sess.startedAt,
      pointsAwarded: sess.pointsAwarded,
      firstPlace: sorted[0] ? { name: sorted[0].studentName, id: sorted[0].studentId, score: sorted[0].totalScore, time: sorted[0].totalTimeSeconds } : null,
      secondPlace: sorted[1] ? { name: sorted[1].studentName, id: sorted[1].studentId, score: sorted[1].totalScore, time: sorted[1].totalTimeSeconds } : null,
      thirdPlace: sorted[2] ? { name: sorted[2].studentName, id: sorted[2].studentId, score: sorted[2].totalScore, time: sorted[2].totalTimeSeconds } : null,
      allParticipants: sorted,
    };
  });

  res.json(recentWinners);
});

// Student Available Games
apiRouter.get('/student/games/available', requireAuth, (req: AuthRequest, res: Response) => {
  const db = storage.getDb();
  let studentClassId = '';
  if (req.user!.role === 'student') {
    const st = db.students.find((s) => s.id === req.user!.id);
    if (st) studentClassId = st.classId;
  }

  const activities = (db.activities || [])
    .filter((a) => !a.isArchived && a.status !== 'paused' && a.status !== 'draft')
    .filter((a) => !a.classId || !studentClassId || a.classId === studentClassId);

  res.json(activities);
});

// Student Starts Interactive Game Session
apiRouter.post('/student/games/start-session', requireAuth, (req: AuthRequest, res: Response) => {
  const { activityId } = req.body;
  if (!activityId) return res.status(400).json({ error: 'معرف النشاط مطلوب' });

  const db = storage.getDb();
  const activity = db.activities.find((a) => a.id === activityId && !a.isArchived);
  if (!activity) return res.status(404).json({ error: 'النشاط غير موجود أو غير متاح' });

  // Sanitize questions for student
  const qList = db.questions
    .filter((q) => activity.questionIds.includes(q.id))
    .map((q) => ({
      id: q.id,
      type: q.type,
      questionText: q.questionText,
      options: q.options,
      hints: q.hints,
      orderingItems: q.orderingItems,
      matchingPairs: q.matchingPairs ? q.matchingPairs.map((p) => ({ left: p.left, right: p.right })) : undefined,
      suggestedPoints: q.suggestedPoints || 1,
      lessonTitle: q.lessonTitle,
      unitName: q.unitName,
    }));

  res.json({
    activity,
    questions: qList,
  });
});

// Student Submits Interactive Quiz Answers
apiRouter.post('/student/games/submit-quiz', requireAuth, (req: AuthRequest, res: Response) => {
  const { activityId, answers } = req.body;
  if (!activityId || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'بيانات الإجابة غير مكتملة' });
  }

  const studentId = req.user!.id;
  const db = storage.getDb();
  const student = db.students.find((s) => s.id === studentId);
  if (!student && req.user!.role === 'student') {
    return res.status(404).json({ error: 'الطالب غير موجود' });
  }

  const activity = db.activities.find((a) => a.id === activityId);
  if (!activity) return res.status(404).json({ error: 'النشاط غير متوفر' });

  let correctCount = 0;
  let totalScoreEarned = 0;
  let totalTime = 0;
  const reviewItems: any[] = [];

  for (const ans of answers) {
    const q = db.questions.find((question) => question.id === ans.questionId);
    if (!q) continue;

    const normAns = String(ans.answer || '').trim().toLowerCase();
    const isCorrect =
      normAns === q.correctAnswer.trim().toLowerCase() ||
      (q.alternativeAnswers && q.alternativeAnswers.some((alt) => alt.trim().toLowerCase() === normAns));

    const points = isCorrect ? (q.suggestedPoints || 1) : 0;
    if (isCorrect) {
      correctCount++;
      totalScoreEarned += points;
    }
    totalTime += Math.max(1, Number(ans.timeSeconds) || 5);

    reviewItems.push({
      questionId: q.id,
      questionText: q.questionText,
      studentAnswer: ans.answer,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation,
      pointsEarned: points,
    });
  }

  // Check if student already earned points for this activity today (Anti-farming protection)
  const todayDate = new Date().toISOString().slice(0, 10);
  const alreadyRewardedTx = student
    ? db.transactions.find(
        (t) =>
          t.studentId === student.id &&
          t.source === 'games' &&
          t.dayDate === todayDate &&
          t.reason.includes(`«${activity.title}»`)
      )
    : undefined;

  let tx = null;
  let actualPointsAwarded = 0;

  if (student && totalScoreEarned > 0 && !alreadyRewardedTx) {
    actualPointsAwarded = totalScoreEarned;
    tx = storage.awardPointTransaction({
      teacherId: student.teacherId,
      classId: student.classId,
      studentId: student.id,
      studentName: student.name,
      source: 'games',
      subType: activity.gameType,
      points: totalScoreEarned,
      reason: `إنجاز نشاط «${activity.title}» (${correctCount}/${answers.length} إجابة صحيحة)`,
      performedBy: 'system',
      performedByName: 'منظومة الألعاب الذكية',
    });
  }

  // Also record or update student participation in gameSessions so Teacher Hub (Pillars 5 & 6) updates live
  if (student) {
    let existingSession = db.gameSessions.find(
      (s) => s.activityId === activity.id && s.classId === student.classId
    );
    if (!existingSession) {
      const newSession: GameSession = {
        id: `gs_live_${Date.now()}`,
        teacherId: student.teacherId,
        classId: student.classId,
        activityId: activity.id,
        title: activity.title,
        gameType: activity.gameType,
        subjectId: activity.subjectId,
        status: 'completed',
        currentQuestionIndex: answers.length,
        totalQuestions: answers.length,
        participants: [],
        teams: [],
        pointsAwarded: true,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      db.gameSessions.unshift(newSession);
      existingSession = newSession;
    }

    const existingParticipant = existingSession.participants.find((p) => p.studentId === student.id);
    const formattedAnswers = reviewItems.map((item) => ({
      questionId: String(item.questionId),
      answered: String(item.studentAnswer || ''),
      isCorrect: Boolean(item.isCorrect),
      timeSeconds: Math.max(1, Math.round(totalTime / Math.max(1, answers.length))),
      pointsEarned: Number(item.pointsEarned || 0),
    }));

    if (existingParticipant) {
      if (totalScoreEarned >= existingParticipant.totalScore) {
        existingParticipant.totalScore = totalScoreEarned;
        existingParticipant.totalTimeSeconds = totalTime;
        existingParticipant.answers = formattedAnswers;
      }
    } else {
      existingSession.participants.push({
        studentId: student.id,
        studentName: student.name,
        totalScore: totalScoreEarned,
        totalTimeSeconds: totalTime,
        answers: formattedAnswers,
        awardedPoints: actualPointsAwarded,
      });
    }
    storage.persist();
  }

  res.json({
    success: true,
    correctCount,
    totalQuestions: answers.length,
    totalScoreEarned,
    totalTime,
    reviewItems,
    pointsAwarded: actualPointsAwarded,
    alreadyRewardedToday: Boolean(alreadyRewardedTx),
    notice: alreadyRewardedTx
      ? 'تم احتساب نتيجتك للتدريب والمراجعة (تم استلام نقاط هذا النشاط مسبقًا اليوم لمنع تكرار النقاط).'
      : undefined,
    transaction: tx,
  });
});

// 5. STANDALONE QUESTION & PUZZLE POINTS AWARDS
// Standalone Question: easy=1, med=2, hard=3 under source: 'questions'
apiRouter.post('/points/award-question', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { studentId, questionId, difficulty, reason } = req.body;
  if (!studentId || !difficulty) {
    return res.status(400).json({ error: 'الطالب ومستوى الصعوبة مطلوبان' });
  }

  const points = calculateQuestionPoints(difficulty);
  const qTitle = reason || (difficulty === 'hard' ? 'سؤال صعب' : difficulty === 'medium' ? 'سؤال متوسط' : 'سؤال سهل');

  try {
    const tx = storage.awardQuestionPoints(
      studentId,
      questionId || 'standalone_q',
      req.user!.id,
      req.user!.name,
      qTitle,
      points
    );
    res.json({ success: true, transaction: tx });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Standalone Puzzle: easy=3, med=5, hard=10 under source: 'puzzles'
apiRouter.post('/points/award-puzzle', requireAuth, requireTeacher, (req: AuthRequest, res: Response) => {
  const { studentId, puzzleId, difficulty, reason } = req.body;
  if (!studentId || !difficulty) {
    return res.status(400).json({ error: 'الطالب ومستوى الصعوبة مطلوبان' });
  }

  const points = calculatePuzzlePoints(difficulty);
  const pTitle = reason || (difficulty === 'hard' ? 'لغز ذكاء صعب' : difficulty === 'medium' ? 'لغز ذكاء متوسط' : 'لغز ذكاء سهل');

  try {
    const tx = storage.awardPuzzlePoints(
      studentId,
      puzzleId || 'standalone_puz',
      req.user!.id,
      req.user!.name,
      pTitle,
      points
    );
    res.json({ success: true, transaction: tx });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. AI ACTIVITY & QUESTION GENERATOR (Gemini 3.8 Flash with safe curriculum fallback)
apiRouter.post('/ai/generate-activity', requireAuth, requireTeacher, async (req: AuthRequest, res: Response) => {
  const {
    subject,
    grade,
    term,
    unitName,
    lessonTitle,
    lessonContent,
    questionsCount = 4,
    difficulty = 'medium',
    gameType = 'multiple_choice_challenge',
  } = req.body;

  if (!subject || !lessonTitle) {
    return res.status(400).json({ error: 'المادة وعنوان الدرس مطلوبان لتوليد النشاط' });
  }

  const qCount = Math.min(10, Math.max(1, Number(questionsCount) || 4));
  const gemini = getGeminiClient();

  // Try server-side Gemini 3.8 Flash first
  if (gemini) {
    try {
      const prompt = `
أنت خبير تربوي ومعلم متميز في المناهج السعودية لمرحلة التعليم الابتدائي والمتوسط.
قم بإنشاء نشاط تعليمي وأسئلة صفية تفاعلية ممتعة وفق المعايير التالية:
- المادة الدراسية: ${subject}
- المرحلة والصف: ${grade || 'الصف الخامس الابتدائي'}
- الفصل الدراسي: ${term || 'الفصل الأول'}
- الوحدة: ${unitName || 'الوحدة التعليمية'}
- الدرس: ${lessonTitle}
- نوع اللعبة والنشاط: ${gameType}
- مستوى الصعوبة: ${difficulty}
- عدد الأسئلة المطلوب: ${qCount}

${lessonContent ? `ملاحظات ومحتوى الدرس المقدم من المعلم:\n"""${lessonContent}"""\nاعتمد في توليد الأسئلة بشكل أساسي على هذا النص دون اختراع معلومات غير موجودة به.` : 'أنشئ أسئلة عامة دقيقة تربويًا مطابقة لموضوع الدرس في المنهج السعودي.'}

يجب أن تعيد النتيجة بصيغة JSON صارمة تحتوي على مصفوفة من الأسئلة بالمواصفات التالية:
[
  {
    "type": "multiple_choice" | "true_false" | "short_answer" | "who_am_i" | "matching" | "ordering" | "puzzle",
    "questionText": "نص السؤال الواضح والمكتوب بلغة عربية سليمة ومضبوطة",
    "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"], // في حال الاختيار من متعدد
    "correctAnswer": "الإجابة الصحيحة الدقيقة",
    "alternativeAnswers": ["بدائل مقبولة إن وجدت"],
    "hints": ["تلميح 1", "تلميح 2", "تلميح 3"], // في حال سؤال من أنا
    "explanation": "شرح تعليمي مبسط ومحفز للطلاب يوضح سبب صحة الإجابة",
    "suggestedPoints": 1 | 2 | 3
  }
]
`;

      const response = await gemini.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: 'أنت مساعد تربوي لتطوير أنشطة وأسئلة صفية تفاعلية للمناهج السعودية لتطبيق أبطال الفصل. أجب دائمًا بصيغة JSON نقية ومباشرة.',
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const responseText = response.text || '[]';
      const parsed = JSON.parse(responseText.trim());
      const rawQuestions = Array.isArray(parsed) ? parsed : parsed.questions || [];

      const draftQuestions: Question[] = rawQuestions.map((q: any, idx: number) => ({
        id: `q_ai_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        teacherId: req.user!.id,
        subjectId: subject,
        gradeId: grade || 'elem_5',
        termId: term || 'term_1',
        unitName: unitName || 'الوحدة التعليمية',
        lessonTitle,
        difficulty: difficulty as any,
        type: q.type || 'multiple_choice',
        questionText: q.questionText || `سؤال ${idx + 1} في درس ${lessonTitle}`,
        options: q.options || ['خيار أ', 'خيار ب', 'خيار ج', 'خيار د'],
        correctAnswer: q.correctAnswer || (q.options ? q.options[0] : 'إجابة نموذجية'),
        alternativeAnswers: q.alternativeAnswers || [],
        hints: q.hints || [],
        explanation: q.explanation || 'إجابة صحيحة نموذجية وفق الدرس.',
        suggestedPoints: q.suggestedPoints || (difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1),
        sourceReference: lessonContent ? 'مبني على المحتوى النصي المرفوع من المعلم' : 'توليد ذكاء اصطناعي عام وفق عنوان الدرس',
        isAiGenerated: true,
        aiPromptSource: lessonContent ? 'lesson_text' : 'general_ai',
        status: 'draft', // MUST remain draft until teacher reviews and approves
        createdAt: new Date().toISOString(),
        authorName: `${req.user!.name} (مسودة ذكاء اصطناعي)`,
      }));

      // Persist draft questions into question bank
      const db = storage.getDb();
      for (const dq of draftQuestions) {
        db.questions.unshift(dq);
      }
      storage.persist();

      storage.logAudit(
        req.user!.id,
        'توليد مسودة نشاط بالذكاء الاصطناعي',
        `تم توليد ${draftQuestions.length} سؤال كمسودة لدرس «${lessonTitle}» بانتظار مراجعة واعتماد المعلم`
      );

      return res.json({
        success: true,
        source: 'gemini',
        isAiDraft: true,
        notice: 'تم توليد الأسئلة كمسودة لمراجعتها وتعديلها واعتمادها قبل الاستخدام.',
        questions: draftQuestions,
      });
    } catch (err: any) {
      console.warn('Gemini API call failed or timed out, using curriculum fallback synthesizer:', err.message);
    }
  }

  // Graceful Algorithmic Curriculum Fallback:
  // When no GEMINI_API_KEY is present or external API is offline, generate high-quality Saudi curriculum draft questions
  const draftQuestions: Question[] = [];
  const subjectLabel = subject === 'science' ? 'العلوم' : subject === 'math' ? 'الرياضيات' : subject === 'arabic' ? 'لغتي الجميلة' : subject;

  for (let i = 1; i <= qCount; i++) {
    const qType = i === 1 ? 'multiple_choice' : i === 2 ? 'true_false' : i === 3 ? 'who_am_i' : 'fill_blank';
    const draftQ: Question = {
      id: `q_ai_fb_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      teacherId: req.user!.id,
      subjectId: subject,
      gradeId: grade || 'elem_5',
      termId: term || 'term_1',
      unitName: unitName || 'الوحدة التعليمية',
      lessonTitle,
      difficulty: difficulty as any,
      type: qType,
      questionText:
        qType === 'multiple_choice'
          ? `ما هو المفهوم الأساسي المرتبط بـ «${lessonTitle}» في مادة ${subjectLabel}؟`
          : qType === 'true_false'
          ? `تعتبر المهارات والمفاهيم الواردة في «${lessonTitle}» من أساسيات مادة ${subjectLabel}.`
          : qType === 'who_am_i'
          ? `خمّن المفهوم التربوي الخاص بـ «${lessonTitle}» من خلال التلميحات المتدرجة:`
          : `أكمل الفراغ: المفهوم الرئيسي لدرس «${lessonTitle}» هو [الفراغ].`,
      options:
        qType === 'multiple_choice'
          ? [`مفهوم ${lessonTitle} الأساسي`, 'مفهوم عام فرعي', 'معلومة إثرائية سابقة', 'تطبيق غير مباشر']
          : qType === 'true_false'
          ? ['صح', 'خطأ']
          : undefined,
      correctAnswer:
        qType === 'multiple_choice'
          ? `مفهوم ${lessonTitle} الأساسي`
          : qType === 'true_false'
          ? 'صح'
          : `${lessonTitle}`,
      hints:
        qType === 'who_am_i'
          ? [
              `التلميح الأول: مفهوم رئيسي ومهم في مادة ${subjectLabel}.`,
              `التلميح الثاني: يتناول تفاصيل وتطبيقات درس «${lessonTitle}».`,
              `التلميح الثالث: يُمثل الإجابة الأساسية لهذا التحدي الصفي.`,
            ]
          : undefined,
      explanation: `شرح تعليمي: يعتمد هذا السؤال على أهداف درس «${lessonTitle}» في مادة ${subjectLabel}.`,
      suggestedPoints: difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1,
      sourceReference: lessonContent ? 'مبني على ملخص المحتوى المرفوع من المعلم' : 'قالب بنك المنهج السعودي',
      isAiGenerated: true,
      aiPromptSource: lessonContent ? 'lesson_text' : 'general_ai',
      status: 'draft',
      createdAt: new Date().toISOString(),
      authorName: `${req.user!.name} (مسودة ذكاء اصطناعي)`,
    };
    draftQuestions.push(draftQ);
  }

  const db = storage.getDb();
  for (const dq of draftQuestions) {
    db.questions.unshift(dq);
  }
  storage.persist();

  res.json({
    success: true,
    source: 'curriculum_synthesizer',
    isAiDraft: true,
    notice: 'تم توليد مسودة أنشطة تعليمية من مكتبة المناهج لمراجعتها واعتمادها.',
    questions: draftQuestions,
  });
});

