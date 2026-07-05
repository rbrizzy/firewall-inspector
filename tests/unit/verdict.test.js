// tests/unit/verdict.test.js (T020) — priority ordering, exception-overrides-deny,
// default fallthrough, determinism.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateVerdict } from '../../engine/verdict.js';

const ruleset = {
  defaultVerdict: 'ALLOW',
  geoMap: {},
  rules: [
    {
      id: 'block-rdp', description: 'Deny RDP', priority: 100,
      match: { protocol: 'TCP', dstPort: 3389 }, verdict: 'DENY',
    },
    {
      id: 'block-subnet', description: 'Deny bad subnet', priority: 50,
      match: { srcCidr: '203.0.113.0/24' }, verdict: 'DENY',
    },
    {
      id: 'finance-vpn', description: 'Allow finance VPN', priority: 200,
      match: { srcCidr: '203.0.113.0/24', dstPort: 443 }, verdict: 'ALLOW', isException: true,
    },
  ],
};

test('highest-priority matching rule governs', () => {
  const p = { srcAddress: '203.0.113.9', dstAddress: '10.0.0.5', srcPort: 5000, dstPort: 3389, protocol: 'TCP', flags: [] };
  const r = evaluateVerdict(ruleset, p);
  assert.equal(r.verdict, 'DENY');
  assert.equal(r.matchedRuleId, 'block-rdp');
});

test('exception (higher priority ALLOW) overrides a broader DENY', () => {
  const p = { srcAddress: '203.0.113.9', dstAddress: '10.0.0.5', srcPort: 5000, dstPort: 443, protocol: 'TCP', flags: [] };
  const r = evaluateVerdict(ruleset, p);
  assert.equal(r.verdict, 'ALLOW');
  assert.equal(r.matchedRuleId, 'finance-vpn');
});

test('broad DENY applies when the exception does not match', () => {
  const p = { srcAddress: '203.0.113.9', dstAddress: '10.0.0.5', srcPort: 5000, dstPort: 8080, protocol: 'TCP', flags: [] };
  const r = evaluateVerdict(ruleset, p);
  assert.equal(r.verdict, 'DENY');
  assert.equal(r.matchedRuleId, 'block-subnet');
});

test('default fallthrough when no rule matches', () => {
  const p = { srcAddress: '198.51.100.9', dstAddress: '10.0.0.5', srcPort: 5000, dstPort: 443, protocol: 'TCP', flags: [] };
  const r = evaluateVerdict(ruleset, p);
  assert.equal(r.verdict, 'ALLOW');
  assert.equal(r.matchedRuleId, null);
});

test('deterministic: identical inputs → identical output, order-independent', () => {
  const p = { srcAddress: '203.0.113.9', dstAddress: '10.0.0.5', srcPort: 5000, dstPort: 443, protocol: 'TCP', flags: [] };
  const a = evaluateVerdict(ruleset, p);
  const b = evaluateVerdict({ ...ruleset, rules: [...ruleset.rules].reverse() }, p);
  assert.deepEqual({ v: a.verdict, id: a.matchedRuleId }, { v: b.verdict, id: b.matchedRuleId });
});

test('a rule with empty match never matches (no accidental catch-all)', () => {
  const rs = { defaultVerdict: 'DENY', rules: [{ id: 'empty', description: 'x', priority: 10, match: {}, verdict: 'ALLOW' }] };
  const p = { srcAddress: '1.2.3.4', dstAddress: '10.0.0.1', srcPort: 1, dstPort: 1, protocol: 'TCP', flags: [] };
  assert.equal(evaluateVerdict(rs, p).verdict, 'DENY');
});
