// engine/verdict.js
// The pure verdict engine: the single source of truth for correctness.
// The UI never decides verdicts; it only renders what this module returns.

import {
  matchPort,
  ipInCidr,
  matchProtocol,
  matchFlags,
  matchGeo,
  matchSignature,
  matchTechnique,
} from './matchers.js';

/**
 * Evaluate whether a single rule matches a packet. All present criteria must
 * hold (logical AND). Unknown/empty criteria are ignored.
 * @param {Object} rule
 * @param {Object} packet
 * @param {Object} ruleset  (for geoMap lookups)
 * @returns {boolean}
 */
export function ruleMatches(rule, packet, ruleset) {
  const m = rule.match || {};
  if ('dstPort' in m && !matchPort(m.dstPort, packet.dstPort)) return false;
  if ('srcPort' in m && !matchPort(m.srcPort, packet.srcPort)) return false;
  if ('dstCidr' in m && !ipInCidr(m.dstCidr, packet.dstAddress)) return false;
  if ('srcCidr' in m && !ipInCidr(m.srcCidr, packet.srcAddress)) return false;
  if ('protocol' in m && !matchProtocol(m.protocol, packet.protocol)) return false;
  if ('flags' in m && !matchFlags(m.flags, packet.flags)) return false;
  if ('geo' in m && !matchGeo(m.geo, packet.srcAddress, ruleset.geoMap)) return false;
  if ('signatureId' in m && !matchSignature(m.signatureId, packet.payloadIndicators)) return false;
  if ('technique' in m && !matchTechnique(m.technique, packet)) return false;
  // A rule with no criteria matches nothing (guard against accidental catch-all).
  if (Object.keys(m).length === 0) return false;
  return true;
}

/**
 * Determine the correct verdict for a packet against a ruleset.
 * Rules are evaluated in descending priority; the first match governs.
 * @param {Object} ruleset  { defaultVerdict, rules[], geoMap }
 * @param {Object} packet
 * @returns {{verdict:'ALLOW'|'DENY', matchedRuleId:string|null, rationale:string, matchedRule:Object|null}}
 */
export function evaluateVerdict(ruleset, packet) {
  const rules = [...(ruleset.rules || [])].sort(
    (a, b) => (b.priority || 0) - (a.priority || 0),
  );
  for (const rule of rules) {
    if (ruleMatches(rule, packet, ruleset)) {
      return {
        verdict: rule.verdict,
        matchedRuleId: rule.id,
        matchedRule: rule,
        rationale: `Rule "${rule.id}" applies: ${rule.description} → ${rule.verdict}.`,
      };
    }
  }
  const verdict = ruleset.defaultVerdict || 'ALLOW';
  return {
    verdict,
    matchedRuleId: null,
    matchedRule: null,
    rationale: `No rule matched; the shift default verdict is ${verdict}.`,
  };
}
