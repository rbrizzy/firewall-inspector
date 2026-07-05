# Feature Specification: Firewall Inspector

**Feature Branch**: `001-firewall-inspector`

**Created**: 2026-07-04

**Status**: Draft

**Input**: User description: "A 'Papers, Please'-style firewall inspector. Packets queue up at your inspection point — you check headers, ports, payloads against today's ruleset and stamp ALLOW or DENY under time pressure. The rules change daily (new CVE advisory, new geo-block policy, an exec who demands his sketchy VPN work), attackers get sneakier (spoofed sources, fragmented payloads, legit-looking C2 beacons), and mistakes have consequences — block the CEO's traffic and morale drops, let ransomware through and you watch the blast radius. Also a genuinely good teaching tool for packet analysis." Directed to reuse the approach of the repository's `SPEC.md` (pre-decision briefings, detailed wrong-answer explanations, data-driven levels, keyboard-first, no runtime-generated content) while reframing every mechanic around firewall packet inspection rather than routing.

## Clarifications

### Session 2026-07-04

- Q: How should a shift end and progression work when the player does badly? → A: Each shift has
  a pass threshold (accuracy/standing); falling short means retrying that same shift, with no
  permanent game-over in v1.
- Q: What form should the "time pressure" take? → A: A single tunable per-shift clock; early days
  are generous or untimed, individual packets are never timed, and difficulty comes from the rules
  rather than the clock.
- Q: How many days (shifts) should the v1 progression ship with? → A: Approximately 8 days, roughly
  one new concept per day, matching the depth of the prior `SPEC.md`.
- Q: How should packet payloads / deep inspection be represented? → A: Both — structured labeled
  indicators and advisory signatures by default, plus an optional raw payload view for players who
  want to inspect the bytes directly.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inspect a packet and stamp a verdict (Priority: P1)

The player sits at an inspection point. A single network packet is presented with its
inspectable details (source and destination address, ports, protocol, flags, and payload
indicators). Today's ruleset is visible as a rulebook the player can consult. The player
compares the packet against the rules and stamps **ALLOW** or **DENY**. The game immediately
confirms whether the verdict was correct and, when it was wrong, explains precisely which rule
was violated or misapplied and why. The player works through a queue of packets that make up
one shift (one "day").

**Why this priority**: This is the entire core loop. A player who can inspect a packet, apply
a rule, stamp a verdict, and learn from a mistake has a complete, playable, and genuinely
educational experience — this single story is the MVP.

**Independent Test**: Load a single day with a fixed ruleset and a fixed queue of packets; play
the day start to finish using only the keyboard; confirm every correct stamp is accepted, every
incorrect stamp produces a specific rule-based explanation, and the day ends with a shift summary.

**Acceptance Scenarios**:

1. **Given** a packet that violates a visible rule (e.g. a blocked destination port), **When**
   the player stamps DENY, **Then** the verdict is confirmed correct and the shift proceeds to
   the next packet.
2. **Given** a packet that complies with every visible rule, **When** the player stamps ALLOW,
   **Then** the verdict is confirmed correct and the shift proceeds to the next packet.
3. **Given** a packet that violates a rule, **When** the player stamps ALLOW (a mistake),
   **Then** the game states the packet should have been denied, names the specific rule
   violated, and explains why the packet matched that rule.
4. **Given** the player is mid-shift, **When** they open the rulebook and the packet inspector,
   **Then** both are reachable and operable without a mouse and without losing the current packet.
5. **Given** the last packet of a shift is stamped, **When** the queue empties, **Then** a shift
   summary is shown listing decisions made, correct/incorrect counts, and consequences incurred.

---

### User Story 2 - Learn the day's ruleset from a briefing before it is tested (Priority: P2)

Before each shift, the player receives a briefing that introduces the day's ruleset and any
changes since the previous day — a new CVE advisory that bans a port or signature, a new
geo-block policy, a revoked or newly granted exception. The briefing teaches the concept behind
each new rule with a plain-language explanation and an example, so a player who reads it can
apply the rule correctly. No rule is ever tested in a shift before it has been introduced by a
briefing or established in an earlier shift.

