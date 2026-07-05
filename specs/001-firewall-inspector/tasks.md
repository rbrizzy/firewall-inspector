---
description: "Task list for Firewall Inspector implementation"
---

# Tasks: Firewall Inspector

**Input**: Design documents from `/specs/001-firewall-inspector/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: Automated tests ARE included for the pure engine, scoring, and content validators — the
spec's Success Criteria (SC-002/003/004/009/012/013) and the constitution (Principles I, II, IV, VI)
require these to be machine-verifiable. UI, keyboard, and the THREE.js viz layer are validated
manually via `quickstart.md` (no automated DOM/e2e tests in v1).

**Organization**: Tasks are grouped by user story (US1–US4 from spec.md) so each story is an
independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US4; Setup/Foundational/Polish tasks carry no story label
- All paths are repo-root-relative and follow the `PLAN.md`-guided structure in plan.md

## Path Conventions

Single-project client-only static web app (per plan.md): `index.html`, `style.css`, `main.js`,
`engine/`, `views/`, `render/`, `viz/`, `vendor/`, `data/`, `tests/` at repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project skeleton, no-build-step run harness, and test wiring.

- [X] T001 Create the repository directory structure per plan.md (`engine/`, `views/`, `render/`, `viz/`, `vendor/`, `data/shifts/`, `data/schema/`, `tests/unit/`, `tests/content/`)
- [X] T002 Create `index.html` as the single entry point, linking `style.css` and loading `main.js` as an ES module, with a root app container and no-JS fallback message
- [X] T003 [P] Create `style.css` with base reset and theme tokens (light/dark via `prefers-color-scheme`, high-contrast-friendly, focus-ring styles)
- [X] T004 [P] Vendor THREE.js as a local ES module at `vendor/three.module.js` (no npm/CDN) and add a `vendor/README.md` noting version/source
- [X] T005 [P] Add `package.json` with a `test` script running `node --test tests/unit/ tests/content/` (dev-only; no runtime deps, no bundler)
- [X] T006 [P] Create `README.md` with clone-and-play instructions (static serve on `http://`, run tests) per quickstart.md
- [X] T007 [P] Create `data/settings.default.json` with defaults (`clockEnabled`, `theme`, `reducedMotion`, `effectsEnabled`) per contracts/save-state.md

**Checkpoint**: Repo serves a blank shell in a browser; `npm test` runs (0 tests) without error.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure engine, content schema, state machine, and view/render scaffolding that ALL
user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T008 [P] Define JSON Schema files in `data/schema/` for Packet, Rule, Ruleset, Briefing, Shift, Threshold, Source per data-model.md and contracts/content-schema.md
- [X] T009 [P] Implement pure field matchers in `engine/matchers.js` (`matchPort`, `ipInCidr`, `matchProtocol`, `matchFlags`, `matchGeo`, `matchSignature`, `matchTechnique`) per contracts/verdict-engine.md
- [X] T010 Implement the pure verdict engine `engine/verdict.js` (`evaluateVerdict(ruleset, packet)` with priority ordering + `defaultVerdict` fallthrough, returns `{verdict, matchedRuleId, rationale}`) — depends on T009
- [X] T011 [P] Implement `engine/feedback.js` (`explainMistake` + rulebook/explanation copy builders) per contracts/verdict-engine.md
- [X] T012 [P] Implement `engine/validators.js` (`validateContent(shifts)` asserting the 6 invariants in data-model.md) — depends on T009, T010
- [X] T013 Implement `engine/state.js` — run/shift state machine (LOADING→BRIEFING→INSPECTING→DEBRIEF→advance/retry, PAUSED) plus `localStorage` load/save at shift boundaries per contracts/save-state.md
- [X] T014 [P] Implement `render/a11y.js` (focus management, ARIA live-region announcer, global keyboard binding registry) per research.md R10
- [X] T015 [P] Implement `render/packet-svg.js` base SVG renderer for packet/inspection visuals (DOM/SVG, no canvas)
- [X] T016 Implement `views/shell.js` (loading, empty-queue, paused, end, and keyboard-help states) — depends on T014
- [X] T017 Implement `main.js` bootstrap: load settings + content, initialize `engine/state.js`, mount the view router and global keyboard router — depends on T013, T014, T016
- [X] T018 [P] Author one minimal sample shift `data/shifts/day-01.json` (ruleset + briefing + ~10–15 packets) validating against T008 schema, for use by US1

