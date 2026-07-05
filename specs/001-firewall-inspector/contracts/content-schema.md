# Contract: Content Schema (`data/`)

All game content is authored JSON, separate from logic (Constitution VI). JSON Schema files live in
`data/schema/` and mirror the shapes in data-model.md. Content is validated by
`src/engine/validators.js` at load time and by `tests/content/shifts.validate.test.js` in CI.

## Shift file: `data/shifts/day-NN.json`

```jsonc
{
  "id": "day-03",
  "index": 3,
  "briefing": {
    "title": "New CVE advisory: block RDP",
    "body": "Plain-language explanation of the new rule and why it exists...",
    "examples": [
      { "packetRef": "example-a", "verdict": "DENY", "why": "Destination port 3389 is now blocked." }
    ],
    "introducesConcepts": ["port-rule", "cve-advisory"]
  },
  "ruleset": {
    "defaultVerdict": "ALLOW",
    "geoMap": { "203.0.113.0/24": "XX" },
    "rules": [
      {
        "id": "r-block-rdp",
        "description": "Deny inbound RDP (TCP/3389) per CVE advisory.",
        "priority": 100,
        "match": { "protocol": "TCP", "dstPort": 3389 },
        "verdict": "DENY",
        "isException": false,
        "source": { "kind": "CVE", "ref": "CVE-YYYY-NNNNN", "shownToPlayer": true }
      },
      {
        "id": "r-finance-vpn-allow",
        "description": "Allow the finance VPN exception (overrides broader blocks).",
        "priority": 200,
        "match": { "srcCidr": "10.20.0.0/16", "dstPort": 443 },
        "verdict": "ALLOW",
        "isException": true,
        "source": null
      }
    ]
  },
  "clockSeconds": null,
  "passThreshold": { "minAccuracy": 0.8, "maxSecurityIncidents": 1, "minMorale": 60 },
  "queue": [
    {
      "id": "d03-p01",
      "srcAddress": "198.51.100.24",
      "dstAddress": "10.0.0.5",
      "srcPort": 51022,
      "dstPort": 3389,
      "protocol": "TCP",
      "flags": ["SYN"],
      "payloadIndicators": [ { "label": "Service", "value": "RDP", "signatureId": null } ],
      "rawPayload": null,
      "techniques": [],
      "groundTruth": "policy-violating",
      "expectedSource": null,
      "fragmentGroup": null,
      "narrative": null,
      "source": { "kind": "CVE", "ref": "CVE-YYYY-NNNNN", "shownToPlayer": false }
    }
  ],
  "introducesConcepts": ["port-rule", "cve-advisory"]
}
```

## Authoring invariants (enforced)

1. Every packet must resolve to exactly one verdict via the engine (no undecidable packets).
2. Every concept used by a shift's rules/packets must appear in `introducesConcepts` of that shift or
   an earlier-indexed shift.
3. Any rule/packet derived from a real CVE/RFC/technique must include a non-null `source`.
4. `rawPayload` may add flavor/depth but must never be the only place a decision-critical signal
   appears (the structured `payloadIndicators` must suffice).
5. `narrative` framing must not change the engine verdict.
6. `index` values are unique and contiguous 1..N (N ≈ 8 for v1).

## Settings & tunables (data, not code)

Timer length (`clockSeconds`), thresholds (`passThreshold`), and meter deltas are all data so
difficulty is tuned without code changes (Constitution IV/V). Global defaults live in
`data/settings.default.json`.
