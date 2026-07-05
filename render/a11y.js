// render/a11y.js — accessibility helpers: ARIA live announcer, focus management,
// and a global keyboard-binding registry. No game logic here (research.md R10).

/** Announce a message via the assertive live region (screen readers read it). */
export function announce(message) {
  const region = document.getElementById('a11y-announcer');
  if (!region) return;
  // Clearing first guarantees repeat messages are re-announced.
  region.textContent = '';
  // A microtask gap makes SRs treat the new text as a fresh announcement.
  requestAnimationFrame(() => { region.textContent = message; });
}

/** Move focus to an element (or the first focusable inside it), for view changes. */
export function focusMain(el) {
  const target = el || document.getElementById('app');
  if (!target) return;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: false });
}

/**
 * Global keyboard router. Register single-key bindings that fire only when the
 * user is NOT typing into a field. Returns a handle to update or clear bindings.
 */
export function createKeyRouter() {
  let bindings = new Map(); // key(lowercase) -> { handler, description, label }

  function isEditable(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function onKeyDown(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isEditable(document.activeElement)) return;
    const key = e.key.toLowerCase();
    const binding = bindings.get(key);
    if (binding) {
      e.preventDefault();
      binding.handler(e);
    }
  }

  document.addEventListener('keydown', onKeyDown);

  return {
    /** Replace all active bindings. `map` = { key: { handler, description, label } }. */
    setBindings(map) {
      bindings = new Map();
      for (const [key, spec] of Object.entries(map || {})) {
        bindings.set(key.toLowerCase(), spec);
      }
    },
    /** Current bindings as an array for the keyboard-help view. */
    list() {
      return [...bindings.entries()].map(([key, spec]) => ({
        key: spec.label || key.toUpperCase(),
        description: spec.description || '',
      }));
    },
    clear() { bindings = new Map(); },
    destroy() { document.removeEventListener('keydown', onKeyDown); },
  };
}

/** Escape untrusted text for safe insertion into innerHTML contexts. */
export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
