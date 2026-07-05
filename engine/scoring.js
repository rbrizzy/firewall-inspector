// engine/scoring.js
// Pure per-shift scoring: decide advance vs retry against the pass threshold.

/**
 * @param {{correct:number, total:number, morale:number, securityIncidents:number}} standing
 * @param {{minAccuracy:number, maxSecurityIncidents:number, minMorale:number}} threshold
 * @returns {{outcome:'advance'|'retry', accuracy:number, detail:string, reasons:string[]}}
 */
export function scoreShift(standing, threshold) {
  const accuracy = standing.total > 0 ? standing.correct / standing.total : 0;
  const reasons = [];

  if (accuracy < threshold.minAccuracy) {
    reasons.push(
      `Accuracy ${(accuracy * 100).toFixed(0)}% is below the required ${(threshold.minAccuracy * 100).toFixed(0)}%.`,
    );
  }
  if (standing.securityIncidents > threshold.maxSecurityIncidents) {
    reasons.push(
      `${standing.securityIncidents} security incident(s); the limit is ${threshold.maxSecurityIncidents}.`,
    );
  }
  if (standing.morale < threshold.minMorale) {
    reasons.push(`Morale ${standing.morale} is below the required ${threshold.minMorale}.`);
  }

  const outcome = reasons.length === 0 ? 'advance' : 'retry';
  const detail = outcome === 'advance'
    ? `Shift passed — accuracy ${(accuracy * 100).toFixed(0)}%, ` +
      `${standing.securityIncidents} incident(s), morale ${standing.morale}.`
    : `Shift not passed. ${reasons.join(' ')} You can retry this shift.`;

  return { outcome, accuracy, detail, reasons };
}
