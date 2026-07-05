# Phase 0 Research: Firewall Inspector

All Technical Context unknowns are resolved below. Each entry: Decision · Rationale · Alternatives.

## R1. Rendering technology — reconciling `PLAN.md` (THREE.js) with the constitution (accessibility)

- **Decision**: A **DOM + SVG accessible core** for all interactive/inspection UI, plus an
  **optional THREE.js visualization layer** (`viz/`) for decorative animation (blast radius,
  packet-flow ambiance). THREE.js is present per `PLAN.md`; it is never required to play and never
  carries decision-critical information.
- **Rationale**: `PLAN.md` is internally contradictory — it says "use THREE.JS for the game engine"
  *and* "SVG for diagrams … No canvas API — DOM-based rendering for accessibility." THREE.js is a
  WebGL/canvas library and cannot render SVG or DOM, so the two directions cannot both govern the
  same surface. We honor *both* by splitting surfaces: the inspection desk, rulebook, briefings, and
  debrief are DOM+SVG (native focus, ARIA roles, live regions → satisfies the constitution's
  keyboard-only, screen-reader, and no-color-only requirements), while THREE.js drives an isolated
  ambient/celebratory layer where a scene graph actually adds value (the pitch's "watch the blast
  radius" moment). The THREE.js layer is gated by `prefers-reduced-motion`, low-power heuristics, and
  graceful failure — if it is off or fails to load, the game is fully playable and every consequence
  is still explained in text/SVG.
- **Alternatives considered**: (a) THREE.js as the *primary* renderer — rejected: a WebGL canvas as
  the main UI would violate FR-019/FR-021/FR-022 and the constitution's Accessibility section
  (keyboard focus, screen-reader semantics). (b) Drop THREE.js entirely (prior revision) — rejected:
  the user directed that `PLAN.md`, which calls for THREE.js, guide the plan. (c) A UI framework
  (React/Vue) — rejected: `PLAN.md` mandates "no frameworks, no build tools."

## R2. Build tooling / distribution — including THREE.js without a bundler

- **Decision**: **No build step.** Ship raw ES modules + static assets and a **vendored local copy of
  THREE.js** (`vendor/three.module.js`) imported as an ES module. Run by serving the folder statically
  (ES modules need `http://`, not `file://`). Distribute via `git clone`.
- **Rationale**: `PLAN.md` mandates "no build tools, no bundler" and the user's explicit goal that
  others can clone/install/play; FR-018 requires no install. Vendoring THREE.js as a local module
  satisfies the THREE.js direction *and* the no-bundler/offline constraints simultaneously — no npm
  install, no CDN network dependency. ES modules are supported by all target browsers.
- **Alternatives considered**: CDN `<script>`/import of THREE.js — rejected: adds a network
  dependency and breaks offline play (FR-018, offline-capable). npm + Vite/esbuild — rejected:
  violates the no-build-step constraint. A single inlined HTML file — rejected: harms auditability of
  the separate `/data` files the constitution wants.

## R2a. Visualization layer scope (THREE.js)

- **Decision**: The `viz/` layer renders (1) an ambient packet-queue/flow backdrop and (2) an
  animated **blast-radius** effect when malicious traffic is wrongly allowed. It reads already-computed
  state (consequences, severity) and only *illustrates* it; it computes nothing about correctness.
- **Rationale**: Keeps the THREE.js layer a pure consumer of engine output (Constitution II/VI stay
  intact) and confines all accessibility-sensitive information to the DOM/SVG core (Constitution III:
  the blast radius shown is a picture of a consequence already stated in words in the debrief).
- **Alternatives considered**: Letting the viz layer own consequence sizing — rejected: would put
  game-meaningful logic in the decorative layer, off the tested pure-engine path.

## R3. Verdict engine design (determinism + testability)

- **Decision**: A pure function `evaluateVerdict(ruleset, packet) -> { verdict, matchedRule,
  rationale }`, backed by pure field matchers, with explicit, data-declared rule precedence. No RNG,
  no I/O, no DOM. Lives in `src/engine/` and is unit-tested under `node --test`.
- **Rationale**: Constitution II (deterministic judgment) and VI (engine separate + testable). A pure
  core means every authored packet's correct verdict is computable and CI-verifiable, and the UI can
  never disagree with the engine because it never decides verdicts itself.
- **Alternatives considered**: Embedding rule logic in view handlers — rejected: unauditable,
  untestable, invites UI/engine divergence. A general expression interpreter for rules — rejected as
  over-engineering for v1's fixed matcher set; revisit if content authors need arbitrary predicates.

## R4. Rule precedence & conflict resolution

- **Decision**: Each rule carries an explicit integer `priority`; the engine evaluates
  highest-priority matching rule first and returns exactly one governing rule. Exceptions (e.g. the
  finance-VPN allow) are modeled as higher-priority ALLOW rules that override a broader DENY. A
  ruleset-level default verdict (typically ALLOW or DENY) applies when nothing matches.
- **Rationale**: Satisfies FR-009 (exactly one correct verdict) and keeps precedence discoverable —
  the rulebook can render rules in priority order. Mirrors how real firewall rule ordering works.
- **Alternatives considered**: First-match-wins by list order — viable but makes precedence implicit
  and fragile to reordering; explicit priority is clearer for authors and players. Most-specific-match
  — rejected: harder to explain to a learner than a stated priority.

## R5. Content model & the "taught-before-tested" guarantee

- **Decision**: Content is JSON under `data/shifts/day-NN.json`, each shift declaring its `briefing`,
  its `ruleset`, its `queue` of packets, and the set of `introducesConcepts`. A pure validator
  (`validators.js`, also run in `tests/content/`) asserts every rule/technique used in a shift was
  introduced in that shift or an earlier one, and that every real-world-derived item has a `source`.
- **Rationale**: Encodes Constitution I, IV, VI as machine-checkable invariants rather than authoring
  discipline alone. Catches curriculum-ordering regressions in CI.
- **Alternatives considered**: Prose-only authoring guidelines — rejected: unenforceable. A CMS —
  rejected: violates no-backend/offline goals.

## R6. Save state & persistence granularity

- **Decision**: `localStorage` holding `{ version, settings, run: { currentShift, standing, tally } }`,
  written at shift boundaries. Mid-shift quit restarts the current shift.
- **Rationale**: FR-023 (local persistence, no backend). Between-shift saves keep the state machine
  simple and robust; a shift is small (~10–15 packets) so restarting costs little. A `version` field
  allows forward-migration of save shape.
- **Alternatives considered**: Continuous mid-shift autosave — deferred (adds state complexity for
  marginal benefit at this shift size). IndexedDB — unnecessary for this small payload.

## R7. Meter / standing model

- **Decision**: Two per-shift meters — **morale** and **security-incidents** — reset at each shift
  start; pass/retry is judged per shift against a threshold (verdict accuracy plus meter bounds). A
  separate cumulative **run tally** is kept for the end-of-run summary/narrative only, not for gating.
- **Rationale**: Keeps each shift an independent, testable unit (aligns with per-shift retry, no
  game-over) while still giving the run a narrative arc. Threshold values are tunable data, finalized
  in playtesting.
- **Alternatives considered**: Fully cumulative meters with game-over — rejected for v1: conflicts
  with the learning-first, retry-friendly model and complicates "retry" semantics.

## R8. Timing model

- **Decision**: One tunable per-shift countdown (a setting; may be disabled). Early shifts ship
  generous or off. When the clock ends, remaining packets are marked "missed" with their own
  consequence. No per-packet timer.
- **Rationale**: Directly implements FR-014 and Constitution V — pressure without hiding truth, and
  the clock is never the primary difficulty lever.
- **Alternatives considered**: Per-packet countdown — rejected: risks making reaction speed the main
  challenge. No timer at all — rejected: drops a core pitch element ("under time pressure").

## R9. Testing approach

- **Decision**: `node --test` (built-in, zero deps) for all pure engine + validator modules; content
  validation as a test that loads every `data/shifts/*.json` and asserts single-correct-verdict and
  source presence. UI/keyboard flows validated manually via `quickstart.md`.
- **Rationale**: Zero-dependency testing keeps clone-and-run friction near zero and satisfies the
  spec's implicit need to prove SC-002/SC-003/SC-009 mechanically.
- **Alternatives considered**: Jest/Vitest — rejected for v1: adds install weight; revisit if
  DOM-testing needs grow. Headless-browser e2e — deferred to a later version.

## R10. Accessibility implementation specifics

- **Decision**: Semantic HTML with ARIA roles; a global keyboard router (stamp = A/D or arrow+Enter;
  open rulebook, inspector, raw-payload, pause via single keys); ARIA live region announces verdict
  feedback; verdict/flag state conveyed by icon + text label, not color alone; visible focus rings;
  respects `prefers-reduced-motion` and `prefers-color-scheme`.
- **Rationale**: Implements FR-019, FR-020, FR-021, FR-022 and the constitution's accessibility
  section concretely.
- **Alternatives considered**: Mouse-first with keyboard bolted on — rejected: violates FR-019 and is
  hard to retrofit.

## Legacy-document reconciliation (flagged for the user)

The repo root `PLAN.md` and `SPEC.md` were authored for the different "Packet Quest" routing game.
Per user direction, this plan **adopts `PLAN.md`'s tech stack and architecture as guidance** —
no-bundler vanilla JS, single `index.html`, `/engine` + `/views` (`briefing`/`gameplay`/`summary`) +
`/data`, SVG rendering, `localStorage`, pure engine, and THREE.js — reframed from routing to firewall
inspection. The one substantive reinterpretation is THREE.js's role (see R1): a decorative,
optional visualization layer rather than the primary renderer, because `PLAN.md`'s own
"DOM-based rendering for accessibility" line and the constitution's Accessibility Standards forbid a
WebGL canvas from owning the interactive core.

Recommendation (outside this command): once you're happy with the plan, update or archive the root
`SPEC.md`/`PLAN.md` so the "Packet Quest" framing doesn't confuse future readers, since the canonical
Firewall Inspector spec/plan now live under `specs/001-firewall-inspector/`.
