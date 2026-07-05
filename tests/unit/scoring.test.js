// tests/unit/scoring.test.js (T035) — advance vs retry at threshold boundaries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreShift } from '../../engine/scoring.js';

const threshold = { minAccuracy: 0.8, maxSecurityIncidents: 1, minMorale: 60 };

test('advance when all bounds are met exactly at the boundary', () => {
  const r = scoreShift({ correct: 8, total: 10, morale: 60, securityIncidents: 1 }, threshold);
  assert.equal(r.outcome, 'advance');
  assert.equal(r.reasons.length, 0);
});

test('retry when accuracy is just below the minimum', () => {
  const r = scoreShift({ correct: 7, total: 10, morale: 100, securityIncidents: 0 }, threshold);
  assert.equal(r.outcome, 'retry');
});

test('retry when security incidents exceed the cap', () => {
  const r = scoreShift({ correct: 10, total: 10, morale: 100, securityIncidents: 2 }, threshold);
  assert.equal(r.outcome, 'retry');
});

test('retry when morale falls below the minimum', () => {
  const r = scoreShift({ correct: 10, total: 10, morale: 59, securityIncidents: 0 }, threshold);
  assert.equal(r.outcome, 'retry');
});

test('accuracy is 0 for an empty shift and reasons are human-readable', () => {
  const r = scoreShift({ correct: 0, total: 0, morale: 100, securityIncidents: 0 }, threshold);
  assert.equal(r.outcome, 'retry');
  assert.ok(r.detail.length > 0);
});
