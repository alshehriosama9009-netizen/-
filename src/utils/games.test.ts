/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * Educational Games & Questions Pure Logic Unit Tests
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGamePoints,
  calculateQuestionPoints,
  calculatePuzzlePoints,
} from './rules.ts';

test('Games Points Rules: 1st=5, 2nd=3, 3rd=2', () => {
  assert.equal(calculateGamePoints(1), 5, '1st place must receive exactly 5 points');
  assert.equal(calculateGamePoints(2), 3, '2nd place must receive exactly 3 points');
  assert.equal(calculateGamePoints(3), 2, '3rd place must receive exactly 2 points');
});

test('Standalone Questions Points: easy=1, medium=2, hard=3', () => {
  assert.equal(calculateQuestionPoints('easy'), 1, 'Easy question gives 1 pt');
  assert.equal(calculateQuestionPoints('medium'), 2, 'Medium question gives 2 pts');
  assert.equal(calculateQuestionPoints('hard'), 3, 'Hard question gives 3 pts');
});

test('Standalone Puzzles Points: easy=3, medium=5, hard=10', () => {
  assert.equal(calculatePuzzlePoints('easy'), 3, 'Easy puzzle gives 3 pts');
  assert.equal(calculatePuzzlePoints('medium'), 5, 'Medium puzzle gives 5 pts');
  assert.equal(calculatePuzzlePoints('hard'), 10, 'Hard puzzle gives 10 pts');
});

test('Fill in the blank & short answer: normalization & alternative matches', () => {
  const normalize = (text: string) => text.trim().toLowerCase().replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه');
  const target = 'الملك عبدالعزيز';
  const alternatives = ['الملك عبد العزيز', 'عبدالعزيز ال سعود', 'الملك عبدالعزيز ال سعود'];

  const studentInput1 = '  الملك عبد العزيز ';
  const studentInput2 = 'الملك عبدالعزيز';
  const studentWrong = 'الملك فهد';

  const matches = (input: string) => {
    const norm = normalize(input);
    if (norm === normalize(target)) return true;
    return alternatives.some((alt) => normalize(alt) === norm);
  };

  assert.equal(matches(studentInput1), true, 'Alternative match with space should be accepted');
  assert.equal(matches(studentInput2), true, 'Exact match should be accepted');
  assert.equal(matches(studentWrong), false, 'Wrong answer must be rejected');
});

test('Card ordering verification', () => {
  const correctOrder = ['البيضة', 'اليرقة', 'العذراء', 'الفراشة'];
  const studentOrderCorrect = ['البيضة', 'اليرقة', 'العذراء', 'الفراشة'];
  const studentOrderWrong = ['اليرقة', 'البيضة', 'العذراء', 'الفراشة'];

  const checkOrder = (arr: string[]) => arr.join(',') === correctOrder.join(',');

  assert.equal(checkOrder(studentOrderCorrect), true, 'Correct sequence accepted');
  assert.equal(checkOrder(studentOrderWrong), false, 'Incorrect sequence rejected');
});

test('Matching pairs verification', () => {
  const expectedPairs: Record<string, string> = {
    'CPU': 'المعالج',
    'RAM': 'الذاكرة المؤقتة',
  };

  const studentMatchesCorrect: Record<string, string> = {
    'CPU': 'المعالج',
    'RAM': 'الذاكرة المؤقتة',
  };

  const studentMatchesWrong: Record<string, string> = {
    'CPU': 'الذاكرة المؤقتة',
    'RAM': 'المعالج',
  };

  const verifyMatching = (submitted: Record<string, string>) => {
    return Object.keys(expectedPairs).every((key) => submitted[key] === expectedPairs[key]);
  };

  assert.equal(verifyMatching(studentMatchesCorrect), true);
  assert.equal(verifyMatching(studentMatchesWrong), false);
});
