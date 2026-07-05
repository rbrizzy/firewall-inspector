# Phase 1 Data Model: Firewall Inspector

Derived from the spec's Key Entities and Functional Requirements. All content entities are authored
as JSON under `data/`; runtime entities live in memory / `localStorage`. Types are described
language-neutrally.

## Content entities (authored, static JSON)

### Packet

One item to be judged.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Unique within its shift. |
| `srcAddress` | string (IPv4) | Synthetic; may be spoofed (see `techniques`). |
| `dstAddress` | string (IPv4) | Synthetic. |
| `srcPort` | integer 0–65535 | |
| `dstPort` | integer 0–65535 | |
| `protocol` | enum `TCP`\|`UDP`\|`ICMP`\|... | |
| `flags` | string[] | e.g. `SYN`, `ACK`, `FIN`; protocol-appropriate. |
| `payloadIndicators` | Indicator[] | Structured, labeled signals (default inspection surface). |
| `rawPayload` | string \| null | Optional readable hex/ASCII excerpt (FR-025); never required to solve. |
| `techniques` | enum[] | Subset of `spoofed-source`, `fragmented-payload`, `disguised-c2`; drives detection. |
| `groundTruth` | enum `benign`\|`policy-violating`\|`malicious` | Hidden; used for consequence sizing, NOT for verdict. |
| `expectedSource` | string \| null | For spoof detection: the origin the address claims vs. reality. |
| `fragmentGroup` | string \| null | Links packets forming one fragmented payload. |
| `narrative` | NarrativeEvent \| null | Optional moral-dilemma framing (does not change verdict). |
| `source` | Source \| null | Required if derived from a real CVE/RFC/technique. |

- **Validation**: `evaluateVerdict(shift.ruleset, packet)` MUST return exactly one verdict. `source`
  required whenever `techniques` or a rule reference a real-world item. `rawPayload`, if present, must
  not be the sole carrier of a signal needed for the correct verdict.

### Indicator

A labeled payload/inspection signal.

| Field | Type | Notes |
|-------|------|-------|
| `label` | string | Plain-language name shown to player (e.g. "TLS SNI"). |
| `value` | string | Displayed value. |
| `signatureId` | string \| null | Links to an advisory signature the ruleset may match. |

### Rule

One clause of a ruleset.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Unique within ruleset. |
| `description` | string | Plain-language, shown in the rulebook. |
| `priority` | integer | Higher = evaluated first; establishes precedence (FR-009). |
| `match` | MatchCriteria | Field predicates (see below). |
| `verdict` | enum `ALLOW`\|`DENY` | Result when matched. |
| `isException` | boolean | Marks exec/finance-style overrides for UI emphasis. |
| `source` | Source \| null | Required if CVE/advisory-driven. |

### MatchCriteria

Composable predicates; all present criteria must match (logical AND).

| Field | Type | Matcher |
|-------|------|---------|
| `dstPort` / `srcPort` | integer \| range | equality / range |
| `dstCidr` / `srcCidr` | string (CIDR) | IP-in-CIDR |
| `protocol` | enum | equality |
| `flags` | string[] | all-present |
| `geo` | string (region code) | src region membership (via authored `geoMap`) |
| `signatureId` | string | any packet indicator matches |
| `technique` | enum | packet carries technique |

### Ruleset

| Field | Type | Notes |
|-------|------|-------|
| `defaultVerdict` | enum `ALLOW`\|`DENY` | Applied when no rule matches. |
| `rules` | Rule[] | Ordered by `priority` at evaluation. |
| `geoMap` | map<CIDR, region> | Supports geo matching without external lookups. |

### Briefing

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | |
| `body` | string (plain language) | Teaches new/changed rules (FR-006, FR-020). |
| `examples` | Example[] | Worked packet → verdict → why. |
| `introducesConcepts` | string[] | Rule types / techniques first taught here (FR-007 gate). |

