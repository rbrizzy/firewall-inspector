# Implementation Plan: Firewall Inspector

**Branch**: `001-firewall-inspector` | **Date**: 2026-07-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-firewall-inspector/spec.md`

**Guidance**: This plan follows the repository root `PLAN.md` for tech-stack and architecture
conventions (adapted from the abandoned "Packet Quest" routing game to Firewall Inspector), reconciled
with Firewall Inspector Constitution v1.1.0. See [research.md](./research.md) §R1 for how the
`PLAN.md` THREE.js direction and its accessibility direction are reconciled.

## Summary

Firewall Inspector is a single-player, browser-based, *Papers, Please*-style teaching game: packets
queue at an inspection desk and the player stamps ALLOW or DENY against a daily ruleset under a
tunable per-shift clock. The primary requirement is a **deterministic, pure verdict engine** that
decides the correct verdict for any packet from the active ruleset, wrapped in a keyboard-first
DOM/SVG interface with briefings, specific wrong-answer explanations, escalating daily
rules/attacker techniques, and traceable consequences.

**Technical approach (per `PLAN.md`)**: Vanilla HTML/CSS/JS with **no bundler and no build step**,
a **single `index.html` entry point**, ES-module code split into `/engine` (pure logic) and `/views`
(`briefing`, `gameplay`, `summary`), **all content in `/data`**, **SVG for diagrams**, and
`localStorage` for save state. The **verdict engine is a pure function and the single source of
truth** — the UI never decides verdicts (mirrors `PLAN.md`'s `getNextHop` routing-engine pattern).
**THREE.js** is included per `PLAN.md` as an **optional visual layer** for animated juice (blast
radius, packet-flow ambiance), vendored locally so it needs no install, gated behind
`prefers-reduced-motion`, and never carrying decision-critical information — keeping the core
accessible per the constitution.

## Technical Context

**Language/Version**: JavaScript (ES2020+ modules), HTML5, CSS3. No transpilation (evergreen desktop
browsers).

**Primary Dependencies**: **THREE.js** — vendored as a local ES module (`/vendor/three.module.js`),
used only for the optional visualization layer. No other runtime dependencies; no framework, no
bundler (per `PLAN.md`). Dev-only: Node's built-in `node --test` for the pure engine + content
validators.

**Storage**: Browser `localStorage` for save state (per `PLAN.md`: "Local storage for save state (no
backend, no auth)"). All game content is static JSON under `/data`.

**Testing**: `node --test` for the pure engine, matchers, scoring, and content validators
(DOM-free, deterministic). Manual/quickstart validation for UI, keyboard, and the visualization layer.

**Target Platform**: Evergreen desktop web browsers (latest Chrome and Firefox at minimum). No
install, no login, offline after first load.

**Project Type**: Single-project client-only static web application.

**Performance Goals**: Interaction feels instant — verdict evaluation and screen transitions under
~50 ms on a mid-range laptop. The optional THREE.js layer targets ~60 fps but is fully skippable
(reduced-motion / low-power) with zero impact on playability.

**Constraints**: Fully offline/local; keyboard-operable for every core action; DOM+SVG core (THREE.js
decorative only); no color-only signaling; explicit loading/empty/paused/end states; no runtime AI or
network calls for content; deterministic verdicts; content editable as data without touching logic;
**no bundler/build step — clone and play**.

**Scale/Scope**: v1 ships ~8 shifts ("days"), ~10–15 packets each (~100–120 authored packet
scenarios), rule types (port/CIDR/protocol/flag/geo/signature/exception) and ~3 attacker techniques
(spoofed source, fragmented payload, disguised C2). Small codebase (est. < 5k LOC excluding vendored
THREE.js).

**Deferred clarifications (resolved as plan assumptions, revisit if needed)**:
- Meters reset per shift; a lightweight run-level tally is retained only for the end-of-run summary.
- Shift queue size ~10–15 packets.
- Save granularity: between shifts only (mid-shift quit restarts the current shift).
- Stamps commit immediately and advance the queue (no confirm step).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against Firewall Inspector Constitution v1.1.0:

| Principle | Gate | Status |
|-----------|------|--------|
| I. Technical Ground Truth | Packet/rule/CVE behavior real and sourced. | PASS — content schema requires `source` on real-world-derived scenarios; engine implements real matching semantics. |
| II. Deterministic Judgment | Verdict correctness computable, never random. | PASS — pure `evaluateVerdict(ruleset, packet)`, explicit precedence, no RNG. Matches `PLAN.md` pure-engine pattern. |
| III. Visible/Explained/Proportionate Consequences | Consequence traces to packet+rule; severity-scaled. | PASS — engine returns matched rule + rationale; debrief renders the causal chain. The THREE.js blast-radius is an *illustration* of a consequence already explained in text. |
| IV. Escalating Complexity = Curriculum | Taught-before-tested; difficulty via new concepts. | PASS — validator asserts no rule/technique appears before its introducing shift. |
| V. Time Pressure ≠ Obscured Truth | Timer tunable, tools always available. | PASS — tunable per-shift clock; rulebook + inspector always keyboard-reachable; no per-packet timer. |
| VI. Rules/Scenarios Are Data, No Runtime AI | Content in editable data; engine separate + testable; no runtime AI. | PASS — content in `/data/*.json`; engine dependency-free + unit-tested; no network/AI. |
| Security & Educational Domain | Defensive framing, synthetic data, fictional narrative. | PASS — synthetic packets/IPs; public-education depth; fictional entities. |
| Accessibility & UX Standards | Browser/no-install/no-login, keyboard-only, plain language, explicit states, no color-only. | PASS **with constraint** — the interactive core is DOM+SVG and fully keyboard/screen-reader operable; **THREE.js is decorative only**, disabled under `prefers-reduced-motion`, and never the sole carrier of any decision-critical signal. See Complexity Tracking. |

**Result**: PASS on all gates. The single new dependency (THREE.js) is tracked in Complexity Tracking
because it is added for experience polish rather than core function.

## Project Structure

### Documentation (this feature)

```text
specs/001-firewall-inspector/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── verdict-engine.md
│   ├── content-schema.md
│   └── save-state.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks output (NOT created here)
```

### Source Code (repository root) — following `PLAN.md` conventions

```text
index.html                 # Single entry point (PLAN.md), links style.css + main.js (module)
style.css                  # Base styles (PLAN.md names it style.css)
main.js                    # Bootstraps app, routes views, global keyboard router

engine/                    # Pure logic — no DOM, no I/O (PLAN.md /engine; router.js -> verdict.js)
├── verdict.js             # PURE: evaluateVerdict(ruleset, packet) -> {verdict, matchedRule, rationale}
├── matchers.js            # PURE: port/CIDR/protocol/flag/geo/signature/technique matchers
├── consequences.js        # PURE: decision + packet -> consequence(s), severity-scaled
├── scoring.js             # PURE: shift performance -> pass/retry vs threshold
├── feedback.js            # PURE: builds explanation copy from a VerdictResult (PLAN.md feedback.js)
├── state.js               # Run/shift state machine + localStorage persistence (PLAN.md state.js)
└── validators.js          # PURE: content integrity (sources present, taught-before-tested)

views/                     # DOM/SVG rendering only (PLAN.md /views + its exact view names)
├── briefing.js            # Pre-shift teaching screen (PLAN.md briefing.js)
├── gameplay.js            # Inspection desk: queue, packet detail, rulebook, raw-payload, stamp (PLAN.md gameplay.js)
├── summary.js             # End-of-shift debrief + consequence traceability (PLAN.md summary.js)
└── shell.js               # Loading/empty/paused/end states, keyboard help

render/
├── packet-svg.js          # SVG rendering of packet/inspection visuals (PLAN.md: SVG, not canvas)
└── a11y.js                # Focus management, ARIA live regions, keyboard bindings

viz/                       # OPTIONAL THREE.js layer — decorative, reduced-motion-gated
└── blast-radius.js        # Animated blast radius / packet-flow ambiance; degrades to static SVG

vendor/
└── three.module.js        # Vendored THREE.js ES module (no npm install; keeps clone-and-play)

data/                      # All content as JSON (PLAN.md /data; auditable, no logic inside)
├── shifts/
│   └── day-01.json ... day-08.json   # Ruleset + briefing + packet queue per shift
├── settings.default.json
└── schema/                            # JSON Schema mirroring contracts

tests/
├── unit/                  # node --test: verdict, matchers, consequences, scoring, validators
│   └── *.test.js
└── content/
    └── shifts.validate.test.js        # Every authored packet: single correct verdict + sources

README.md                  # Clone / run / play instructions (PLAN.md "launch and play" goal)
```

**Structure Decision**: Single-project client-only static web app mirroring `PLAN.md`'s layout —
`index.html` + `style.css` + `main.js`, a pure **`engine/`**, DOM/SVG **`views/`** using `PLAN.md`'s
`briefing`/`gameplay`/`summary` names, and all content under **`data/`**. The engine is DOM-free so
it is unit-testable under `node --test` and is the sole source of verdicts (the `PLAN.md`
"UI never makes routing decisions" rule, applied to verdicts). The **`viz/`** THREE.js layer is
isolated and optional: if it is disabled (reduced-motion, low-power, or load failure) the game is
fully playable via the DOM/SVG core, preserving the constitution's accessibility guarantees.

## Complexity Tracking

| Violation / Addition | Why Needed | Simpler Alternative Rejected Because |
|----------------------|------------|--------------------------------------|
| THREE.js runtime dependency (`viz/` layer) | Directed by root `PLAN.md`; delivers the pitch's marquee "watch the blast radius" moment and packet-flow ambiance as experiential juice. | Pure CSS/SVG animation could approximate it, but `PLAN.md` explicitly calls for THREE.js and the layered approach lets us honor that without compromising the accessible DOM/SVG core. Kept strictly decorative and optional so it adds zero accessibility risk. |
| `vendor/` local copy of THREE.js | `PLAN.md` mandates "no build tools, no bundler" and clone-and-play; vendoring a local ES module satisfies both (no npm install step). | A CDN `<script>`/import would add a network dependency and break offline play; an npm+bundler setup would violate the no-build-step constraint. |
