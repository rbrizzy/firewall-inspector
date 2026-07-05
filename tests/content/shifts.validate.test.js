// tests/content/shifts.validate.test.js
// T021: every authored packet has a single correct verdict + sources present.
// T028: taught-before-tested holds across shifts (and a violation is detected).
// T045: no packet requires rawPayload to reach the correct verdict (SC-012).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateContent } from '../../engine/validators.js';
import { evaluateVerdict } from '../../engine/verdict.js';

const here = dirname(fileURLToPath(import.meta.url));
const shiftsDir = join(here, '..', '..', 'data', 'shifts');

function loadShifts() {
  return readdirSync(shiftsDir)
    .filter((f) => /^day-\d{2}\.json$/.test(f))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(shiftsDir, f), 'utf8')));
}

const shifts = loadShifts();

test('there is authored content to validate', () => {
  assert.ok(shifts.length >= 1, 'expected at least one day-NN.json shift');
});

test('all authored content passes every invariant (validateContent)', () => {
  const report = validateContent(shifts);
  assert.ok(report.ok, `content invariants violated:\n${report.errors.join('\n')}`);
});

test('every packet resolves to exactly one ALLOW/DENY verdict (SC-002)', () => {
  for (const shift of shifts) {
    for (const packet of shift.queue) {
      const r = evaluateVerdict(shift.ruleset, packet);
      assert.ok(r.verdict === 'ALLOW' || r.verdict === 'DENY',
        `${shift.id}/${packet.id} did not resolve to a single verdict`);
    }
  }
});

test('every technique-bearing packet carries a source (SC-009)', () => {
  for (const shift of shifts) {
    for (const packet of shift.queue) {
      if ((packet.techniques || []).length > 0) {
        assert.ok(packet.source && packet.source.ref,
          `${shift.id}/${packet.id} uses a technique but has no source`);
      }
    }
  }
});

test('no packet needs rawPayload to reach the correct verdict (SC-012)', () => {
  // The engine never reads rawPayload; verdict must be identical with it removed.
  for (const shift of shifts) {
    for (const packet of shift.queue) {
      const withRaw = evaluateVerdict(shift.ruleset, packet).verdict;
      const withoutRaw = evaluateVerdict(shift.ruleset, { ...packet, rawPayload: null }).verdict;
      assert.equal(withRaw, withoutRaw, `${shift.id}/${packet.id} verdict depends on rawPayload`);
    }
  }
});

test('taught-before-tested: a technique used before its introducing shift is rejected (T028)', () => {
  // Construct a deliberately broken pair of shifts and assert the validator flags it.
  const broken = [
    {
      id: 'day-01', index: 1,
      briefing: { title: 't', body: 'b', introducesConcepts: [] },
      ruleset: { defaultVerdict: 'ALLOW', rules: [] },
      queue: [{
        id: 'x', srcAddress: '203.0.113.1', dstAddress: '10.0.0.1', srcPort: 1, dstPort: 1,
        protocol: 'TCP', flags: [], payloadIndicators: [], rawPayload: null,
        techniques: ['spoofed-source'], groundTruth: 'malicious', expectedSource: '10.0.0.9',
        fragmentGroup: null, narrative: null,
        source: { kind: 'TECHNIQUE', ref: 'T1036', shownToPlayer: true },
      }],
      passThreshold: { minAccuracy: 0.8, maxSecurityIncidents: 1, minMorale: 60 },
      introducesConcepts: [],
    },
  ];
  const report = validateContent(broken);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((e) => e.includes('spoofed-source')),
    'expected a taught-before-tested error for spoofed-source');
});

test('narrative packets assert correctVerdictUnchanged (FR-012)', () => {
  for (const shift of shifts) {
    for (const packet of shift.queue) {
      if (packet.narrative) {
        assert.equal(packet.narrative.correctVerdictUnchanged, true,
          `${shift.id}/${packet.id} narrative must set correctVerdictUnchanged:true`);
      }
    }
  }
});