**Checkpoint**: Engine callable and unit-testable; app boots to a briefing/shell; foundation ready.

---

## Phase 3: User Story 1 - Inspect a packet and stamp a verdict (Priority: P1) 🎯 MVP

**Goal**: A complete single-day inspection loop — review a packet, consult the rulebook, stamp
ALLOW/DENY (immediate commit + advance), get a specific wrong-answer explanation, and see a shift
summary.

**Independent Test**: Load day-01, play the queue keyboard-only; every correct stamp advances, every
wrong stamp explains the governing rule, and a debrief shows counts at the end (quickstart V1).

### Tests for User Story 1

- [X] T019 [P] [US1] Unit tests for `engine/matchers.js` (positive/negative/boundary: port ranges, CIDR edges, flag subsets, protocol equality) in `tests/unit/matchers.test.js`
- [X] T020 [P] [US1] Unit tests for `engine/verdict.js` (priority ordering, exception-overrides-deny, default fallthrough, determinism) in `tests/unit/verdict.test.js`
- [X] T021 [P] [US1] Content validation test loading `data/shifts/*.json` asserting single-correct-verdict + sources present in `tests/content/shifts.validate.test.js`

### Implementation for User Story 1

- [X] T022 [US1] Implement `views/gameplay.js` inspection desk: render current packet fields + structured indicators via `render/packet-svg.js`, packet queue position — depends on T015, T017
- [X] T023 [US1] Add the consultable rulebook panel to `views/gameplay.js` (keyboard-openable, does not discard current packet) per FR-005
- [X] T024 [US1] Implement ALLOW/DENY stamping in `views/gameplay.js` (keyboard A/D, immediate commit + advance), calling `engine/verdict.js` for correctness — depends on T010, T022
- [X] T025 [US1] Render wrong-answer feedback via `engine/feedback.js` naming the governing rule and why it matched (ARIA-announced) per FR-004 — depends on T011, T024
- [X] T026 [US1] Implement `views/summary.js` end-of-shift debrief listing decisions and correct/incorrect counts — depends on T013
- [X] T027 [US1] Wire the day-01 shift end (queue empty) to the debrief and back to the shell in `engine/state.js`/`main.js` — depends on T026

**Checkpoint**: User Story 1 fully playable end-to-end on day-01, keyboard-only. **This is the MVP.**

---

## Phase 4: User Story 2 - Learn the day's ruleset from a briefing (Priority: P2)

**Goal**: Each changed day opens with a briefing that teaches new/changed rules before they are
tested; rules escalate day-to-day and prior rules remain in the rulebook.

**Independent Test**: Enter a day whose ruleset changed → briefing appears first, explains each change
with an example, and every rule exercised was taught here or earlier (quickstart V2).

### Tests for User Story 2

- [X] T028 [P] [US2] Extend `engine/validators.js` tests: assert taught-before-tested across shifts (a technique/rule used before its introducing shift fails) in `tests/content/shifts.validate.test.js`

### Implementation for User Story 2

- [X] T029 [US2] Implement `views/briefing.js` pre-shift teaching screen (title, plain-language body, worked examples, keyboard "begin shift") per FR-006 — depends on T017
- [X] T030 [US2] Add "ruleset changed since prior day" detection in `engine/state.js` to decide whether to show the briefing — depends on T013
- [X] T031 [US2] Enforce the `introducesConcepts` gate in `engine/validators.js` (runtime guard) so content failing taught-before-tested is rejected on load — depends on T012
- [X] T032 [P] [US2] Author `data/shifts/day-02.json` and `data/shifts/day-03.json` introducing new rule types (e.g. CVE port ban, geo-block, finance-VPN exception) with briefings and `source` fields, validating against schema
- [X] T033 [US2] Ensure the rulebook in `views/gameplay.js` shows all in-force rules (new + carried-over) in priority order per FR-009 — depends on T023

**Checkpoint**: Days 1–3 playable in sequence with briefings gating new rules.

---

## Phase 5: User Story 3 - Consequences and moral dilemmas (Priority: P3)