**Why this priority**: The daily-changing ruleset is the difficulty curve and the curriculum at
the same time. Without briefings, new rules become guesswork; with them, escalation stays fair
and teaches. This is what turns a single day (P1) into a progressing game.

**Independent Test**: Start a day whose ruleset differs from the prior day; confirm a briefing
appears first, explains each new or changed rule with an example, and that every rule exercised
during the shift was covered by that briefing or a prior one.

**Acceptance Scenarios**:

1. **Given** a new day with a new rule, **When** the shift begins, **Then** the briefing is
   shown before the first packet and states what changed and why.
2. **Given** the player has read the briefing, **When** a packet exercises the newly introduced
   rule, **Then** the correct verdict is determinable using only the briefing and the packet's
   visible details.
3. **Given** a rule that was in force yesterday, **When** it applies again today, **Then** it is
   not re-taught from scratch but remains available for reference in the rulebook.

---

### User Story 3 - Face consequences and moral dilemmas from decisions (Priority: P3)

Decisions carry weight beyond a score. Denying legitimate, important traffic (the CEO's
connection) lowers organizational morale; allowing malicious traffic (ransomware, an active C2
beacon) triggers a security incident whose blast radius the player sees. Some packets arrive
wrapped in a moral dilemma — traffic that violates policy but comes from a sympathetic source
(HR investigating a colleague, an exec demanding his sketchy VPN keep working). The end-of-shift
debrief traces each consequence back to the specific packet and decision that caused it, and
consequences scale with the realistic severity of the decision.

**Why this priority**: Consequences and dilemmas are what make the proven formula compelling and
what make the teaching stick — but they only make sense once the core loop (P1) and progression
(P2) exist to attach them to.

**Independent Test**: Play a shift containing at least one high-value legitimate packet and one
high-severity malicious packet; make one wrong decision of each kind; confirm the appropriate
consequence meter changes, the blast radius / morale effect is shown and explained, and the
debrief attributes each effect to its causing decision.

**Acceptance Scenarios**:

1. **Given** a legitimate high-value packet, **When** the player wrongly denies it, **Then**
   morale decreases and the debrief attributes the drop to that specific denial.
2. **Given** a malicious high-severity packet, **When** the player wrongly allows it, **Then** a
   security incident with a visible blast radius occurs, sized to the packet's severity.
3. **Given** a moral-dilemma packet whose correct technical verdict is DENY, **When** it is
   presented, **Then** the ruleset verdict remains unambiguously DENY and the tension lives only
   in the framing and consequences, never in the correctness of the verdict.
4. **Given** a completed shift, **When** the debrief is shown, **Then** every consequence lists
   the packet and rule that produced it, with no unexplained penalties.

---

### User Story 4 - Handle sneakier attacks with deeper inspection (Priority: P4)

As shifts progress, attackers get harder to catch: spoofed source addresses, payloads
fragmented across packets, and malicious traffic disguised to look legitimate (a C2 beacon
styled like ordinary web traffic). Catching these requires looking past the obvious fields —
cross-checking a source against expected origins, noticing a fragmented or malformed structure,
or matching a payload against a known-bad signature from an advisory. Each such technique is
introduced (per P2) before it is tested, and the inspection tools needed to detect it are always
available to the player.

**Why this priority**: This is the top of the difficulty curve — it deepens the packet-analysis
skill the game teaches. It builds on all prior stories and is the last layer to add.

**Independent Test**: Play a shift containing a spoofed-source packet, a fragmented-payload case,
and a disguised-C2 packet; confirm each was introduced beforehand, is detectable using the
provided inspection tools within the time allowed, and produces a correct-verdict explanation.

**Acceptance Scenarios**:

1. **Given** a packet with a spoofed source, **When** the player cross-checks the source against
   the expected origin shown by the inspector, **Then** the mismatch is discoverable and leads to
   the correct verdict.
2. **Given** a payload fragmented across multiple packets, **When** the relevant packets are
   inspected, **Then** the game provides enough signal to recognize the fragmentation and reach
   the correct verdict.
3. **Given** a C2 beacon disguised as ordinary traffic, **When** its payload or destination is
   checked against the day's advisory signatures, **Then** it is identifiable as malicious.

