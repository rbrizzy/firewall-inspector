// tests/unit/consequences.test.js (T034) — severity scaling; correct → none.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeConsequences, applyConsequences } from '../../engine/consequences.js';

const malicious = { id: 'p1', srcAddress: '203.0.113.1', dstAddress: '10.0.0.1', groundTruth: 'malicious' };
const policy = { id: 'p2', srcAddress: '203.0.113.2', dstAddress: '10.0.0.2', groundTruth: 'policy-violating' };
const benign = { id: 'p3', srcAddress: '203.0.113.3', dstAddress: '10.0.0.3', groundTruth: 'benign' };

test('correct verdict yields no consequences', () => {
  assert.deepEqual(computeConsequences(malicious, 'DENY', 'DENY', 'r1'), []);
  assert.deepEqual(computeConsequences(benign, 'ALLOW', 'ALLOW', null), []);
});

test('allowing malicious traffic → high-severity security incident', () => {
  const c = computeConsequences(malicious, 'ALLOW', 'DENY', 'r1');
  assert.equal(c.length, 1);
  assert.equal(c[0].type, 'security-incident');
  assert.equal(c[0].severity, 3);
  assert.equal(c[0].packetId, 'p1');
  assert.equal(c[0].ruleId, 'r1');
});

test('allowing policy-violating traffic → lower-severity incident', () => {
  const c = computeConsequences(policy, 'ALLOW', 'DENY', 'r2');
  assert.equal(c[0].type, 'security-incident');
  assert.equal(c[0].severity, 1);
});

test('blocking legitimate traffic → morale hit scaled to value', () => {
  const c = computeConsequences(benign, 'DENY', 'ALLOW', null);
  assert.equal(c[0].type, 'morale');
  assert.equal(c[0].severity, 2);
});

test('MISSED is treated as the unsafe (opposite) outcome', () => {
  const c = computeConsequences(malicious, 'MISSED', 'DENY', 'r1');
  assert.equal(c[0].type, 'security-incident');
});

test('applyConsequences updates meters and clamps morale at 0', () => {
  const start = { morale: 100, securityIncidents: 0 };
  const afterIncident = applyConsequences(start, computeConsequences(malicious, 'ALLOW', 'DENY', 'r1'));
  assert.equal(afterIncident.securityIncidents, 1);
  const bigMorale = applyConsequences({ morale: 5, securityIncidents: 0 }, [{ type: 'morale', severity: 3 }]);
  assert.equal(bigMorale.morale, 0);
});
