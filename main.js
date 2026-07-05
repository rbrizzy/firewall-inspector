// main.js — bootstrap and top-level router.
// Loads settings + content, initializes the state machine, mounts views by phase,
// owns the global keyboard router, the keyboard-help overlay, theme, and the clock.

import { GameState, PHASES } from './engine/state.js';
import { validateContent } from './engine/validators.js';
import { createKeyRouter, announce, focusMain } from './render/a11y.js';
import * as shell from './views/shell.js';
import { mountBriefing } from './views/briefing.js';
import { mountGameplay } from './views/gameplay.js';
import { mountSummary } from './views/summary.js';
import { mountSettings } from './views/settings.js';

const SHIFT_PAD = (n) => String(n).padStart(2, '0');

async function loadJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return res.json();
}

/** Load default settings, then probe contiguous day-NN.json files until one is missing. */
async function loadContent() {
  let defaultSettings = {};
  try { defaultSettings = await loadJSON('data/settings.default.json'); } catch { /* use built-ins */ }

  const shifts = [];
  for (let i = 1; i <= 99; i += 1) {
    try {
      shifts.push(await loadJSON(`data/shifts/day-${SHIFT_PAD(i)}.json`));
    } catch {
      break; // first gap ends the contiguous run
    }
  }
  return { defaultSettings, shifts };
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme'); // "system" → follow prefers-color-scheme
}

function boot(root, state, ctx) {
  let helpOpen = false;
  let settingsOpen = false;
  let savedHelpBindings = [];

  function render() {
    applyTheme(state.settings.theme);

    if (helpOpen) {
      shell.mountKeyboardHelp(root, savedHelpBindings, () => { helpOpen = false; render(); });
      ctx.keys.setBindings({
        '?': { handler: () => { helpOpen = false; render(); }, description: 'Close help', label: '?' },
        escape: { handler: () => { helpOpen = false; render(); }, description: 'Close help', label: 'Esc' },
      });
      return;
    }

    if (settingsOpen) {
      mountSettings(root, state, { ...ctx, closeSettings: () => { settingsOpen = false; render(); } });
      return;
    }

    switch (state.phase) {
      case PHASES.LOADING: shell.mountLoading(root, state, ctx); break;
      case PHASES.BRIEFING: mountBriefing(root, state, ctx); break;
      case PHASES.INSPECTING:
        if (!state.currentPacket) shell.mountEmptyQueue(root, state, ctx);
        else mountGameplay(root, state, ctx);
        break;
      case PHASES.PAUSED: shell.mountPaused(root, state, ctx); break;
      case PHASES.DEBRIEF: mountSummary(root, state, ctx); break;
      case PHASES.END: shell.mountEnd(root, state, ctx); break;
      default: shell.mountLoading(root, state, ctx);
    }
  }

  ctx.toggleHelp = () => {
    if (!helpOpen) { savedHelpBindings = ctx.keys.list(); helpOpen = true; }
    else { helpOpen = false; }
    render();
  };
  ctx.openSettings = () => { settingsOpen = true; render(); };

  state.subscribe(render);

  // Per-second clock tick for the optional per-shift timer (state guards phase/clock).
  setInterval(() => { if (state.phase === PHASES.INSPECTING) state.tick(); }, 1000);

  render();
}

async function main() {
  const root = document.getElementById('app');
  const keys = createKeyRouter();
  const ctx = { keys, announce, focusMain };

  shell.mountLoading(root); // immediate feedback before content resolves

  const { defaultSettings, shifts } = await loadContent();

  if (shifts.length === 0) {
    root.innerHTML =
      '<div class="card state-msg"><p class="big">No content found</p>' +
      '<p class="muted">Serve the project over http:// so the shift files can load.</p></div>';
    return;
  }

  // Runtime content guard: refuse to boot on invalid content (taught-before-tested, etc.).
  const report = validateContent(shifts);
  if (!report.ok) {
    console.error('Content validation failed:', report.errors);
    root.innerHTML =
      '<div class="card state-msg"><p class="big">Content error</p>' +
      '<p class="muted">The shift content failed validation. See the console for details.</p></div>';
    return;
  }

  const state = new GameState({ shifts, defaultSettings });
  boot(root, state, ctx);
  state.init();
}

main();