### Shift (Day)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | e.g. `day-03`. |
| `index` | integer | 1–8; progression order. |
| `briefing` | Briefing | Shown before the queue if ruleset changed (FR-006). |
| `ruleset` | Ruleset | In force for this shift. |
| `queue` | Packet[] | ~10–15 packets. |
| `clockSeconds` | integer \| null | Per-shift timer; `null`/large = generous/off (FR-014). |
| `passThreshold` | Threshold | Accuracy + meter bounds to advance (FR-011a). |
| `introducesConcepts` | string[] | Union with briefing; validated against prior shifts. |

### Threshold

| Field | Type | Notes |
|-------|------|-------|
| `minAccuracy` | number 0–1 | Fraction of correct verdicts required. |
| `maxSecurityIncidents` | integer | Upper bound to still pass. |
| `minMorale` | integer | Lower bound to still pass. |

### NarrativeEvent

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | |
| `framing` | string | Sympathetic context (fictional only). |
| `correctVerdictUnchanged` | true | Assertion: narrative never alters the ruleset verdict (FR-012). |

### Source

| Field | Type | Notes |
|-------|------|-------|
| `kind` | enum `CVE`\|`RFC`\|`TECHNIQUE` | |
| `ref` | string | e.g. `CVE-2021-XXXXX`, `RFC 793 §3.1`, ATT&CK `T1071`. |
| `shownToPlayer` | boolean | May be hidden but must exist (FR-016). |

## Runtime entities (in memory / localStorage)

### Verdict (player decision result)

| Field | Type | Notes |
|-------|------|-------|
| `packetId` | string | |
| `playerVerdict` | enum `ALLOW`\|`DENY`\|`MISSED` | `MISSED` when shift clock expires (FR-014). |
| `correctVerdict` | enum `ALLOW`\|`DENY` | From the engine. |
| `matchedRuleId` | string \| null | Governing rule (null = default). |
| `isCorrect` | boolean | |
| `rationale` | string | Explanation shown on error (FR-004). |

### Consequence

| Field | Type | Notes |
|-------|------|-------|
| `packetId` | string | Causal link (FR-011). |
| `ruleId` | string \| null | Rule involved. |
| `type` | enum `morale`\|`security-incident`\|`reputation` | |
| `severity` | integer | Scaled to packet `groundTruth` severity (FR-010). |
| `explanation` | string | Rendered in debrief. |

### PlayerStanding (per shift) & RunTally (cumulative)

| Field | Type | Notes |
|-------|------|-------|
| `morale` | integer | Per-shift meter, reset each shift. |
| `securityIncidents` | integer | Per-shift meter, reset each shift. |
| `correct` / `total` | integer | Accuracy tracking for threshold. |
| `outcome` | enum `advance`\|`retry` | Result vs `passThreshold` (FR-011a, SC-013). |
| RunTally.`shiftsPassed` | integer | Cumulative, for end-of-run summary only. |

### SaveState (localStorage)

| Field | Type | Notes |
|-------|------|-------|
| `version` | integer | For forward migration. |
| `settings` | { `clockEnabled`, `reducedMotion`, `theme`, ... } | |
| `run` | { `currentShiftIndex`, `runTally` } | Written at shift boundaries (R6). |

## State transitions (shift lifecycle)

```text
LOADING → BRIEFING → INSPECTING → (queue empty | clock expired) → DEBRIEF
DEBRIEF → [outcome=advance] → next shift BRIEFING
DEBRIEF → [outcome=retry]   → same shift BRIEFING (meters reset)
INSPECTING → PAUSED → INSPECTING            (pause never advances the queue)
any → (quit) → save at last shift boundary; resume at currentShiftIndex BRIEFING
```

## Key invariants (machine-checked by `validators.js` + `tests/content/`)

1. **Single correct verdict**: every packet resolves to exactly one verdict (SC-002).
2. **Taught before tested**: every concept in a shift's rules/packets ∈ union of `introducesConcepts`
   for that shift and all earlier shifts (FR-007, SC-004).
3. **Sources present**: every real-world-derived rule/packet/technique has a `Source` (FR-016, SC-009).
4. **Raw view optional**: no packet requires `rawPayload` to reach the correct verdict (SC-012).
5. **Narrative neutrality**: `NarrativeEvent` never changes the engine verdict (FR-012).
6. **Progression bounded**: exactly one `advance`/`retry` outcome per shift; no game-over path (SC-013).