---

### Edge Cases

- **Shift clock ends with packets left**: If the per-shift clock runs out while packets remain in
  the queue, those packets are resolved in a defined, disclosed way (counted as missed, each with
  its own consequence) rather than silently guessing verdicts. Individual packets are never timed
  out on their own.
- **Player fails a shift's pass threshold**: The player is offered a retry of the same shift; the
  debrief shows the threshold and how the player fell short. There is no permanent game-over.
- **Ambiguous-looking but deterministic packet**: A packet may look ambiguous to the player but
  its correct verdict is always computable from the ruleset; the game never grades an
  intentionally undecidable packet.
- **Conflicting rules**: When two rules could both apply (e.g. a geo-block and an exec
  exception), the ruleset defines an explicit precedence so exactly one verdict is correct, and
  the briefing/rulebook communicates that precedence.
- **Player denies everything (or allows everything)**: A blanket strategy is penalized through
  consequences (blocking legitimate traffic hurts morale; allowing everything invites incidents),
  so neither degenerate strategy succeeds.
- **Empty or interrupted state**: Loading, an empty queue, a paused shift, and end-of-day each
  have an explicit, designed presentation; no raw or blank screen reaches the player.
- **Player quits mid-shift**: Progress through the current run is preserved locally so the player
  can resume, or the shift is cleanly restarted, without corrupting standing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST present packets one at a time from a queue, each showing its
  inspectable attributes (at minimum: source address, destination address, source/destination
  ports, protocol, relevant flags, and structured payload indicators) needed to judge it against
  the ruleset, with an optional raw payload view available on demand (see FR-025).
- **FR-002**: The game MUST let the player stamp exactly one verdict — ALLOW or DENY — per packet
  and MUST advance to the next packet only after a verdict is recorded (or the packet is resolved
  by an expired timer per FR-014).
- **FR-003**: The game MUST determine the correct verdict for every packet deterministically from
  the active ruleset and the packet's attributes, with no randomized or fuzzy grading.
- **FR-004**: On an incorrect verdict, the game MUST explain the mistake specifically — naming the
  rule that applied and why the packet did or did not match it — not merely mark it wrong.
- **FR-005**: The game MUST make the active ruleset available to the player on demand during a
  shift (a consultable rulebook) without discarding the packet under inspection.
- **FR-006**: The game MUST present a briefing before any shift whose ruleset differs from the
  prior shift, explaining each new or changed rule in plain language with an example.
- **FR-007**: The game MUST NOT test a rule or attacker technique in a shift before it has been
  introduced by a briefing or established in an earlier shift.
- **FR-008**: The game MUST change the ruleset across shifts (adding, removing, or amending rules
  such as CVE-driven port/signature bans, geo-block policies, and granted or revoked exceptions).
- **FR-009**: When multiple rules could apply to one packet, the ruleset MUST define an explicit
  precedence such that exactly one verdict is correct, and that precedence MUST be discoverable by
  the player.
- **FR-010**: The game MUST apply consequences to wrong decisions that scale with the realistic
  severity of the decision (e.g. allowing an active C2 beacon is more severe than misreading a
  benign oddity), tracked via player-visible standing (such as morale and security-incident
  meters).
- **FR-011**: The game MUST present an end-of-shift debrief that lists the decisions made and
  attributes every consequence to the specific packet and rule that caused it, with no
  unexplained penalties and no penalty applied for information the player could not access at
  decision time.
- **FR-011a**: Each shift MUST have a defined pass threshold expressed in terms of the player's
  shift performance (such as verdict accuracy and/or resulting standing). Meeting the threshold
  advances the player to the next shift; failing it MUST let the player retry the same shift.
  The game MUST NOT impose a permanent game-over in v1, and the threshold MUST be shown to the
  player in the debrief.
- **FR-012**: The game MUST include moral-dilemma packets whose framing is sympathetic but whose
  correct ruleset verdict remains unambiguous; the tension MUST reside in the consequences and
  narrative, never in the correctness of the verdict.
- **FR-013**: The game MUST introduce escalating attacker techniques (including spoofed sources,
  fragmented payloads, and disguised C2 traffic) and MUST provide inspection tools sufficient to
  detect each technique it tests.