**Goal**: Wrong decisions produce severity-scaled consequences (morale, security incident + blast
radius) traceable in the debrief; moral-dilemma packets frame decisions without changing verdicts;
per-shift pass threshold decides advance vs retry.

**Independent Test**: Wrongly deny a high-value legit packet (morale drops) and wrongly allow a
high-severity malicious packet (incident + blast radius); debrief attributes each to its packet;
a dilemma packet's correct verdict stays unambiguous (quickstart V3, V5).

### Tests for User Story 3

- [X] T034 [P] [US3] Unit tests for `engine/consequences.js` (severity scaling by ground truth; correct verdict → no consequence) in `tests/unit/consequences.test.js`
- [X] T035 [P] [US3] Unit tests for `engine/scoring.js` (advance vs retry at threshold boundaries; meters reset semantics) in `tests/unit/scoring.test.js`

### Implementation for User Story 3

- [X] T036 [P] [US3] Implement pure `engine/consequences.js` (`computeConsequences(packet, playerVerdict, correctVerdict)` → severity-scaled consequences linked to packet+rule) per FR-010/FR-011
- [X] T037 [P] [US3] Implement pure `engine/scoring.js` (`scoreShift(standing, threshold)` → `{outcome: advance|retry, detail}`) per FR-011a
- [X] T038 [US3] Add per-shift morale + security-incident meters (reset each shift) and a run-level tally to `engine/state.js` per research.md R7 — depends on T013, T036
- [X] T039 [US3] Extend `views/summary.js` debrief with full consequence traceability (each consequence → its packet + rule + explanation) and the pass/retry outcome vs threshold — depends on T026, T037, T038
- [X] T040 [US3] Render moral-dilemma narrative framing in `views/gameplay.js` (sympathetic context, verdict unchanged) per FR-012 — depends on T022
- [X] T041 [US3] Implement the optional THREE.js `viz/blast-radius.js` layer (animated blast radius + packet-flow ambiance) consuming consequence severity, gated by `prefers-reduced-motion`/`effectsEnabled`, with static SVG/text fallback per research.md R1/R2a — depends on T004, T036
- [X] T042 [US3] Wire retry-vs-advance flow in `engine/state.js`/`main.js` (fail threshold → retry same shift with meters reset; no game-over) per FR-011a/SC-013 — depends on T037, T038
- [X] T043 [P] [US3] Author dilemma + high-severity packets into `data/shifts/*.json` (CEO legit traffic, ransomware/C2, HR-investigation exfil framing) with `groundTruth` and `source`

**Checkpoint**: Consequences, meters, dilemmas, blast-radius viz, and pass/retry all working; viz
fully optional.

---

## Phase 6: User Story 4 - Sneakier attacks with deeper inspection (Priority: P4)

**Goal**: Spoofed sources, fragmented payloads, and disguised C2 are detectable via deeper inspection
tools (expected-source cross-check, fragment grouping, advisory signatures) and an optional raw
payload view — each introduced before tested.

**Independent Test**: A spoofed-source, a fragmented-payload, and a disguised-C2 packet are each
catchable with provided tools within the clock and yield correct-verdict explanations (quickstart V4).

### Tests for User Story 4

- [X] T044 [P] [US4] Unit tests for technique detection in `engine/matchers.js`/`engine/verdict.js` (spoof via expectedSource, fragment grouping, C2 signature match) in `tests/unit/techniques.test.js`
- [X] T045 [P] [US4] Content test asserting no packet requires `rawPayload` to reach the correct verdict (SC-012) in `tests/content/shifts.validate.test.js`

### Implementation for User Story 4

- [X] T046 [US4] Extend `engine/matchers.js`/`engine/verdict.js` for technique-aware evaluation (spoofed-source mismatch, `fragmentGroup`, disguised-C2 signature) per data-model.md — depends on T009, T010
- [X] T047 [US4] Add the deep inspector to `views/gameplay.js`: expected-source cross-check, fragment-group view, signature highlighting (keyboard-reachable) per FR-013 — depends on T022
- [X] T048 [US4] Add the optional raw-payload view to `views/gameplay.js` (keyboard-openable, never required, does not discard packet) per FR-025 — depends on T022
- [X] T049 [P] [US4] Author `data/shifts/day-04.json`..`day-06.json` introducing spoofing, fragmentation, and disguised C2 with briefings and `source` fields

