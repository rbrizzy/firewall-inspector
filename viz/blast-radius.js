// viz/blast-radius.js — OPTIONAL decorative visualization layer.
// Consumes already-computed consequence severity and only *illustrates* it
// (research.md R2a) — it computes nothing about correctness. Gated by
// effectsEnabled + prefers-reduced-motion, and degrades to an accessible static
// SVG (render/packet-svg.js) whenever WebGL/THREE is unavailable. The game is
// always fully playable with this layer off.

import { renderBlastRadiusSVG } from '../render/packet-svg.js';

let THREE = null;
let threeReady = null;

/** Lazily import the vendored THREE module; treat the placeholder shim as absent. */
async function getThree() {
  if (threeReady) return threeReady;
  threeReady = import('../vendor/three.module.js')
    .then((mod) => { THREE = mod && mod.IS_PLACEHOLDER ? null : mod; return THREE; })
    .catch(() => { THREE = null; return null; });
  return threeReady;
}

function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** True only when animation is allowed by settings AND the OS/browser. */
function effectsAllowed(opts = {}) {
  if (opts.effectsEnabled === false) return false;
  if (opts.reducedMotion === true) return false;
  if (prefersReducedMotion()) return false;
  return true;
}

/**
 * Ambient packet-flow backdrop for the desk. Purely decorative; if effects are
 * off or THREE is unavailable, renders nothing (no fallback needed for ambiance).
 * @returns {{destroy:Function}}
 */
// A single, app-lifetime ambient renderer. mountAmbient is called on every
// gameplay re-render (each packet), so allocating a WebGLRenderer per call would
// exhaust the browser's WebGL context limit (~16) within a shift. Instead we
// build ONE renderer, re-parent its canvas on each mount, and pause the animation
// loop while unmounted. { three, scene, camera, renderer, dots, raf, container }.
let ambient = null;

function ensureAmbient(three, width) {
  if (ambient) return ambient;
  const w = width || 480;
  const scene = new three.Scene();
  const camera = new three.PerspectiveCamera(60, w / 160, 0.1, 100);
  camera.position.z = 6;
  const renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, 160);
  const dots = [];
  for (let i = 0; i < 24; i += 1) {
    const m = new three.Mesh(new three.SphereGeometry(0.06, 8, 8),
      new three.MeshBasicMaterial({ color: 0x6f96ff }));
    m.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 4, 0);
    scene.add(m); dots.push(m);
  }
  ambient = { three, scene, camera, renderer, dots, raf: 0, container: null };
  return ambient;
}

function startAmbientLoop() {
  if (!ambient || ambient.raf) return; // already looping
  const loop = () => {
    if (!ambient || !ambient.container) { if (ambient) ambient.raf = 0; return; } // paused while unmounted
    for (const d of ambient.dots) { d.position.x += 0.01; if (d.position.x > 5) d.position.x = -5; }
    ambient.renderer.render(ambient.scene, ambient.camera);
    ambient.raf = requestAnimationFrame(loop);
  };
  ambient.raf = requestAnimationFrame(loop);
}

export function mountAmbient(container, opts = {}) {
  if (!container) return { destroy() {} };
  container.textContent = '';
  if (!effectsAllowed(opts)) return { destroy() {} };

  let cancelled = false;

  getThree().then((three) => {
    if (cancelled || !three) return; // placeholder/unavailable → stay silent
    try {
      const a = ensureAmbient(three, container.clientWidth);
      if (!a.renderer.domElement) return;
      a.container = container;
      a.renderer.setSize(container.clientWidth || 480, 160);
      container.classList.add('viz-layer');
      container.appendChild(a.renderer.domElement); // re-parent the single canvas
      startAmbientLoop();
    } catch { /* any WebGL failure → silent, game unaffected */ }
  });

  return {
    destroy() {
      cancelled = true;
      // Detach the shared canvas and pause the loop, but keep the renderer/context
      // alive for the next mount — do NOT dispose (that would leak a fresh context).
      if (ambient && ambient.container === container) ambient.container = null;
      container.textContent = '';
    },
  };
}

/**
 * Blast-radius effect for a security incident, sized by severity. Illustrates a
 * consequence already explained in text in the debrief. Falls back to a static,
 * labeled SVG when effects are off or THREE is unavailable (V7 acceptance).
 * @returns {{destroy:Function}}
 */
export function mountBlast(container, severity = 1, opts = {}) {
  if (!container) return { destroy() {} };
  container.textContent = '';
  const sev = Math.max(1, Number(severity) || 1);

  // Accessible fallback is always valid; use it unless the animated layer engages.
  const fallbackToSvg = () => {
    container.classList.add('viz-layer');
    container.appendChild(renderBlastRadiusSVG(sev));
  };

  if (!effectsAllowed(opts)) { fallbackToSvg(); return { destroy() { container.textContent = ''; } }; }

  let raf = 0;
  let renderer = null;
  let disposed = false;

  getThree().then((three) => {
    if (disposed) return;
    if (!three) { fallbackToSvg(); return; }
    try {
      const scene = new three.Scene();
      const camera = new three.PerspectiveCamera(60, 16 / 9, 0.1, 100);
      camera.position.z = 5;
      renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(container.clientWidth || 480, 180);
      if (!renderer.domElement) { fallbackToSvg(); return; }
      container.classList.add('viz-layer');
      container.appendChild(renderer.domElement);
      const sphere = new three.Mesh(new three.SphereGeometry(0.5, 24, 24),
        new three.MeshBasicMaterial({ color: 0xff5a4d }));
      scene.add(sphere);
      let t = 0;
      const maxScale = 1 + sev * 1.4;
      const loop = () => {
        if (disposed) return;
        t += 0.02;
        const s = 1 + Math.min(maxScale, t * maxScale);
        sphere.scale?.set?.(s, s, s);
        renderer.render(scene, camera);
        if (t < 1) raf = requestAnimationFrame(loop);
      };
      loop();
    } catch { fallbackToSvg(); }
  });

  return {
    destroy() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      try { renderer && renderer.dispose && renderer.dispose(); } catch { /* noop */ }
      container.textContent = '';
    },
  };
}
