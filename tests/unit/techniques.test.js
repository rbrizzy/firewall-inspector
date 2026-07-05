// tests/unit/techniques.test.js (T044) — technique-aware detection paths:
// spoofed-source, fragmented-payload (fragment grouping), disguised-c2 signature.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { evaluateVerdict } from '../../engine/verdict.js';
import { matchSignature, matchTechnique } from '../../engine/matchers.js';

const ruleset = {
  defaultVerdict: 'ALLOW',
  geoMap: {},
  rules: [
    { id: 'spoof', description: 'spoof', priority: 120, match: { technique: 'spoofed-source' }, verdict: 'DENY' },
    { id: 'frag', description: 'frag', priority: 120, match: { technique: 'fragmented-payload' }, verdict: 'DENY' },
    { id: 'c2', description: 'c2', priority: 120, match: { technique: 'disguised-c2' }, verdict: 'DENY' },
    { id: 'sig', description: 'sig', priority: 110, match: { signatureId: 'SIG-C2-BEACON' }, verdict: 'DENY' },
  ],
};

function base(overrides) {
  return {
    id: 't', srcAddress: '198.51.100.1', dstAddress: '10.0.0.1', srcPort: 40000, dstPort: 443,
    protocol: 'TCP', flags: [], payloadIndicators: [], techniques: [], ...overrides,
  };
}

test('spoofed-source packet is denied by the technique rule', () => {
  const r = evaluateVerdict(ruleset, base({ techniques: ['spoofed-source'], expectedSource: '203.0.113.9' }));
  assert.equal(r.verdict, 'DENY');
  assert.equal(r.matchedRuleId, 'spoof');
});

test('fragmented-payload group member is denied', () => {
  const r = evaluateVerdict(ruleset, base({ techniques: ['fragmented-payload'], fragmentGroup: 'frag-A' }));
  assert.equal(r.verdict, 'DENY');
  assert.equal(r.matchedRuleId, 'frag');
});

test('disguised-c2 is denied by the technique rule', () => {
  const r = evaluateVerdict(ruleset, base({ techniques: ['disguised-c2'] }));
  assert.equal(r.verdict, 'DENY');
  assert.equal(r.matchedRuleId, 'c2');
});

test('C2 beacon signature match denies even without a technique tag', () => {
  const p = base({ payloadIndicators: [{ label: 'Pattern', value: 'periodic POSTs', signatureId: 'SIG-C2-BEACON' }] });
  assert.equal(matchSignature('SIG-C2-BEACON', p.payloadIndicators), true);
  const r = evaluateVerdict(ruleset, p);
  assert.equal(r.verdict, 'DENY');
  assert.equal(r.matchedRuleId, 'sig');
});

test('a clean packet with no technique/signature is allowed', () => {
  assert.equal(evaluateVerdict(ruleset, base({})).verdict, 'ALLOW');
  assert.equal(matchTechnique('spoofed-source', base({})), false);
});

// Content sanity: authored spoofed-source packets actually present a detectable mismatch.
test('authored spoofed-source packets have expectedSource != srcAddress', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = join(here, '..', '..', 'data', 'shifts');
  const shifts = readdirSync(dir).filter((f) => /^day-\d{2}\.json$/.test(f))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
  for (const s of shifts) {
    for (const p of s.queue) {
      if ((p.techniques || []).includes('spoofed-source')) {
        assert.ok(p.expectedSource && p.expectedSource !== p.srcAddress,
          `${s.id}/${p.id} spoofed-source packet must show a source mismatch in the inspector`);
      }
    }
  }
});
