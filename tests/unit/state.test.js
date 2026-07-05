// tests/unit/state.test.js (T053) — save-state boot robustness + state-machine flow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameState, PHASES, SAVE_KEY, SAVE_VERSION } from '../../engine/state.js';

/** Minimal in-memory localStorage-like stub. */
function fakeStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _dump: () => Object.fromEntries(map),
  };
}

/** Two-shift fixture: day 1 always passable, day 2 has a deny rule. */
function fixtureShifts() {
  const mk = (index, extraRule) => ({
    id: `day-0${index}`, index,
    briefing: { title: `d${index}`, body: 'b', introducesConcepts: index === 1 ? ['dstPort-rule', 'protocol-rule'] : [] },
    ruleset: {
      defaultVerdict: 'ALLOW', geoMap: {},
      rules: [
        { id: 'block-telnet', description: 'telnet', priority: 100, match: { protocol: 'TCP', dstPort: 23 }, verdict: 'DENY' },
        ...(extraRule ? [extraRule] : []),
      ],
    },
    queue: [
      { id: `d${index}-a`, srcAddress: '198.51.100.1', dstAddress: '10.0.0.1', srcPort: 5000, dstPort: 443, protocol: 'TCP', flags: [], payloadIndicators: [], techniques: [], groundTruth: 'benign' },
      { id: `d${index}-b`, srcAddress: '198.51.100.2', dstAddress: '10.0.0.1', srcPort: 5000, dstPort: 23, protocol: 'TCP', flags: [], payloadIndicators: [], techniques: [], groundTruth: 'policy-violating' },
    ],
    clockSeconds: 30,
    passThreshold: { minAccuracy: 0.5, maxSecurityIncidents: 2, minMorale: 40 },
    introducesConcepts: index === 1 ? ['dstPort-rule', 'protocol-rule'] : [],
  });
  return [mk(1), mk(2)];
}

test('boot with empty storage → playable at shift 1 briefing', () => {
  const g = new GameState({ shifts: fixtureShifts(), storage: fakeStorage() });
  g.init();
  assert.equal(g.phase, PHASES.BRIEFING);
  assert.equal(g.currentShiftIndex, 1);
});

test('boot with malformed JSON → fresh run, bad data overwritten', () => {
  const storage = fakeStorage({ [SAVE_KEY]: '{not valid json' });
  const g = new GameState({ shifts: fixtureShifts(), storage });
  g.init();
  assert.equal(g.currentShiftIndex, 1);
  // Invalid data is replaced by a fresh, valid save (never left corrupt).
  const saved = JSON.parse(storage.getItem(SAVE_KEY));
  assert.equal(saved.version, SAVE_VERSION);
  assert.equal(saved.run.currentShiftIndex, 1);
});

test('boot with unknown version → fresh run', () => {
  const storage = fakeStorage({ [SAVE_KEY]: JSON.stringify({ version: 999, run: { currentShiftIndex: 2 } }) });
  const g = new GameState({ shifts: fixtureShifts(), storage });
  g.init();
  assert.equal(g.currentShiftIndex, 1);
});

test('boot with a valid save resumes the saved shift and settings', () => {
  const storage = fakeStorage({
    [SAVE_KEY]: JSON.stringify({
      version: SAVE_VERSION,
      settings: { clockEnabled: true, theme: 'dark', reducedMotion: true, effectsEnabled: false },
      run: { currentShiftIndex: 2, runTally: { shiftsPassed: 1, totalCorrect: 2, totalPackets: 2 } },
    }),
  });
  const g = new GameState({ shifts: fixtureShifts(), storage });
  g.init();
  assert.equal(g.currentShiftIndex, 2);
  assert.equal(g.settings.theme, 'dark');
  assert.equal(g.settings.clockEnabled, true);
  assert.equal(g.runTally.shiftsPassed, 1);
});

test('stamping the queue reaches DEBRIEF and advance writes the next shift index', () => {
  const storage = fakeStorage();
  const g = new GameState({ shifts: fixtureShifts(), storage });
  g.init();
  g.beginInspecting();
  assert.equal(g.phase, PHASES.INSPECTING);
  g.stampCurrent('ALLOW'); // d1-a correct
  g.stampCurrent('DENY');  // d1-b correct
  assert.equal(g.phase, PHASES.DEBRIEF);
  assert.equal(g.lastScore.outcome, 'advance');
  g.resolveDebrief();
  assert.equal(g.currentShiftIndex, 2);
  const saved = JSON.parse(storage.getItem(SAVE_KEY));
  assert.equal(saved.run.currentShiftIndex, 2);
});

test('failing the threshold offers a retry of the same shift with meters reset', () => {
  const g = new GameState({ shifts: fixtureShifts(), storage: fakeStorage() });
  g.init();
  g.beginInspecting();
  g.stampCurrent('DENY');  // d1-a wrong (should ALLOW) → morale hit
  g.stampCurrent('ALLOW'); // d1-b wrong (should DENY) → security incident
  assert.equal(g.phase, PHASES.DEBRIEF);
  assert.equal(g.lastScore.outcome, 'retry');
  g.resolveDebrief();
  assert.equal(g.currentShiftIndex, 1);          // same shift
  assert.equal(g.standing.morale, 100);          // meters reset
  assert.equal(g.standing.securityIncidents, 0);
});

test('a retried shift is not double-counted in the run tally', () => {
  const g = new GameState({ shifts: fixtureShifts(), storage: fakeStorage() });
  g.init();
  g.beginInspecting();
  g.stampCurrent('DENY');  // wrong
  g.stampCurrent('ALLOW'); // wrong → fail threshold
  assert.equal(g.lastScore.outcome, 'retry');
  g.resolveDebrief();      // retry same shift
  g.beginInspecting();
  g.stampCurrent('ALLOW'); // correct
  g.stampCurrent('DENY');  // correct → advance
  assert.equal(g.lastScore.outcome, 'advance');
  // Only the passing attempt contributes to the run tally.
  assert.equal(g.runTally.shiftsPassed, 1);
  assert.equal(g.runTally.totalPackets, 2);
  assert.equal(g.runTally.totalCorrect, 2);
});

test('clock expiry marks remaining packets MISSED and ends the shift', () => {
  const g = new GameState({ shifts: fixtureShifts(), defaultSettings: { clockEnabled: true }, storage: fakeStorage() });
  g.init();
  g.beginInspecting();
  assert.equal(g.clockRemaining, 30);
  g.clockRemaining = 1;
  g.tick(); // → 0 → expire
  assert.equal(g.phase, PHASES.DEBRIEF);
  assert.equal(g.decisions.length, 2);
  assert.ok(g.decisions.some((d) => d.playerVerdict === 'MISSED'));
});

test('settings round-trip through updateSettings persists', () => {
  const storage = fakeStorage();
  const g = new GameState({ shifts: fixtureShifts(), storage });
  g.init();
  g.updateSettings({ theme: 'light', effectsEnabled: false });
  const saved = JSON.parse(storage.getItem(SAVE_KEY));
  assert.equal(saved.settings.theme, 'light');
  assert.equal(saved.settings.effectsEnabled, false);
});

test('pause holds the queue and never advances it', () => {
  const g = new GameState({ shifts: fixtureShifts(), storage: fakeStorage() });
  g.init();
  g.beginInspecting();
  const pos = g.queuePos;
  g.pause();
  assert.equal(g.phase, PHASES.PAUSED);
  g.stampCurrent('ALLOW'); // ignored while paused
  assert.equal(g.queuePos, pos);
  g.resume();
  assert.equal(g.phase, PHASES.INSPECTING);
});
