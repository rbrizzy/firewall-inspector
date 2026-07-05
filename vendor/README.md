# vendor/

Third-party code vendored locally so the game stays **clone-and-play** with no
`npm install`, no bundler, and no network/CDN dependency (per `PLAN.md` and
`research.md` R2).

## `three.module.js`

The optional THREE.js visualization layer (`viz/blast-radius.js`) imports THREE
from here. The **real THREE.js r160 ES module** is vendored at this path so the
repository stays self-contained and offline-capable (no `npm install`, no CDN):

- **Source**: https://unpkg.com/three@0.160.0/build/three.module.js
- **Version**: r160 (`three@0.160.0`)
- **License**: MIT (Copyright © 2010–2023 three.js authors)

To re-fetch or upgrade it, download and commit the module:

```sh
curl -L https://unpkg.com/three@0.160.0/build/three.module.js -o vendor/three.module.js
```

### SVG/text fallback

The blast-radius layer is always optional. `viz/blast-radius.js` degrades to an
accessible **static SVG/text** presentation whenever the animated layer cannot or
should not run — `effectsEnabled: false`, `prefers-reduced-motion`, or WebGL
being unavailable / failing to initialize. If this file is ever replaced by a
module that exports `IS_PLACEHOLDER === true`, the viz layer treats it as absent
and uses that same fallback, so the game is always fully playable with the viz
layer off (see `research.md` R1/R2a).
