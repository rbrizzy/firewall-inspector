# vendor/

Third-party code vendored locally so the game stays **clone-and-play** with no
`npm install`, no bundler, and no network/CDN dependency (per `PLAN.md` and
`research.md` R2).

## `three.module.js`

The optional THREE.js visualization layer (`viz/blast-radius.js`) imports THREE
from here. To keep this repository self-contained and offline-capable, ship the
real THREE.js ES module build at this path:

- **Source**: https://unpkg.com/three@0.160.0/build/three.module.js
- **Version**: r160 (`three@0.160.0`)
- **License**: MIT (see the THREE.js repository)

Download it once and commit it:

```sh
curl -L https://unpkg.com/three@0.160.0/build/three.module.js -o vendor/three.module.js
```

### Fallback shim

If the real module is not present, this directory ships a **minimal placeholder
shim** exporting a tiny, no-op subset of the THREE API. The game detects the
placeholder and uses the accessible SVG/text blast-radius fallback instead — the
game is always fully playable with the viz layer off (see `research.md` R1/R2a).
Replace the shim with the real module above to enable the animated WebGL layer.
