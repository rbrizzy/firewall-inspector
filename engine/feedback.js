// engine/feedback.js
// Pure explanation-copy builders. Turns engine output into plain-language text.

/**
 * Build a specific explanation of a player's mistake. Returns '' when correct.
 * @param {Object} result  output of evaluateVerdict
 * @param {'ALLOW'|'DENY'|'MISSED'} playerVerdict
 * @returns {string}
 */
export function explainMistake(result, playerVerdict) {
  if (playerVerdict === result.verdict) return '';

  const correct = result.verdict;
  if (playerVerdict === 'MISSED') {
    return `Time ran out on this packet. The correct verdict was ${correct}. ${result.rationale}`;
  }

  if (result.matchedRule) {
    const r = result.matchedRule;
    return (
      `This should have been ${correct}, not ${playerVerdict}. ` +
      `Rule "${r.id}" (${r.description}) matched this packet, so the correct action is ${correct}.`
    );
  }
  return (
    `This should have been ${correct}, not ${playerVerdict}. ` +
    `No rule matched, so the shift default verdict (${correct}) applies.`
  );
}

/**
 * Short confirmation text for a correct decision.
 * @param {Object} result
 * @returns {string}
 */
export function confirmCorrect(result) {
  return result.matchedRule
    ? `Correct — ${result.matchedRule.description}`
    : `Correct — no rule matched, default ${result.verdict} applies.`;
}

/**
 * Human-readable label for a rule, for the rulebook panel.
 * @param {Object} rule
 * @returns {string}
 */
export function ruleLabel(rule) {
  const tag = rule.isException ? ' (exception)' : '';
  return `[${rule.verdict}] ${rule.description}${tag}`;
}
