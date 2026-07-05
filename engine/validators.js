// engine/validators.js
// Pure content-integrity checks. Enforces the constitution's invariants as code:
// single correct verdict, taught-before-tested, sources present, raw-view optional,
// narrative neutrality, bounded progression.

import { evaluateVerdict } from './verdict.js';

/**
 * Collect the concept tags a shift actually exercises (from its rules + packets).
 */
function conceptsUsedByShift(shift) {
  const used = new Set();
  for (const rule of shift.ruleset.rules || []) {
    // A rule's match keys imply concepts (port-rule, geo-rule, signature-rule, ...).
    for (const key of Object.keys(rule.match || {})) used.add(`${key}-rule`);
    if (rule.isException) used.add('exception');
  }
  for (const packet of shift.queue || []) {
    for (const tech of packet.techniques || []) used.add(tech);
  }
  return used;
}

/**
 * Validate an ordered array of shifts.
 * @param {Array} shifts
 * @returns {{ok:boolean, errors:string[]}}
 */
export function validateContent(shifts) {
  const errors = [];
  const taught = new Set();
  const seenIndex = new Set();

  const ordered = [...shifts].sort((a, b) => a.index - b.index);

  for (const shift of ordered) {
    // Bounded, unique, contiguous-ish index.
    if (seenIndex.has(shift.index)) errors.push(`Duplicate shift index ${shift.index} (${shift.id}).`);
    seenIndex.add(shift.index);

    // Introduced concepts become "taught" for this and later shifts.
    for (const c of shift.introducesConcepts || []) taught.add(c);
    for (const c of shift.briefing?.introducesConcepts || []) taught.add(c);

    // 2. Taught-before-tested.
    for (const concept of conceptsUsedByShift(shift)) {
      if (!taught.has(concept)) {
        errors.push(`Shift ${shift.id} uses concept "${concept}" before it is introduced.`);
      }
    }

    for (const packet of shift.queue || []) {
      // 1. Single correct verdict (evaluateVerdict is total → always one verdict).
      const result = evaluateVerdict(shift.ruleset, packet);
      if (result.verdict !== 'ALLOW' && result.verdict !== 'DENY') {
        errors.push(`Packet ${shift.id}/${packet.id} did not resolve to a single verdict.`);
      }

      // 3. Sources present for real-world-derived packets.
      if ((packet.techniques || []).length > 0 && !packet.source) {
        errors.push(`Packet ${shift.id}/${packet.id} uses a technique but has no source.`);
      }

      // 4. Raw view optional: rawPayload must not carry a unique required signal.
      //    We approximate: a packet with rawPayload must still resolve identically
      //    when rawPayload is removed (engine never reads rawPayload, so this holds
      //    structurally, but we assert the field is not the only indicator present).
      if (packet.rawPayload && (packet.payloadIndicators || []).length === 0
          && (packet.techniques || []).length === 0) {
        errors.push(`Packet ${shift.id}/${packet.id} relies on rawPayload alone; add structured indicators.`);
      }

      // 5. Narrative neutrality: a narrative must assert it does not change the verdict.
      if (packet.narrative && packet.narrative.correctVerdictUnchanged !== true) {
        errors.push(`Packet ${shift.id}/${packet.id} narrative must set correctVerdictUnchanged:true.`);
      }
    }

    // Rules that reference real advisories should carry a source.
    for (const rule of shift.ruleset.rules || []) {
      if (rule.source && !rule.source.ref) {
        errors.push(`Rule ${shift.id}/${rule.id} has a source without a ref.`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
