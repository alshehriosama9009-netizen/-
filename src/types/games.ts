/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * Educational Games & Questions Domain Types
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

export type GameType =
  | 'multiple_choice_challenge' // 1. تحدي الاختيارات
  | 'true_false_blitz'          // 2. صح أم خطأ
  | 'lucky_wheel'               // 3. عجلة الحظ التعليمية
  | 'who_is_fastest'            // 4. من الأسرع؟
  | 'who_am_i'                  // 5. من أنا؟
  | 'match_pairs'               // 6. طابق الإجابات
  | 'card_ordering'             // 7. ترتيب البطاقات
  | 'fill_blank'                // 8. أكمل الفراغ
  | 'treasure_hunt'             // 9. الكنز التعليمي
  | 'team_challenge'            // 10. التحدي الجماعي
  | 'speed_race'                // 11. سباق الإجابات
  | 'puzzle_of_day';            // 12. لغز اليوم

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'fill_blank'
  | 'matching'
  | 'ordering'
  | 'who_am_i'
  | 'image_based'
  | 'passage_based'
  | 'puzzle';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'draft' | 'approved' | 'archived';

export interface MatchingPair {
  left: string;
  right: string;
}

export interface Question {
  id: string;
  teacherId: string;
  subjectId: string;
  gradeId: string;
  termId: string;
  unitName: string;
  lessonTitle: string;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  questionText: string;
  options?: string[];
  correctAnswer: string;
  alternativeAnswers?: string[];
  hints?: string[]; // for who_am_i
  matchingPairs?: MatchingPair[]; // for matching
  orderingItems?: string[]; // for card ordering
  explanation: string;
  imageUrl?: string;
  passage?: string;
  suggestedPoints: number;
  sourceReference?: string;
  isAiGenerated?: boolean;
  aiPromptSource?: 'lesson_text' | 'general_ai';
  status: QuestionStatus;
  isFavorite?: boolean;
  createdAt: string;
  authorName: string;
}

export interface CurriculumSubject {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  isCustom?: boolean;
  teacherId?: string;
}

export interface CurriculumGrade {
  id: string;
  stage: 'elementary' | 'middle' | 'high';
  name: string;
  nameEn: string;
}

export interface CurriculumLesson {
  id: string;
  subjectId: string;
  gradeId: string;
  termId: string;
  unitName: string;
  lessonTitle: string;
  sourceReference?: string;
  teacherId?: string;
  rawContent?: string;
}

export interface CurriculumBook {
  id: string;
  stage: 'elementary' | 'middle' | 'high';
  gradeId: string;
  gradeName: string;
  subjectId: string;
  subjectName: string;
  termId: string;
  termName: string;
  title: string;
  editionYear: string;
  sourcePlatform: 'ain_national' | 'manhaji' | 'kutobi' | 'teacher_upload';
  sourcePlatformName: string;
  pdfUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  uploadedAt: string;
  verified: boolean;
  unitsCount: number;
  lessonsCount: number;
}

export type ActivityStatus = 'published' | 'paused' | 'draft';

export interface GameActivity {
  id: string;
  teacherId: string;
  classId?: string;
  title: string;
  titleEn?: string;
  gameType: GameType;
  subjectId: string;
  gradeId: string;
  termId: string;
  lessonTitle?: string;
  difficulty: QuestionDifficulty;
  questionIds: string[];
  questionsCount: number;
  timeLimitSeconds: number;
  showAnswerInstantly: boolean;
  allowRetry: boolean;
  isTeamMode: boolean;
  pointsMode: 'automatic' | 'teacher_approved';
  status?: ActivityStatus;
  isArchived: boolean;
  createdAt: string;
}

export interface GameParticipantAnswer {
  questionId: string;
  answered: string;
  isCorrect: boolean;
  timeSeconds: number;
  pointsEarned: number;
}

export interface GameParticipant {
  studentId: string;
  studentName: string;
  teamId?: string;
  answers: GameParticipantAnswer[];
  totalScore: number;
  totalTimeSeconds: number;
  rank?: number;
  awardedPoints?: number;
  transactionId?: string;
}

export interface GameTeam {
  id: string;
  name: string;
  color: string;
  studentIds: string[];
  score: number;
}

export interface GameSession {
  id: string;
  activityId: string;
  teacherId: string;
  classId: string;
  gameType: GameType;
  title: string;
  subjectId: string;
  status: 'active' | 'completed' | 'paused';
  startedAt: string;
  completedAt?: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  teams?: GameTeam[];
  participants: GameParticipant[];
  pointsAwarded: boolean;
  awardedAt?: string;
}
