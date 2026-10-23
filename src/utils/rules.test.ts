/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
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
  computeLedger,
} from './rules.ts';

test('1. Behavior points: 1 point each, and daily limit is strictly 3', () => {
  assert.equal(calculateBehaviorPoints('quiet_etiquette'), 1);
  assert.equal(calculateBehaviorPoints('teacher_instructions'), 1);
  assert.equal(calculateBehaviorPoints('cooperation_cleanliness'), 1);

  // Student has 0 today, awards 2 -> allowed, 2 awarded
  const check1 = canAwardBehaviorPoints(0, 2);
  assert.equal(check1.allowed, true);
  assert.equal(check1.pointsAwardable, 2);

  // Student already has 2 today, attempts to award 2 -> capped at 1 point to reach 3
  const check2 = canAwardBehaviorPoints(2, 2);
  assert.equal(check2.allowed, true);
  assert.equal(check2.pointsAwardable, 1);

  // Student already has 3 today, attempts to award 1 -> rejected
  const check3 = canAwardBehaviorPoints(3, 1);
  assert.equal(check3.allowed, false);
  assert.equal(check3.pointsAwardable, 0);
});

test('2. Participation points: 1 for simple, 2 for distinguished', () => {
  assert.equal(calculateParticipationPoints('simple'), 1);
  assert.equal(calculateParticipationPoints('distinguished'), 2);
});

test('3. Game points: 1st=5, 2nd=3, 3rd=2', () => {
  assert.equal(calculateGamePoints(1), 5);
  assert.equal(calculateGamePoints(2), 3);
  assert.equal(calculateGamePoints(3), 2);
});

test('4. Question points: easy=1, medium=2, hard=3', () => {
  assert.equal(calculateQuestionPoints('easy'), 1);
  assert.equal(calculateQuestionPoints('medium'), 2);
  assert.equal(calculateQuestionPoints('hard'), 3);
});

test('5. Puzzle points: easy=3, medium=5, hard=10', () => {
  assert.equal(calculatePuzzlePoints('easy'), 3);
  assert.equal(calculatePuzzlePoints('medium'), 5);
  assert.equal(calculatePuzzlePoints('hard'), 10);
});

test('6. Test points boundary validation (out of 20)', () => {
  // [19, 20] => 10 points
  assert.equal(calculateTestPoints(20), 10);
  assert.equal(calculateTestPoints(19.5), 10);
  assert.equal(calculateTestPoints(19.0), 10);

  // [17, 19) => 7 points
  assert.equal(calculateTestPoints(18.9), 7);
  assert.equal(calculateTestPoints(18), 7);
  assert.equal(calculateTestPoints(17), 7);

  // [15, 17) => 5 points
  assert.equal(calculateTestPoints(16.9), 5);
  assert.equal(calculateTestPoints(16), 5);
  assert.equal(calculateTestPoints(15), 5);

  // [10, 15) => 3 points
  assert.equal(calculateTestPoints(14.9), 3);
  assert.equal(calculateTestPoints(12), 3);
  assert.equal(calculateTestPoints(10), 3);

  // < 10 => 1 point
  assert.equal(calculateTestPoints(9.9), 1);
  assert.equal(calculateTestPoints(5), 1);
  assert.equal(calculateTestPoints(0), 1);
});

test('7. Homework points & on-time bonus with max 5 cap', () => {
  // many errors (1) without bonus
  const hw1 = calculateHomeworkPoints('many_errors', false);
  assert.equal(hw1.totalPoints, 1);
  assert.equal(hw1.onTimeBonus, 0);

  // many errors (1) with bonus (+1) => 2
  const hw2 = calculateHomeworkPoints('many_errors', true);
  assert.equal(hw2.totalPoints, 2);
  assert.equal(hw2.onTimeBonus, 1);

  // minor errors (3) without bonus => 3
  const hw3 = calculateHomeworkPoints('minor_errors', false);
  assert.equal(hw3.totalPoints, 3);

  // minor errors (3) with bonus (+1) => 4
  const hw4 = calculateHomeworkPoints('minor_errors', true);
  assert.equal(hw4.totalPoints, 4);

  // complete & correct (5) without bonus => 5
  const hw5 = calculateHomeworkPoints('complete_correct', false);
  assert.equal(hw5.totalPoints, 5);

  // complete & correct (5) with on-time bonus (+1) => STRICTLY CAPPED AT 5
  const hw6 = calculateHomeworkPoints('complete_correct', true);
  assert.equal(hw6.totalPoints, 5);
  assert.equal(hw6.onTimeBonus, 0); // capped at 5 total
});

test('8. Subscription tier limits enforcement', () => {
  // Free tier: max 1 class, 30 students
  assert.equal(canCreateClassForTier(0, 'free'), true);
  assert.equal(canCreateClassForTier(1, 'free'), false);
  assert.equal(canAddStudentForTier(29, 'free'), true);
  assert.equal(canAddStudentForTier(30, 'free'), false);

  // Plus tier: max 5 classes, 150 students
  assert.equal(canCreateClassForTier(4, 'plus'), true);
  assert.equal(canCreateClassForTier(5, 'plus'), false);
  assert.equal(canAddStudentForTier(149, 'plus'), true);
  assert.equal(canAddStudentForTier(150, 'plus'), false);

  // Pro tier: max 10 classes
  assert.equal(canCreateClassForTier(9, 'pro'), true);
  assert.equal(canCreateClassForTier(10, 'pro'), false);
});

test('9. Ledger calculations: reward redemption does NOT reduce historical achievement', () => {
  const ledger = computeLedger([
    { type: 'earned', points: 50 },
    { type: 'earned', points: 30 },
    { type: 'spent', points: 40 }, // bought a reward
  ]);

  assert.equal(ledger.totalEarned, 80);
  assert.equal(ledger.totalSpent, 40);
  assert.equal(ledger.availableBalance, 40); // 80 - 40 = 40
  // Historical achievement remains 80 for rank and badges!
  assert.equal(ledger.historicalAchievement, 80);
});