- **FR-014**: Time pressure MUST take the form of a single tunable per-shift clock, not a
  per-packet countdown; individual packets MUST NOT be individually timed. Early shifts MUST be
  generous or untimed, the clock MUST NOT be the primary source of difficulty, and when the shift
  clock ends any unprocessed packets MUST be resolved in a defined, disclosed way (counted as
  missed with their own consequence) rather than by guessing a verdict. A player who knows the
  day's rules MUST be able to clear the queue within the clock provided.
- **FR-015**: All rulesets, shift scripts, packet scenarios, attacker techniques, and narrative
  events MUST be defined as structured, human-editable content, separate from the logic that
  evaluates verdicts.
- **FR-016**: Every scenario that references a real-world vulnerability or technique MUST record a
  source reference (such as a CVE ID, RFC section, or catalogued technique) in its underlying
  content, whether or not it is shown to the player.
- **FR-017**: The game MUST NOT generate packet content, verdicts, or narrative events at runtime
  from an external AI service; all content is authored and verified before release.
- **FR-018**: The game MUST run in a standard desktop web browser with no installation and no
  account or login required to play.
- **FR-019**: The player MUST be able to perform every core action — reviewing a packet, consulting
  the rulebook, using the inspector, and stamping a verdict — using the keyboard alone.
- **FR-020**: Feedback and explanations MUST be written in plain language; networking jargon is
  used only where the term itself is being taught, in which case it MUST be defined on first use.
- **FR-021**: Every interface state — loading, active inspection, empty queue, paused shift, and
  end-of-day — MUST have an explicit, designed presentation.
- **FR-022**: Decision-critical meaning (such as a flagged packet or an ALLOW/DENY verdict) MUST
  NOT be conveyed by color alone; it MUST also be carried by text, shape, or label.
- **FR-023**: The game MUST persist run progress and player standing locally so a player can leave
  and resume without a backend or account.
- **FR-024**: All packet data, addresses, and topologies MUST be synthetic and fictional, and the
  game MUST NOT make live network calls, scan real networks, or process real captured traffic or
  personal data.
- **FR-025**: In addition to the structured payload indicators of FR-001, the game MUST offer an
  optional raw payload view (a readable byte/text excerpt) that the player can open on demand to
  inspect a packet's payload directly. This view MUST be optional — never required to reach the
  correct verdict, since the structured indicators and advisory signatures are sufficient — and
  MUST be reachable by keyboard without discarding the packet under inspection.
- **FR-026**: The v1 progression MUST ship with approximately 8 shifts, sequenced so that each
  shift introduces at most about one new rule type or attacker technique over the prior shift,
  keeping the difficulty curve and the teaching sequence identical.

### Key Entities *(include if data involved)*

- **Packet**: A single item to be judged. Attributes include source/destination address,
  source/destination ports, protocol, flags, structured payload indicators, and an optional raw
  payload excerpt (see FR-025), plus a hidden ground-truth classification (benign /
  policy-violating / malicious) used to score the verdict, and any disguise or attacker-technique
  markers.
