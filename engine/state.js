// engine/state.js — run/shift state machine + localStorage persistence.
// Holds no DOM; views subscribe for re-render. Correctness comes from the pure
// engine modules (verdict/consequences/scoring); this module orchestrates flow.

import { evaluateVerdict } from './verdict.js';
import { explainMistake } from './feedback.js';
import { computeConsequences, applyConsequences } from './consequences.js';
import { scoreShift } from './scoring.js';

export const PHASES = Object.freeze({
  LOADING: 'LOADING',
  BRIEFING: 'BRIEFING',
  INSPECTING: 'INSPECTING',
  PAUSED: 'PAUSED',
  DEBRIEF: 'DEBRIEF',
  END: 'END',
});

export const SAVE_KEY = 'firewall-inspector:save';
export const SAVE_VERSION = 1;
export const STARTING_MORALE = 100;

const DEFAULT_SETTINGS = {
  clockEnabled: false,
  theme: 'system',
  reducedMotion: false,
  effectsEnabled: true,
};

/** Fresh per-shift standing (meters reset each shift — data-model / research R7). */
function freshStanding() {
  return { morale: STARTING_MORALE, securityIncidents: 0, correct: 0, total: 0 };
}

/** Structural equality good enough for ruleset-change detection. */
function sameRuleset(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export class GameState {
  /**
   * @param {Object} opts
   * @param {Array} opts.shifts   ordered shift content
   * @param {Object} [opts.defaultSettings]
   * @param {Storage} [opts.storage]  localStorage-like (get/set/removeItem); optional for tests
   */
  constructor({ shifts, defaultSettings, storage } = {}) {
    this.shifts = [...(shifts || [])].sort((a, b) => a.index - b.index);
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.subscribers = new Set();

    this.phase = PHASES.LOADING;
    this.settings = { ...DEFAULT_SETTINGS, ...(defaultSettings || {}) };
    this.runTally = { shiftsPassed: 0, totalCorrect: 0, totalPackets: 0 };
    this.currentShiftIndex = 1; // 1-based

    // Per-shift runtime (reset by startShift)
    this.standing = freshStanding();
    this.decisions = [];
    this.consequences = [];
    this.queuePos = 0;
    this.clockRemaining = null; // seconds, or null = no clock
    this.lastResumePhase = PHASES.INSPECTING;
    this.lastScore = null; // scoreShift() result at DEBRIEF
  }

  // ---- subscription ----
  subscribe(fn) { this.subscribers.add(fn); return () => this.subscribers.delete(fn); }
  notify() { for (const fn of this.subscribers) fn(this); }

  // ---- lookups ----
  get shiftCount() { return this.shifts.length; }
  get currentShift() { return this.shifts.find((s) => s.index === this.currentShiftIndex) || null; }
  previousShift() { return this.shifts.find((s) => s.index === this.currentShiftIndex - 1) || null; }
  get currentPacket() {
    const shift = this.currentShift;
    if (!shift) return null;
    return shift.queue[this.queuePos] || null;
  }
  get remainingCount() {
    const shift = this.currentShift;
    return shift ? Math.max(0, shift.queue.length - this.queuePos) : 0;
  }

  /** Whether the briefing should be shown: first shift or ruleset changed (T030). */
  rulesetChangedFromPrevious() {
    if (this.currentShiftIndex <= 1) return true;
    const prev = this.previousShift();
    const cur = this.currentShift;
    if (!prev || !cur) return true;
    return !sameRuleset(prev.ruleset, cur.ruleset);
  }

  // ---- lifecycle ----

  /** Load persisted run/settings and enter the first briefing. */
  init() {
    this.load();
    this.startShift(this.currentShiftIndex);
  }

  /** Begin (or restart) a shift: reset meters/queue, choose BRIEFING vs INSPECTING. */
  startShift(index) {
    this.currentShiftIndex = index;
    const shift = this.currentShift;
    this.standing = freshStanding();
    this.decisions = [];
    this.consequences = [];
    this.queuePos = 0;
    this.lastScore = null;
    this.clockRemaining =
      this.settings.clockEnabled && shift && typeof shift.clockSeconds === 'number'
        ? shift.clockSeconds
        : null;

    this.phase = this.rulesetChangedFromPrevious() ? PHASES.BRIEFING : PHASES.INSPECTING;
    // The shift boundary is the persisted resume point (save-state.md).
    this.save();
    this.notify();
  }

  /** Leave the briefing and start inspecting the queue. */
  beginInspecting() {
    if (this.phase !== PHASES.BRIEFING) return;
    this.phase = this.currentShift && this.currentShift.queue.length > 0
      ? PHASES.INSPECTING
      : PHASES.DEBRIEF;
    if (this.phase === PHASES.DEBRIEF) this.finishShift();
    this.notify();
  }

  /**
   * Record the player's stamp for the current packet, compute consequences,
   * advance the queue, and transition to DEBRIEF when the queue empties.
   * @param {'ALLOW'|'DENY'|'MISSED'} playerVerdict
   */
  stampCurrent(playerVerdict) {
    if (this.phase !== PHASES.INSPECTING) return null;
    const shift = this.currentShift;
    const packet = this.currentPacket;
    if (!packet) return null;

    const result = evaluateVerdict(shift.ruleset, packet);
    const isCorrect = playerVerdict === result.verdict;
    const consequences = computeConsequences(
      packet, playerVerdict, result.verdict, result.matchedRuleId,
    );

    this.standing.total += 1;
    if (isCorrect) this.standing.correct += 1;
    this.standing = { ...applyConsequences(this.standing, consequences), correct: this.standing.correct, total: this.standing.total };
    this.consequences.push(...consequences);

    const decision = {
      packetId: packet.id,
      packet,
      playerVerdict,
      correctVerdict: result.verdict,
      matchedRuleId: result.matchedRuleId,
      matchedRule: result.matchedRule,
      isCorrect,
      rationale: result.rationale,
      explanation: explainMistake(result, playerVerdict),
      consequences,
    };
    this.decisions.push(decision);
    this.queuePos += 1;

    if (this.queuePos >= shift.queue.length) {
      this.finishShift();
    }
    this.notify();
    return decision;
  }

  /** Clock tick (one second). Returns true if the shift ended due to expiry (T052). */
  tick() {
    if (this.phase !== PHASES.INSPECTING || this.clockRemaining === null) return false;
    this.clockRemaining -= 1;
    if (this.clockRemaining <= 0) {
      this.clockRemaining = 0;
      this.expireRemaining();
      this.notify();
      return true;
    }
    this.notify();
    return false;
  }

  /** Clock expiry: mark every remaining packet MISSED with its consequence. */
  expireRemaining() {
    const shift = this.currentShift;
    while (this.queuePos < shift.queue.length) {
      const packet = shift.queue[this.queuePos];
      const result = evaluateVerdict(shift.ruleset, packet);
      const consequences = computeConsequences(packet, 'MISSED', result.verdict, result.matchedRuleId);
      this.standing.total += 1;
      this.standing = { ...applyConsequences(this.standing, consequences), correct: this.standing.correct, total: this.standing.total };
      this.consequences.push(...consequences);
      this.decisions.push({
        packetId: packet.id,
        packet,
        playerVerdict: 'MISSED',
        correctVerdict: result.verdict,
        matchedRuleId: result.matchedRuleId,
        matchedRule: result.matchedRule,
        isCorrect: false,
        rationale: result.rationale,
        explanation: explainMistake(result, 'MISSED'),
        consequences,
      });
      this.queuePos += 1;
    }
    this.finishShift();
  }

  /** Compute the pass/retry outcome and enter DEBRIEF. Persists at this boundary. */
  finishShift() {
    const shift = this.currentShift;
    this.lastScore = scoreShift(this.standing, shift.passThreshold);
    this.phase = PHASES.DEBRIEF;

    // Roll per-shift accuracy into the run tally (for end-of-run summary only).
    this.runTally.totalCorrect += this.standing.correct;
    this.runTally.totalPackets += this.standing.total;
    if (this.lastScore.outcome === 'advance') this.runTally.shiftsPassed += 1;

    this.save();
  }

  /** From DEBRIEF, move forward on advance or repeat the shift on retry (T042). */
  resolveDebrief() {
    if (this.phase !== PHASES.DEBRIEF || !this.lastScore) return;
    if (this.lastScore.outcome === 'advance') {
      if (this.currentShiftIndex >= this.shiftCount) {
        this.phase = PHASES.END;
        this.save();
        this.notify();
        return;
      }
      this.startShift(this.currentShiftIndex + 1);
    } else {
      // retry same shift; meters reset happens in startShift (SC-013, no game-over)
      this.startShift(this.currentShiftIndex);
    }
  }

  // ---- pause ----
  pause() {
    if (this.phase !== PHASES.INSPECTING) return;
    this.lastResumePhase = PHASES.INSPECTING;
    this.phase = PHASES.PAUSED;
    this.notify();
  }
  resume() {
    if (this.phase !== PHASES.PAUSED) return;
    this.phase = this.lastResumePhase;
    this.notify();
  }
  togglePause() { this.phase === PHASES.PAUSED ? this.resume() : this.pause(); }

  // ---- settings ----
  updateSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    // If the clock was toggled mid-run, only affects the next shift start.
    this.save();
    this.notify();
  }

  // ---- persistence (save-state.md) ----
  save() {
    if (!this.storage) return;
    const payload = {
      version: SAVE_VERSION,
      settings: {
        clockEnabled: this.settings.clockEnabled,
        theme: this.settings.theme,
        reducedMotion: this.settings.reducedMotion,
        effectsEnabled: this.settings.effectsEnabled,
      },
      run: { currentShiftIndex: this.currentShiftIndex, runTally: this.runTally },
    };
    try { this.storage.setItem(SAVE_KEY, JSON.stringify(payload)); } catch { /* ignore quota */ }
  }

  /** Read on boot; tolerate missing/malformed/unknown-version by starting fresh. */
  load() {
    if (!this.storage) return;
    let raw;
    try { raw = this.storage.getItem(SAVE_KEY); } catch { raw = null; }
    if (!raw) return;
    let data;
    try { data = JSON.parse(raw); } catch { this.clearSave(); return; }
    if (!data || typeof data !== 'object' || data.version !== SAVE_VERSION) {
      this.clearSave();
      return;
    }
    if (data.settings && typeof data.settings === 'object') {
      this.settings = { ...this.settings, ...data.settings };
    }
    const run = data.run;
    if (run && typeof run === 'object') {
      const idx = Number(run.currentShiftIndex);
      if (Number.isInteger(idx) && idx >= 1 && idx <= this.shiftCount) {
        this.currentShiftIndex = idx;
      }
      if (run.runTally && typeof run.runTally === 'object') {
        this.runTally = {
          shiftsPassed: Number(run.runTally.shiftsPassed) || 0,
          totalCorrect: Number(run.runTally.totalCorrect) || 0,
          totalPackets: Number(run.runTally.totalPackets) || 0,
        };
      }
    }
  }

  clearSave() {
    if (!this.storage) return;
    try { this.storage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  }
}
