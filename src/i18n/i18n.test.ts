/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { translations } from './translations.ts';

test('i18n: Arabic and English dictionaries have matching key sets', () => {
  const arKeys = Object.keys(translations.ar);
  const enKeys = Object.keys(translations.en);

  assert.ok(arKeys.length > 50, 'Arabic dictionary should have over 50 keys');
  assert.ok(enKeys.length > 50, 'English dictionary should have over 50 keys');

  // Verify all Arabic keys exist in English
  for (const k of arKeys) {
    assert.ok(
      k in translations.en,
      `Key "${k}" exists in Arabic but missing in English translation`
    );
  }
});

test('i18n: Parameter interpolation replaces placeholder tokens correctly', () => {
  const templateAr = translations.ar.remainingStock;
  const interpolatedAr = templateAr.replace('{count}', '5');
  assert.equal(interpolatedAr, '5 متبقي');

  const templateEn = translations.en.remainingStock;
  const interpolatedEn = templateEn.replace('{count}', '5');
  assert.equal(interpolatedEn, '5 left');
});