- **Rule**: A single clause of a ruleset (e.g. "deny destination port 3389", "block traffic from
  region X", "allow the finance VPN exception"). Carries its matching criteria, its resulting
  verdict when matched, its precedence relative to other rules, and an optional source reference.
- **Ruleset (Shift/Day)**: The set of rules in force for one shift, plus the shift's briefing
  content and its queue of packet scenarios. Ordered into a progression of shifts of increasing
  complexity.
- **Briefing**: The pre-shift teaching content introducing new or changed rules and techniques,
  with plain-language explanation and worked examples.
- **Verdict**: The player's ALLOW/DENY decision on a packet, compared against the packet's correct
  outcome to determine correctness and any consequence.
- **Consequence**: An effect produced by a decision (morale change, security incident with a blast
  radius, reputational effect), with a severity and a link back to its causing packet and rule.
- **Player Standing**: The player's tracked state across a run — correctness record, morale and
  security-incident meters, and progression through shifts, evaluated against each shift's pass
  threshold (see FR-011a) to decide advance-or-retry.
- **Narrative/Moral-Dilemma Event**: A scripted, fictional situation attached to a packet or shift
  that frames a decision with human stakes without altering the packet's correct verdict.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new player can start the game and complete their first full shift within 10
  minutes without external instructions, using only the in-game briefing and rulebook.
- **SC-002**: 100% of packets have a single deterministically correct verdict; zero packets are
  gradeable in more than one way.
- **SC-003**: 100% of incorrect verdicts produce a specific explanation that names the governing
  rule and why the packet matched or did not match it.
- **SC-004**: 100% of rules and attacker techniques are introduced by a briefing or an earlier
  shift before the shift in which they are first tested.
- **SC-005**: 100% of end-of-shift consequences are traceable by the player to the specific packet
  and decision that caused them.
- **SC-006**: A player who has read the day's briefing can reach the correct verdict on every
  packet within the day's time allowance, measured by playtesters achieving at least a 90% correct
  rate on a day they have been briefed on.
- **SC-007**: Every core action is completable using the keyboard alone, verified by a full shift
  played without a pointing device.
- **SC-008**: Across the shipped progression, difficulty increases by introducing new teachable
  concepts, verified by each shift adding at least one new rule or technique over the prior shift
  rather than only reducing available time.
- **SC-009**: 100% of scenarios referencing real-world vulnerabilities or techniques carry a
  verifiable source reference in their content.
- **SC-010**: After completing the shipped progression, a playtester can correctly explain, for a
  set of unseen sample packets, why each should be allowed or denied — demonstrating transfer of
  packet-analysis skill, not just level memorization.
- **SC-011**: The game loads and is playable in a standard desktop browser with no install and no
  login, verified on at least two major browsers.
- **SC-012**: 100% of packets are solvable to the correct verdict using the structured indicators
  and advisory signatures alone; the optional raw payload view is never required, verified by
  completing every shift without opening it.
- **SC-013**: Every shift is either passable or retryable — 100% of shift outcomes resolve to
  "advance" (threshold met) or "retry" (threshold missed), with no permanent game-over reachable
  in v1.

## Assumptions

- **Scope of v1** *(resolved — see Clarifications)*: The shipped progression is approximately 8
  shifts, each introducing about one new rule type or attacker technique, matching the depth of the
  repository's prior `SPEC.md` scope (FR-026). The precise per-shift content lineup is finalized
  during planning.
- **Time pressure** *(resolved — see Clarifications)*: Time pressure is a single tunable per-shift
  clock, generous or off in early shifts and never per-packet, so the clock is never the primary
  difficulty lever (FR-014), consistent with the constitution.
- **Fail/retry model** *(resolved — see Clarifications)*: Each shift has a pass threshold; failing
  it lets the player retry the same shift, and there is no permanent game-over in v1 (FR-011a). The
  exact numeric threshold values are a tuning decision for planning/playtesting.
- **Payload inspection** *(resolved — see Clarifications)*: Deep inspection is presented as
  structured indicators plus advisory signatures by default, with an optional raw payload view for
  players who want to inspect bytes directly; the raw view is never required to succeed (FR-025).
- **Single-player, offline**: The game is single-player, requires no network connectivity to play,
  no accounts, and no leaderboards in v1.
- **Desktop-first**: Desktop browser is the target; mobile/touch optimization is out of scope for
  v1.
- **Content authoring**: New shifts and scenarios are added by editing structured content, not by
  changing game logic; a dedicated content-editor UI is out of scope for v1.
- **Fictional framing**: All companies, executives, and colleagues in narrative events are
  fictional; scenarios modeled on real CVEs/techniques use synthetic packet data only.
- **Audio and accessibility beyond keyboard/color**: Audio is out of scope for v1; accessibility
  commitments in v1 are keyboard operability, plain language, explicit states, and not relying on
  color alone.

## Out of Scope (v1)

- User accounts, cloud save, or leaderboards.
- Live packet capture, real network scanning, or importing real traffic.
- Runtime AI generation of packets, verdicts, or narrative.
- A visual content/level editor (content is edited directly as structured data).
- Mobile/touch-optimized layouts and audio.
- Simulation of live protocol behavior beyond what a single packet's inspectable attributes require.
