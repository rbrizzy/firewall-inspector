// views/briefing.js — pre-shift teaching screen (US2, FR-006).
// Shows the day's title, plain-language body, and worked examples, then a
// keyboard "begin shift" action. Teaches new/changed rules before they are tested.

import { esc, focusMain } from '../render/a11y.js';
import { resetGameplayUi } from './gameplay.js';

function examplesMarkup(examples) {
  if (!examples || examples.length === 0) return '';
  const items = examples.map((ex) => `
    <div class="example">
      <span class="verdict-badge verdict-${esc(ex.verdict)}">${esc(ex.verdict)}</span>
      ${ex.packetRef ? `<span class="muted">${esc(ex.packetRef)}</span> — ` : ''}
      ${esc(ex.why)}
    </div>`).join('');
  return `<h3>Worked examples</h3>${items}`;
}

export function mountBriefing(root, state, ctx) {
  resetGameplayUi(); // fresh shift → clear rulebook/inspector/raw toggles
  const shift = state.currentShift;
  const b = shift.briefing;

  root.textContent = '';
  const el = document.createElement('section');
  el.className = 'screen';

  if (!b) {
    // No briefing authored (ruleset unchanged) — go straight to inspecting.
    state.beginInspecting();
    return;
  }

  const concepts = (b.introducesConcepts || []).length
    ? `<p class="muted">New this shift: ${esc((b.introducesConcepts || []).join(', '))}</p>` : '';

  el.innerHTML = `
    <div class="card">
      <p class="muted">Shift ${esc(String(shift.index))} briefing</p>
      <h1>${esc(b.title)}</h1>
      ${concepts}
      <p>${esc(b.body)}</p>
      ${examplesMarkup(b.examples)}
      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn-primary" id="begin-btn">Begin shift (<kbd>Enter</kbd>)</button>
        <button class="btn" id="help-btn">Help (<kbd>?</kbd>)</button>
      </div>
    </div>`;
  root.appendChild(el);

  el.querySelector('#begin-btn').addEventListener('click', () => state.beginInspecting());
  el.querySelector('#help-btn').addEventListener('click', () => ctx.toggleHelp());

  ctx.keys.setBindings({
    enter: { handler: () => state.beginInspecting(), description: 'Begin shift', label: 'Enter' },
    '?': { handler: () => ctx.toggleHelp(), description: 'Keyboard help', label: '?' },
  });
  focusMain(el.querySelector('#begin-btn'));
}
