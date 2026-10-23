/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PointSource, SubscriptionTier, HomeworkQuality, SubscriptionPlanInfo } from '../utils/rules.ts';

export type UserRole = 'teacher' | 'student';

export interface UserProfile {
  id: string;
  email?: string;
  name: string;
  role: UserRole;
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
    className?: string;
    studentCode: string;
    teacherName?: string;
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
  studentCount?: number;
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
  date: string;
  dayDate: string;
  isAdjustment?: boolean;
  correctionOfId?: string;
  correctionReason?: string;
}

export interface RewardItem {
  id: string;
  teacherId: string;
  title: string;
  costPoints: number;
  description: string;
  icon: string;
  stock: number | null;
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
  maxScore: number;
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
