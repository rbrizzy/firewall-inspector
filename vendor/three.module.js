// vendor/three.module.js — PLACEHOLDER SHIM (not the real THREE.js).
//
// The real THREE.js r160 ES module should be committed here for the animated
// WebGL blast-radius layer (see vendor/README.md). Because the game must stay
// clone-and-play and offline, and to avoid shipping a large minified blob, this
// repository ships a minimal placeholder. `viz/blast-radius.js` checks the
// exported `IS_PLACEHOLDER` flag and uses the accessible SVG/text fallback,
// so the game is fully playable either way.
//
// To enable the real WebGL layer, replace this file per vendor/README.md.

export const IS_PLACEHOLDER = true;
export const REVISION = '160-placeholder';

// No-op stand-ins so an `import * as THREE` does not throw if some caller
// forgets to check IS_PLACEHOLDER. These intentionally do nothing.
export class Scene {}
export class PerspectiveCamera {}
export class WebGLRenderer {
  constructor() { this.domElement = null; }
  setSize() {}
  render() {}
  dispose() {}
}
export class Mesh {}
export class SphereGeometry {}
export class MeshBasicMaterial {}
export class Color {}
