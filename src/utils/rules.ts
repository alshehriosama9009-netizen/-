/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * Core Rules, Points Conversion & Subscription Tier Constraints
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

export type PointSource =
  | 'behavior'
  | 'participation'
  | 'games'
  | 'questions'
  | 'puzzles'
  | 'tests'
  | 'homework';

export type BehaviorCriterion =
  | 'quiet_etiquette' // الالتزام بالهدوء وآداب الفصل (1)
  | 'teacher_instructions' // اتباع تعليمات المعلم (1)
  | 'cooperation_cleanliness'; // التعاون والمحافظة على البيئة الصفية (1)

export type ParticipationLevel =
  | 'simple' // مشاركة بسيطة (1)
  | 'distinguished'; // مشاركة صحيحة أو متميزة (2)

export type GameRank = 1 | 2 | 3;

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type PuzzleDifficulty = 'easy' | 'medium' | 'hard';

export type HomeworkQuality =
  | 'many_errors' // أخطاء كثيرة (1)
  | 'minor_errors' // أخطاء بسيطة (3)
  | 'complete_correct'; // مكتمل وصحيح (5)

export type SubscriptionTier = 'free' | 'plus' | 'pro';

export interface SubscriptionPlanInfo {
  id: SubscriptionTier;
  nameAr: string;
  nameEn: string;
  monthlyPriceSar: number;
  annualPriceSar: number;
  maxClasses: number;
  maxStudentsPerClass: number;
  canExportReports: boolean;
  hasAdvancedAnalytics: boolean;
  hasInteractiveTools: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlanInfo> = {
  free: {
    id: 'free',
    nameAr: 'الباقة المجانية',
    nameEn: 'Free Plan',
    monthlyPriceSar: 0,
    annualPriceSar: 0,
    maxClasses: 1,
    maxStudentsPerClass: 30,
    canExportReports: false,
    hasAdvancedAnalytics: false,
    hasInteractiveTools: false,
  },
  plus: {
    id: 'plus',
    nameAr: 'المعلم بلس',
    nameEn: 'Teacher Plus',
    monthlyPriceSar: 9.99,
    annualPriceSar: 99,
    maxClasses: 5,
    maxStudentsPerClass: 150,
    canExportReports: true,
    hasAdvancedAnalytics: false,
    hasInteractiveTools: true,
  },
  pro: {
    id: 'pro',
    nameAr: 'المعلم برو',
    nameEn: 'Teacher Pro',
    monthlyPriceSar: 14.99,
    annualPriceSar: 149,
    maxClasses: 10,
    maxStudentsPerClass: 500,
    canExportReports: true,
    hasAdvancedAnalytics: true,
    hasInteractiveTools: true,
  },
};

/**
 * 1. Calculate behavior points. Max 3 points per student per day.
 */
export function calculateBehaviorPoints(criterion: BehaviorCriterion): number {
  switch (criterion) {
    case 'quiet_etiquette':
      return 1;
    case 'teacher_instructions':
      return 1;
    case 'cooperation_cleanliness':
      return 1;
    default:
      return 0;
  }
}

export const DAILY_BEHAVIOR_MAX_POINTS = 3;

/**
 * Check if today's behavior points exceed the 3-point daily limit
 */
export function canAwardBehaviorPoints(
  currentTodayBehaviorPoints: number,
  pointsToAdd: number
): { allowed: boolean; pointsAwardable: number; messageAr: string } {
  const remaining = Math.max(0, DAILY_BEHAVIOR_MAX_POINTS - currentTodayBehaviorPoints);
  if (remaining <= 0) {
    return {
      allowed: false,
      pointsAwardable: 0,
      messageAr: 'تم استنفاد الحد اليومي لنقاط السلوك (3 نقاط كحد أقصى يوميًا للطالب)',
    };
  }
  const pointsAwardable = Math.min(remaining, pointsToAdd);
  return {
    allowed: pointsAwardable > 0,
    pointsAwardable,
    messageAr:
      pointsAwardable < pointsToAdd
        ? `سيتم منح ${pointsAwardable} نقطة فقط للالتزام بالحد اليومي الأقصى (3 نقاط)`
        : 'تم التحقق بنجاح من الحد اليومي للسلوك',
  };
}

/**
 * 2. Calculate participation points
 * simple = 1, distinguished = 2
 */
export function calculateParticipationPoints(level: ParticipationLevel): number {
  return level === 'distinguished' ? 2 : 1;
}

/**
 * 3. Calculate games points
 * 1st place: 5, 2nd: 3, 3rd: 2
 */
export function calculateGamePoints(rank: GameRank): number {
  if (rank === 1) return 5;
  if (rank === 2) return 3;
  if (rank === 3) return 2;
  return 0;
}

/**
 * 4. Calculate question points
 * easy: 1, medium: 2, hard: 3
 */
export function calculateQuestionPoints(difficulty: QuestionDifficulty): number {
  switch (difficulty) {
    case 'easy':
      return 1;
    case 'medium':
      return 2;
    case 'hard':
      return 3;
    default:
      return 1;
  }
}

/**
 * 5. Calculate puzzle points
 * easy: 3, medium: 5, hard: 10
 */
export function calculatePuzzlePoints(difficulty: PuzzleDifficulty): number {
  switch (difficulty) {
    case 'easy':
      return 3;
    case 'medium':
      return 5;
    case 'hard':
      return 10;
    default:
      return 3;
  }
}

/**
 * 6. Calculate test/quiz points based on score out of 20
 * [19, 20] => 10 points
 * [17, 19) => 7 points
 * [15, 17) => 5 points
 * [10, 15) => 3 points
 * < 10 => 1 point (for real attempt)
 */
export function calculateTestPoints(scoreOutOf20: number, hasAttempted = true): number {
  if (!hasAttempted || scoreOutOf20 < 0) return 0;
  if (scoreOutOf20 >= 19 && scoreOutOf20 <= 20) return 10;
  if (scoreOutOf20 >= 17 && scoreOutOf20 < 19) return 7;
  if (scoreOutOf20 >= 15 && scoreOutOf20 < 17) return 5;
  if (scoreOutOf20 >= 10 && scoreOutOf20 < 15) return 3;
  return 1; // أقل من 10 مع وجود محاولة فعلية
}

/**
 * 7. Calculate homework points
 * many errors = 1, minor errors = 3, complete & correct = 5
 * on-time bonus = +1, but capped at 5 total!
 */
export function calculateHomeworkPoints(
  quality: HomeworkQuality,
  submittedOnTime = false
): { basePoints: number; onTimeBonus: number; totalPoints: number } {
  let basePoints = 1;
  if (quality === 'minor_errors') basePoints = 3;
  if (quality === 'complete_correct') basePoints = 5;

  const rawBonus = submittedOnTime ? 1 : 0;
  // الحد الأعلى الإجمالي للواجب هو 5 نقاط، شاملًا مكافأة التسليم في الوقت المحدد
  const totalPoints = Math.min(5, basePoints + rawBonus);
  const effectiveBonus = totalPoints - basePoints;

  return {
    basePoints,
    onTimeBonus: effectiveBonus,
    totalPoints,
  };
}

/**
 * Validate teacher class limit for tier
 */
export function canCreateClassForTier(currentClassCount: number, tier: SubscriptionTier): boolean {
  const plan = SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.free;
  return currentClassCount < plan.maxClasses;
}

/**
 * Validate student count limit in class for tier
 */
export function canAddStudentForTier(currentStudentCount: number, tier: SubscriptionTier): boolean {
  const plan = SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.free;
  return currentStudentCount < plan.maxStudentsPerClass;
}

/**
 * Audit ledger computation
 */
export interface LedgerBalances {
  availableBalance: number;
  totalEarned: number;
  totalSpent: number;
  historicalAchievement: number;
}

export function computeLedger(
  transactions: Array<{ type: 'earned' | 'spent' | 'adjustment'; points: number }>
): LedgerBalances {
  let totalEarned = 0;
  let totalSpent = 0;

  for (const tx of transactions) {
    if (tx.type === 'earned') {
      totalEarned += Math.max(0, tx.points);
    } else if (tx.type === 'spent') {
      totalSpent += Math.max(0, tx.points);
    } else if (tx.type === 'adjustment') {
      if (tx.points > 0) {
        totalEarned += tx.points;
      } else {
        totalSpent += Math.abs(tx.points);
      }
    }
  }

  const availableBalance = Math.max(0, totalEarned - totalSpent);
  // Historical achievement is NEVER decreased by reward purchases!
  const historicalAchievement = totalEarned;

  return {
    availableBalance,
    totalEarned,
    totalSpent,
    historicalAchievement,
  };
}
