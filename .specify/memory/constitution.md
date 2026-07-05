<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Rationale: MINOR — added a first-class "Accessibility & UX Standards" section, promoting
  UX/accessibility guidance carried in the source CONSTITUTION.md (keyboard navigation,
  in-browser play, explicit interface states, plain-English feedback) that the initial pass
  had only partially folded into Principle III. No existing principle was removed or redefined.
- Modified principles: none (Core Principles I–VI unchanged from 1.0.0)
- Added sections:
  - Accessibility & UX Standards
- Removed sections: none
- Prior ratification (1.0.0) added:
  - Core Principles I–VI (Technical Ground Truth Is Non-Negotiable; Deterministic Judgment,
    Ambiguous Stakes; Consequences Are Visible, Explained, and Proportionate; Escalating
    Complexity Is the Curriculum; Time Pressure Creates Tension, Never Obscures Truth;
    Rules and Scenarios Are Data, Audited and Editable)
  - Security & Educational Domain Constraints
  - Development Workflow & Quality Gates
  - Governance
- Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ no change needed (Constitution Check gate is
    generic and reads from this file at plan time)
  - .specify/templates/spec-template.md — ✅ no change needed (no principle-specific mandatory
    sections introduced beyond what the template already supports)
  - .specify/templates/tasks-template.md — ✅ no change needed (task categorization already
    supports per-story tests/implementation; no new task category required)
  - No .specify/templates/commands/*.md directory exists in this project — nothing to update
- Follow-up TODOs: none
-->

# Firewall Inspector Constitution

## Core Principles

### I. Technical Ground Truth Is Non-Negotiable

Every packet, header field, port, protocol behavior, CVE reference, and rule evaluation MUST
reflect real-world networking and security behavior. The game MUST NOT fabricate protocol
semantics, invent CVEs, or simplify a technical detail in a way that teaches something false,
even when the false simplification would be more dramatic or easier to implement. Every
ruleset mechanic (port matching, IP/CIDR matching, protocol/flag inspection, payload
signatures) MUST be deterministic and correctly implemented against the real specification it
claims to represent (RFC, CVE advisory, or documented attack technique). When a scenario is
inspired by a real vulnerability or technique, it MUST cite that source (CVE ID, RFC section,
or MITRE ATT&CK technique ID) in the underlying data, even if not shown to the player.

Rationale: the game's credibility as a teaching tool collapses the moment a player learns
something that isn't true; "good enough for the joke" is not good enough here.

### II. Deterministic Judgment, Ambiguous Stakes

Whether a packet violates the active ruleset MUST always be a deterministic, computable fact
— never a matter of designer whim or a hidden dice roll. The moral and narrative tension in the
game (the CEO's sketchy VPN, HR's exfil investigation, an exec applying pressure) MUST live
entirely in the consequences and framing surrounding a correct technical judgment, never in the
judgment itself. A sympathetic packet that violates the ruleset is still a violation; the drama
comes from what the player chooses to do about that fact, not from the fact being fuzzy.

Rationale: this is the Papers, Please contract with the player — the game can make you feel
conflicted, but it must never lie to you about what the rules say.

### III. Consequences Are Visible, Explained, and Proportionate

Every ALLOW/DENY decision that produces a consequence (morale loss, security incident, blast
radius, reputational hit) MUST be traceable by the player to the specific packet and rule that
caused it. Consequences MUST be explained in terms of what happened and why, not delivered as a
bare score penalty. Consequences MUST scale with the realistic severity of the underlying
decision — letting through an active C2 beacon is not the same magnitude of failure as
misreading a benign but oddly-shaped packet — and MUST never be applied retroactively for
information the player had no way to access at decision time.

Rationale: unexplained punishment teaches fear, not skill; the game exists to build
packet-analysis intuition, and that requires a clear causal chain from decision to outcome.

### IV. Escalating Complexity Is the Curriculum

Difficulty MUST increase by introducing new, individually-teachable concepts (a new header
field to check, a new attacker technique, a new rule type) rather than by raising ambiguity,
hiding information, or shortening reaction time alone. Each day's new ruleset or new threat
behavior MUST be introduced with enough in-fiction signal (updated rulebook, advisory memo,
briefing) that a player who reads it can apply it correctly. A concept MUST NOT be tested
before it has been taught, either explicitly through a briefing or advisory, or through a prior
day's worked example.

Rationale: mirrors the proven Papers, Please difficulty curve, and doubles as the game's
pedagogical sequencing — the two must be the same curve, not two competing ones.

### V. Time Pressure Creates Tension, Never Obscures Truth

Timers, queue pressure, and multitasking MUST be tunable and MUST NOT be the primary mechanism
by which the game becomes harder to play correctly. A player who has correctly internalized the
current day's rules and threat patterns MUST be able to reach the correct ALLOW/DENY verdict on
any packet within the time given, using only information the game makes available. Tools that
make correct analysis possible under pressure — rulebook lookup, packet inspector, search or
filter — MUST always be one input away, and MUST NOT be removed as a difficulty lever.

Rationale: separates "hard because you have to think fast" (fun, and authentic to the genre)
from "hard because information was hidden" (frustrating, and teaches nothing).

### VI. Rules and Scenarios Are Data, Audited and Editable

Rulesets, day scripts, packet scenarios, attacker techniques, and narrative events MUST live in
structured, human-editable data, not hardcoded in game logic, with the rule-evaluation engine
implemented as a separate, pure, independently testable component. Every scenario that
references a real-world technique or vulnerability MUST carry a `source` field. No packet
content, rule outcome, or narrative event MUST be generated at runtime by an external AI
service — all content is pre-authored and verified before it ships.

Rationale: keeps "is this actually teaching the right thing" a reviewable question against the
data, instead of a matter of trust in whatever the engine happens to produce at runtime.

## Security & Educational Domain Constraints

- The game MUST teach defensive analysis skills (recognizing and correctly classifying
  traffic); it MUST NOT function as a working how-to guide for evading real detection systems.
  Attacker techniques depicted MUST stay at the level of detail found in public security
  education material (CVE advisories, vendor write-ups, MITRE ATT&CK), not novel evasion
  research.
- The game MUST NOT make live network calls, scan real networks, or process real captured
  traffic containing real IPs or PII. All packets, PCAP-like data, and topologies are synthetic
  and fictional, even when modeled on real CVEs or techniques.
- Exec, HR, and other moral-dilemma narrative content MUST avoid real people, companies, or
  ongoing incidents; fictional framing only.

## Accessibility & UX Standards

- The game MUST run in a standard desktop web browser with no install step and no account or
  login required to play.
- All core inspection actions — reviewing a packet, opening the rulebook or inspector, and
  stamping ALLOW or DENY — MUST be fully operable by keyboard, not mouse-only.
- Feedback and explanations MUST be written in plain English. Networking jargon is permitted
  only where the term itself is the thing being taught, in which case it MUST be defined in
  context on first use.
- Every interface state — loading, error, empty queue, and end-of-day — MUST have an explicit,
  designed presentation; no raw or blank states may reach the player.
- Color MUST NOT be the sole carrier of decision-critical meaning (e.g. a flagged packet or an
  ALLOW/DENY verdict); such meaning MUST also be conveyed by text, shape, or label so the game
  remains readable to color-blind players.

Rationale: an educational game only teaches the people who can actually reach and operate it;
accessibility and clear interface states are part of "it teaches," not polish deferred to later.

## Development Workflow & Quality Gates

- Every new "day" (ruleset plus scenario set) MUST be playable start to finish before merge,
  with the rule-evaluation logic covered by tests that assert the correct ALLOW/DENY verdict for
  every scripted packet.
- Every scenario referencing a real CVE, RFC, or attack technique MUST have that reference
  verified against the primary source before merge.
- New rule types or packet fields MUST ship with an in-fiction teaching moment (briefing,
  advisory, or debrief) before or within the same day they are first tested.
- Difficulty and complexity additions are reviewed against Principle IV: if a change makes the
  game harder without being individually teachable, it MUST be rejected or reframed before
  merge.

## Governance

This constitution supersedes ad-hoc design decisions for Firewall Inspector. Any pull request
or design change touching rule evaluation, scenario content, difficulty pacing, or consequence
design MUST be checked against these principles before merge; violations MUST be either fixed
or explicitly justified in the plan's Complexity Tracking section.

Amendments require a documented rationale (what changed and why), an update to this file, and a
version bump per semantic versioning:

- **MAJOR**: a principle is removed or redefined in a way that invalidates prior compliant
  designs.
- **MINOR**: a new principle or materially expanded guidance is added.
- **PATCH**: wording, clarification, or typo fixes with no rule-level change.

Reviews of feature plans and specs MUST include an explicit Constitution Check gate; any
unresolved violation blocks implementation until it is resolved or justified.

**Version**: 1.1.0 | **Ratified**: 2026-07-04 | **Last Amended**: 2026-07-04
