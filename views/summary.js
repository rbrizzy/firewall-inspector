// views/summary.js — end-of-shift debrief (US1 T026, extended by US3 T039).
// Lists every decision with correct/incorrect counts, full consequence
// traceability (each consequence → its packet + rule + explanation), and the
// pass/retry outcome vs the shift threshold. Shows the optional blast-radius viz
// for the worst security incident, with a static SVG/text fallback.

import { esc, focusMain, announce } from '../render/a11y.js';
import { mountBlast } from '../viz/blast-radius.js';

let blastHandle = null;

function verdictBadge(v) {
  return `<span class="verdict-badge verdict-${esc(v)}">${esc(v)}</span>`;
}

function decisionMarkup(d) {
  const cls = d.isCorrect ? 'correct' : 'wrong';
  const cons = (d.consequences || []).map((c) =>
    `<div class="consequence">↳ ${esc(c.type)} (severity ${esc(String(c.severity))}): ${esc(c.explanation)}</div>`
  ).join('');
  const detail = d.isCorrect ? esc(d.rationale) : esc(d.explanation);
  return `<li class="decision ${cls}">
    <span>${esc(d.packetId)}</span>
    <span>you: ${verdictBadge(d.playerVerdict)}</span>
    <span>correct: ${verdictBadge(d.correctVerdict)}</span>
    <span class="muted" style="flex:1 1 100%">${detail}${cons}</span>
  </li>`;
}

export function mountSummary(root, state, ctx) {
  const shift = state.currentShift;
  const score = state.lastScore || { outcome: 'advance', detail: '', accuracy: 0 };
  const correct = state.decisions.filter((d) => d.isCorrect).length;
  const total = state.decisions.length;
  const isLast = state.currentShiftIndex >= state.shiftCount && score.outcome === 'advance';

  // Worst security incident drives the blast-radius illustration.
  const incidents = state.consequences.filter((c) => c.type === 'security-incident');
  const worst = incidents.reduce((m, c) => (c.severity > (m?.severity ?? -1) ? c : m), null);

  root.textContent = '';
  const el = document.createElement('section');
  el.className = 'screen';
  el.innerHTML = `
    <div class="card">
      <p class="muted">Shift ${esc(String(shift.index))} debrief</p>
      <h1>${score.outcome === 'advance' ? 'Shift passed' : 'Shift not passed'}</h1>
      <p>
        Correct: <b>${esc(String(correct))}/${esc(String(total))}</b> ·
        Morale: <b>${esc(String(state.standing.morale))}</b> ·
        Security incidents: <b>${esc(String(state.standing.securityIncidents))}</b>
      </p>
      <p class="${score.outcome === 'advance' ? 'outcome-advance' : 'outcome-retry'}">${esc(score.detail)}</p>

      ${worst ? `<h2>Blast radius</h2>
        <p class="muted">Illustration of the highest-severity incident — the consequence is also
        listed in words below.</p>
        <div id="blast"></div>` : ''}

      <h2>Decisions</h2>
      <ul class="decisions">${state.decisions.map(decisionMarkup).join('')}</ul>

      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn-primary" id="next-btn">
          ${isLast ? 'Finish run' : (score.outcome === 'advance' ? 'Next shift' : 'Retry shift')}
          (<kbd>Enter</kbd>)
        </button>
        <button class="btn" id="settings-btn">Settings</button>
        <button class="btn" id="help-btn">Help (<kbd>?</kbd>)</button>
      </div>
    </div>`;
  root.appendChild(el);

  if (blastHandle) { blastHandle.destroy?.(); blastHandle = null; }
  if (worst) {
    blastHandle = mountBlast(el.querySelector('#blast'), worst.severity, {
      effectsEnabled: state.settings.effectsEnabled,
      reducedMotion: state.settings.reducedMotion,
    });
  }

  el.querySelector('#next-btn').addEventListener('click', () => state.resolveDebrief());
  el.querySelector('#settings-btn').addEventListener('click', () => ctx.openSettings());
  el.querySelector('#help-btn').addEventListener('click', () => ctx.toggleHelp());

  ctx.keys.setBindings({
    enter: { handler: () => state.resolveDebrief(), description: score.outcome === 'advance' ? 'Continue' : 'Retry shift', label: 'Enter' },
    '?': { handler: () => ctx.toggleHelp(), description: 'Keyboard help', label: '?' },
  });

  announce(`${score.outcome === 'advance' ? 'Shift passed.' : 'Shift not passed.'} ${score.detail}`);
  focusMain(el.querySelector('#next-btn'));
}
