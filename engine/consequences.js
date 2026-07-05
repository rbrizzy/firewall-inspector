// engine/consequences.js
// Pure consequence model. A wrong decision produces consequences whose severity
// scales with the packet's real-world danger. Correct decisions produce none.

/** Base severity by ground-truth classification. */
const SEVERITY = {
  malicious: 3,
  'policy-violating': 1,
  benign: 2, // benign matters when it is a high-value legit packet wrongly blocked
};

/**
 * Compute consequences for a decision. Returns [] when correct.
 * A MISSED packet is treated as the unsafe outcome (opposite of correct).
 * @param {Object} packet
 * @param {'ALLOW'|'DENY'|'MISSED'} playerVerdict
 * @param {'ALLOW'|'DENY'} correctVerdict
 * @param {string|null} matchedRuleId
 * @returns {Array<{packetId:string, ruleId:string|null, type:string, severity:number, explanation:string}>}
 */
export function computeConsequences(packet, playerVerdict, correctVerdict, matchedRuleId = null) {
  const effective = playerVerdict === 'MISSED'
    ? (correctVerdict === 'DENY' ? 'ALLOW' : 'DENY') // missed = the wrong thing happened
    : playerVerdict;
  if (effective === correctVerdict) return [];

  const severity = SEVERITY[packet.groundTruth] ?? 1;
  const base = { packetId: packet.id, ruleId: matchedRuleId, severity };

  // Let something through that should have been denied → security incident.
  if (correctVerdict === 'DENY') {
    const kind = packet.groundTruth === 'malicious' ? 'malicious traffic' : 'policy-violating traffic';
    return [{
      ...base,
      type: 'security-incident',
      explanation:
        `You allowed ${kind} (${packet.srcAddress} → ${packet.dstAddress}). ` +
        (packet.groundTruth === 'malicious'
          ? 'It reached internal systems — watch the blast radius.'
          : 'It bypassed policy and will need remediation.'),
    }];
  }

  // Blocked traffic that should have been allowed → morale hit.
  return [{
    ...base,
    type: 'morale',
    explanation:
      `You blocked legitimate traffic (${packet.srcAddress} → ${packet.dstAddress}). ` +
      'The affected team noticed, and morale dipped.',
  }];
}

/**
 * Apply consequences to a per-shift standing (mutates a copy, returns it).
 * @param {{morale:number, securityIncidents:number}} standing
 * @param {Array} consequences
 */
export function applyConsequences(standing, consequences) {
  const next = { ...standing };
  for (const c of consequences) {
    if (c.type === 'morale') next.morale -= c.severity * 10;
    else if (c.type === 'security-incident') next.securityIncidents += 1;
  }
  if (next.morale < 0) next.morale = 0;
  return next;
}
