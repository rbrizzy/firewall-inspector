# Contract: Save State (`localStorage`)

Single key: `firewall-inspector:save`. Value is JSON. Written at shift boundaries only (R6). The app
must tolerate a missing or malformed value by starting a fresh run.

## Shape

```jsonc
{
  "version": 1,
  "settings": {
    "clockEnabled": true,
    "theme": "system",        // "system" | "light" | "dark"
    "reducedMotion": false,
    "effectsEnabled": true    // THREE.js viz layer; auto-off under prefers-reduced-motion
  },
  "run": {
    "currentShiftIndex": 3,   // resume point (BRIEFING of this shift)
    "runTally": {
      "shiftsPassed": 2,
      "totalCorrect": 24,
      "totalPackets": 30
    }
  }
}
```

## Rules

1. **Read on boot**: if absent/invalid/`version` unknown → initialize a new run at shift index 1 and
   overwrite. Never crash on bad data.
2. **Write points**: only at DEBRIEF resolution (advance or retry) — not mid-shift. Mid-shift quit
   resumes at the current shift's BRIEFING with meters reset.
3. **No PII / no network**: save contains only game progress and settings; never transmitted (FR-024).
4. **Migration**: on a lower known `version`, migrate forward; on an unknown/newer version, start
   fresh rather than corrupt.
5. **Per-shift meters are NOT persisted** (they reset each shift); only `run` + `settings` persist.

## Test obligations

- Boot with: empty storage, valid save, malformed JSON, unknown version → all yield a playable state.
- Advance and retry both write the correct `currentShiftIndex`.
- Settings round-trip (clock toggle, theme, reduced motion, effects toggle).
