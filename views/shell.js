// views/shell.js — non-gameplay states: loading, paused, empty-queue, end-of-run,
// and the keyboard-help overlay. Pure DOM; keyboard wired through ctx.keys.

import { esc, focusMain } from '../render/a11y.js';

function clear(root) { root.textContent = ''; }

/** LOADING: shown while content/settings resolve. */
export function mountLoading(root) {
  clear(root);
  const el = document.createElement('section');
  el.className = 'screen';
  el.innerHTML = `
    <div class="card state-msg" role="status" aria-live="polite">
      <p class="big">Firewall Inspector</p>
      <p class="muted">Loading today's shift…</p>
    </div>`;
  root.appendChild(el);
}

/** PAUSED: the queue never advances while paused. */
export function mountPaused(root, state, ctx) {
  clear(root);
  const el = document.createElement('section');
  el.className = 'screen';
  el.innerHTML = `
    <div class="card state-msg" role="status">
      <p class="big">Paused</p>
      <p class="muted">The packet queue is held. Nothing advances while paused.</p>
      <div class="btn-row" style="justify-content:center">
        <button class="btn btn-primary" id="resume-btn">Resume (<kbd>P</kbd>)</button>
      </div>
    </div>`;
  root.appendChild(el);
  el.querySelector('#resume-btn').addEventListener('click', () => state.resume());
  ctx.keys.setBindings({
    p: { handler: () => state.resume(), description: 'Resume', label: 'P' },
    '?': { handler: () => ctx.toggleHelp(), description: 'Keyboard help', label: '?' },
  });
  focusMain(el.querySelector('#resume-btn'));
}

/** END: the whole run is complete. */
export function mountEnd(root, state, ctx) {
  clear(root);
  const t = state.runTally;
  const accuracy = t.totalPackets > 0 ? Math.round((t.totalCorrect / t.totalPackets) * 100) : 0;
  const el = document.createElement('section');
  el.className = 'screen';
  el.innerHTML = `
    <div class="card state-msg">
      <p class="big">Shift log closed</p>
      <p>You worked through all ${esc(String(state.shiftCount))} shifts.</p>
      <p class="muted">
        Shifts passed: <b>${esc(String(t.shiftsPassed))}</b> ·
        Overall accuracy: <b>${esc(String(accuracy))}%</b>
        (${esc(String(t.totalCorrect))}/${esc(String(t.totalPackets))} packets).
      </p>
      <div class="btn-row" style="justify-content:center">
        <button class="btn btn-primary" id="restart-btn">Start a new run</button>
      </div>
    </div>`;
  root.appendChild(el);
  el.querySelector('#restart-btn').addEventListener('click', () => {
    state.clearSave();
    state.runTally = { shiftsPassed: 0, totalCorrect: 0, totalPackets: 0 };
    state.startShift(1);
  });
  ctx.keys.setBindings({
    '?': { handler: () => ctx.toggleHelp(), description: 'Keyboard help', label: '?' },
  });
  focusMain(el.querySelector('#restart-btn'));
}

/** Empty-queue guard state (a shift with no packets — should not happen in v1). */
export function mountEmptyQueue(root, state) {
  clear(root);
  const el = document.createElement('section');
  el.className = 'screen';
  el.innerHTML = `
    <div class="card state-msg" role="status">
      <p class="big">No packets in this shift</p>
      <p class="muted">Nothing to inspect. Continue to the debrief.</p>
      <div class="btn-row" style="justify-content:center">
        <button class="btn btn-primary" id="cont-btn">Continue</button>
      </div>
    </div>`;
  root.appendChild(el);
  el.querySelector('#cont-btn').addEventListener('click', () => state.finishShift());
  focusMain(el.querySelector('#cont-btn'));
}

/** Keyboard-help overlay. `onClose` returns to the previous view. */
export function mountKeyboardHelp(root, bindings, onClose) {
  clear(root);
  const rows = bindings
    .map((b) => `<dt><kbd>${esc(b.key)}</kbd></dt><dd>${esc(b.description)}</dd>`)
    .join('');
  const el = document.createElement('section');
  el.className = 'screen';
  el.innerHTML = `
    <div class="card">
      <h2>Keyboard controls</h2>
      <dl class="keyhelp">${rows || '<dd>No shortcuts on this screen.</dd>'}</dl>
      <div class="btn-row">
        <button class="btn btn-primary" id="help-close">Close (<kbd>?</kbd> or <kbd>Esc</kbd>)</button>
      </div>
    </div>`;
  root.appendChild(el);
  el.querySelector('#help-close').addEventListener('click', onClose);
  focusMain(el.querySelector('#help-close'));
}
