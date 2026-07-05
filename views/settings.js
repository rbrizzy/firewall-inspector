// views/settings.js — settings screen (T051).
// Clock toggle, theme, reduced motion, and effects toggle. Reads/writes through
// state.updateSettings, which persists to localStorage (save-state.md).

import { esc, focusMain } from '../render/a11y.js';

export function mountSettings(root, state, ctx) {
  const s = state.settings;
  root.textContent = '';
  const el = document.createElement('section');
  el.className = 'screen';
  el.innerHTML = `
    <div class="card">
      <h1>Settings</h1>
      <ul class="settings-list">
        <li><label>
          <input type="checkbox" id="set-clock" ${s.clockEnabled ? 'checked' : ''} />
          Enable the per-shift clock (applies from the next shift)
        </label></li>
        <li><label>
          Theme
          <select id="set-theme">
            <option value="system" ${s.theme === 'system' ? 'selected' : ''}>System</option>
            <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark</option>
          </select>
        </label></li>
        <li><label>
          <input type="checkbox" id="set-motion" ${s.reducedMotion ? 'checked' : ''} />
          Reduce motion (disables animated effects)
        </label></li>
        <li><label>
          <input type="checkbox" id="set-effects" ${s.effectsEnabled ? 'checked' : ''} />
          Enable decorative visual effects (THREE.js blast-radius)
        </label></li>
      </ul>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn-primary" id="set-done">Done</button>
      </div>
    </div>`;
  root.appendChild(el);

  el.querySelector('#set-clock').addEventListener('change', (e) =>
    state.updateSettings({ clockEnabled: e.target.checked }));
  el.querySelector('#set-theme').addEventListener('change', (e) =>
    state.updateSettings({ theme: e.target.value }));
  el.querySelector('#set-motion').addEventListener('change', (e) =>
    state.updateSettings({ reducedMotion: e.target.checked }));
  el.querySelector('#set-effects').addEventListener('change', (e) =>
    state.updateSettings({ effectsEnabled: e.target.checked }));
  el.querySelector('#set-done').addEventListener('click', () => ctx.closeSettings());

  ctx.keys.setBindings({
    escape: { handler: () => ctx.closeSettings(), description: 'Close settings', label: 'Esc' },
  });
  focusMain(el.querySelector('#set-clock'));
}