**Checkpoint**: All four user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Complete the 8-day arc, settings, and final validation.

- [X] T050 [P] Author remaining shifts `data/shifts/day-07.json` and `day-08.json` to complete the ~8-day progression, each adding ~one concept (FR-026), all validating against schema + `validateContent`
- [X] T051 [P] Implement a settings screen (clock toggle, theme, reduced motion, effects toggle) reading/writing `localStorage` per contracts/save-state.md
- [X] T052 [P] Implement the tunable per-shift clock in `engine/state.js`/`views/gameplay.js` (generous/off early; on expiry mark remaining packets MISSED with consequence; no per-packet timer) per FR-014
- [X] T053 [P] Add save-state boot robustness tests (empty/valid/malformed/unknown-version → playable) in `tests/unit/state.test.js` per contracts/save-state.md
- [ ] T054 [P] Audit accessibility across all views (keyboard-only full run, no color-only meaning, visible focus, `prefers-reduced-motion`) per FR-019/021/022 and quickstart V6 — *implementation complete (keyboard router, ARIA live-region announcer, focus management, verdicts/flags carry text+shape not color, reduced-motion gating); a manual keyboard/screen-reader audit in a browser remains*
- [ ] T055 Run all quickstart.md validation scenarios (V1–V7) end-to-end on latest Chrome and Firefox and record results — *headless equivalents pass (full 8-shift engine playthrough, static-serve asset check, save-state robustness); manual cross-browser (Chrome+Firefox) run of V1–V7 remains*
- [X] T056 [P] Finalize `README.md` with the full play/test/authoring guide and a note superseding the legacy root `PLAN.md`/`SPEC.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phases 3–6)**: All depend on Foundational. In priority order P1→P2→P3→P4; US1 is
  the MVP. US2–US4 build on US1's gameplay view but each remains independently testable.
- **Polish (Phase 7)**: Depends on the user stories it touches (content, clock, settings).

### User Story Dependencies

- **US1 (P1)**: Only Foundational. Delivers the MVP.
- **US2 (P2)**: Foundational + reuses US1's rulebook/gameplay; adds briefing + gating.
- **US3 (P3)**: Foundational + US1 gameplay/summary; adds consequences, meters, viz, scoring.
- **US4 (P4)**: Foundational + US1 gameplay; adds technique detection + deep inspector.

### Within Each User Story

- Tests (where present) can be written alongside/before implementation; engine tests (T019–T021,
  T034–T035, T044–T045) do not depend on views.
- Engine (pure) before views; views before end-to-end wiring; content authorable in parallel with code.

### Parallel Opportunities

- Setup: T003–T007 in parallel.
- Foundational: T008, T009, T011, T014, T015, T018 in parallel; T010→(depends T009); T012→(T009,T010); T013 before T016/T017.
- US1 tests: T019–T021 in parallel.
- US3 engine: T034–T037 in parallel; content (T043) parallel with code.
- US4 tests: T044–T045 in parallel; content (T049) parallel.
- Polish: T050–T054, T056 largely parallel.

---

## Parallel Example: User Story 1

```bash
# Engine/content tests for US1 together (all different files):
Task: "Unit tests for engine/matchers.js in tests/unit/matchers.test.js"       # T019
Task: "Unit tests for engine/verdict.js in tests/unit/verdict.test.js"          # T020
Task: "Content validation test in tests/content/shifts.validate.test.js"        # T021
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational → Phase 3 (US1).
2. **STOP and VALIDATE**: play day-01 keyboard-only against quickstart V1.
3. This is a demoable, genuinely educational slice: inspect → stamp → learn.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → MVP (single day, full loop). Demo.
3. US2 → briefings + escalating daily rules (days 1–3). Demo.
4. US3 → consequences, meters, moral dilemmas, blast-radius viz, pass/retry. Demo.
5. US4 → sneakier attacks + deep inspector. Demo.
6. Polish → full 8-day arc, settings, clock, cross-browser + accessibility sign-off.

### Notes

- [P] tasks = different files, no incomplete dependencies.
- Keep verdict/consequence logic in the pure `engine/` modules; views never decide correctness.
- The THREE.js `viz/` layer is always optional — verify the game is fully playable with it off.
- Author content as data only; run `validateContent` (and the content test) after every shift added.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
