# Contract: Verdict Engine (`src/engine/`)

The engine is the single source of truth for correctness. All functions are **pure** (no DOM, no
I/O, no randomness). The UI consumes these outputs and never decides verdicts itself.

## `evaluateVerdict(ruleset, packet) → VerdictResult`

Determines the correct verdict for a packet against a ruleset.

**Input**: `ruleset` (Ruleset), `packet` (Packet) — see data-model.md.

**Output** `VerdictResult`:
```
{
  verdict: "ALLOW" | "DENY",        // the correct outcome
  matchedRuleId: string | null,     // null => ruleset.defaultVerdict applied
  rationale: string                 // plain-language why (rule matched / no rule matched)
}
```

**Rules**:
1. Evaluate `ruleset.rules` in descending `priority`. The first rule whose `match` criteria all hold
   is the governing rule; return its `verdict` and `id`.
2. If no rule matches, return `ruleset.defaultVerdict` with `matchedRuleId: null`.
3. MUST be deterministic: identical inputs always yield identical output. No RNG, clock, or I/O.
4. MUST return exactly one verdict (a total function over valid inputs).

## `explainMistake(verdictResult, playerVerdict) → string`

Given the correct result and the player's choice, returns a specific explanation naming the governing
rule and why the packet matched/didn't (FR-004). Returns empty string when `playerVerdict` is correct.

## Field matchers (`matchers.js`)

Each is pure and independently testable:

| Function | Signature | Semantics |
|----------|-----------|-----------|
| `matchPort(criteria, port)` | (int\|range, int) → bool | equality or inclusive range |
| `ipInCidr(cidr, ip)` | (string, string) → bool | IPv4 CIDR membership |
| `matchProtocol(expected, actual)` | (enum, enum) → bool | equality |
| `matchFlags(required, flags)` | (string[], string[]) → bool | all required present |
| `matchGeo(region, srcIp, geoMap)` | (string, string, map) → bool | src IP’s region == region |
| `matchSignature(sigId, indicators)` | (string, Indicator[]) → bool | any indicator’s `signatureId` == sigId |
| `matchTechnique(tech, packet)` | (enum, Packet) → bool | packet.techniques includes tech |

## `computeConsequences(packet, playerVerdict, correctVerdict) → Consequence[]`

Pure. Returns zero or more consequences when the player’s verdict is wrong, each linked to
`packet.id` and the governing rule, with `severity` scaled from `packet.groundTruth` (FR-010, FR-011).
A correct verdict yields `[]`.

## `scoreShift(standing, threshold) → { outcome, detail }`

Pure. Compares per-shift `standing` (accuracy, meters) to `threshold`; returns
`outcome: "advance" | "retry"` and a human-readable `detail` for the debrief (FR-011a, SC-013).

## `validateContent(shifts) → ValidationReport`

Pure. Loads authored shifts and asserts the six invariants in data-model.md (single correct verdict,
taught-before-tested, sources present, raw-view optional, narrative neutrality, bounded progression).
Returns `{ ok: boolean, errors: string[] }`. Used both at runtime (guard) and in CI tests.

## Test obligations (unit, `node --test`)

- Verdict determinism & priority ordering (incl. exception-overrides-deny).
- Default-verdict fallthrough.
- Each matcher: positive, negative, boundary (port ranges, CIDR edges, flag subsets).
- Spoof/fragment/C2 technique detection paths.
- Consequence severity scaling by ground truth.
- `scoreShift` advance vs retry at threshold boundaries.
- `validateContent` flags each invariant violation with a specific error.
