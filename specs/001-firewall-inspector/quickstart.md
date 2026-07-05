# Quickstart & Validation Guide: Firewall Inspector

This guide proves the feature works end-to-end. It is a run/validation guide — implementation detail
lives in `tasks.md` and the code itself.

## Prerequisites

- A modern desktop browser (latest Chrome or Firefox).
- Node.js (any current LTS) — only to run the engine/content tests. Not required to *play*.
- No other install: no bundler, no framework, no backend. THREE.js ships vendored in `vendor/`
  (a local ES module) — nothing to `npm install`.

## Run the game (clone-and-play)

```bash
git clone <repo-url>
cd firewall-inspector
# Serve the folder statically (ES modules need http://, not file://):
python3 -m http.server 8000
#   ...or:  npx serve .
# Open the printed URL, e.g. http://localhost:8000/
```

**Expected**: A loading state, then Day 1's briefing, then the inspection desk with a packet queue.

## Run the tests (determinism & content integrity)

```bash
node --test tests/unit/          # pure engine + matchers + scoring
node --test tests/content/       # every authored packet has one correct verdict + sources
```

**Expected**: All tests pass. Content tests fail loudly if any shift violates an invariant
(taught-before-tested, missing source, undecidable packet, raw-view-required, etc.).

## Acceptance validation scenarios

Each maps to spec user stories / success criteria. Perform with keyboard only (SC-007).

### V1 — Core inspection loop (US1, SC-002/SC-003)
1. Start Day 1; read the briefing; enter the desk.
2. Stamp DENY on a packet that violates a visible rule → verdict confirmed correct, queue advances.
3. Stamp ALLOW on a rule-violating packet → game states it should be DENY, names the rule, explains why.
4. Finish the queue → a shift debrief appears with counts and consequences.
- **Pass when**: every stamp is judged, wrong stamps produce a rule-specific explanation, debrief shows.

### V2 — Briefing teaches before testing (US2, SC-004)
1. Advance to a day whose ruleset changed → a briefing appears *before* the first packet.
2. Confirm every rule exercised in the shift was covered by this or an earlier briefing.
- **Pass when**: no untaught rule/technique is tested; briefing explains each change with an example.

### V3 — Consequences & moral dilemma (US3, SC-005)
1. Wrongly DENY a high-value legitimate packet → morale drops; debrief attributes it to that packet.
2. Wrongly ALLOW a high-severity malicious packet → a security incident with visible blast radius,
   sized to severity.
3. Encounter a sympathetic moral-dilemma packet whose correct verdict is DENY → the verdict stays
   unambiguously DENY; tension is only in framing/consequence.
- **Pass when**: every consequence traces to its packet+rule; no unexplained penalties.

### V4 — Sneakier attacks (US4)
1. Catch a spoofed-source packet by cross-checking `expectedSource` in the inspector.
2. Recognize a fragmented payload via `fragmentGroup` signals.
3. Identify a disguised C2 beacon via advisory signature match.
- **Pass when**: each is detectable with provided tools within the clock, with a correct-verdict explanation.

### V5 — Timer, threshold & retry (FR-014, FR-011a, SC-013)
1. Enable the per-shift clock in settings; let it expire with packets left → remaining packets are
   marked "missed" with a consequence (no per-packet timeout).
2. Fail a shift's threshold → offered a retry of the same shift (no game-over); meters reset on retry.
- **Pass when**: outcomes resolve only to advance/retry; the clock is never per-packet.

### V6 — Accessibility (SC-007, FR-019/021/022)
1. Play a full shift with no pointing device.
2. Toggle light/dark; confirm verdict/flag meaning is carried by text/shape, not color alone.
3. Trigger loading, empty-queue, paused, and end states → each has a designed presentation.
- **Pass when**: all core actions are keyboard-operable and no state renders raw/blank.

### V7 — THREE.js visualization is optional (R1/R2a, Accessibility constraint)
1. Wrongly allow a malicious packet → the THREE.js blast-radius animation plays *and* the debrief
   still explains the consequence in text (the animation only illustrates it).
2. Set the OS/browser to `prefers-reduced-motion` (or disable the effects in settings) → the
   animation is replaced by a static SVG/text presentation.
3. Simulate the THREE.js module failing to load → the game remains fully playable via the DOM/SVG core.
- **Pass when**: no decision-critical information is lost with the viz layer off, and playability is
  unaffected.

## References

- Data shapes: [data-model.md](./data-model.md)
- Engine behavior: [contracts/verdict-engine.md](./contracts/verdict-engine.md)
- Content shape: [contracts/content-schema.md](./contracts/content-schema.md)
- Save format: [contracts/save-state.md](./contracts/save-state.md)
