// tests/unit/matchers.test.js (T019) — positive/negative/boundary for each matcher.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchPort, ipToInt, ipInCidr, matchProtocol, matchFlags, matchGeo, matchSignature, matchTechnique,
} from '../../engine/matchers.js';

test('matchPort: exact equality', () => {
  assert.equal(matchPort(443, 443), true);
  assert.equal(matchPort(443, 80), false);
});

test('matchPort: inclusive range with boundaries', () => {
  assert.equal(matchPort({ min: 1, max: 1023 }, 1), true);
  assert.equal(matchPort({ min: 1, max: 1023 }, 1023), true);
  assert.equal(matchPort({ min: 1, max: 1023 }, 1024), false);
  assert.equal(matchPort({ min: 1, max: 1023 }, 0), false);
});

test('ipToInt parses and rejects', () => {
  assert.equal(ipToInt('0.0.0.0'), 0);
  assert.equal(ipToInt('255.255.255.255'), 0xffffffff);
  assert.equal(ipToInt('10.0.0.1'), 167772161);
  assert.equal(ipToInt('256.0.0.1'), null);
  assert.equal(ipToInt('10.0.0'), null);
});

test('ipInCidr: membership and CIDR edges', () => {
  assert.equal(ipInCidr('10.0.0.0/8', '10.255.255.255'), true);
  assert.equal(ipInCidr('10.0.0.0/8', '11.0.0.1'), false);
  assert.equal(ipInCidr('203.0.113.0/24', '203.0.113.0'), true);
  assert.equal(ipInCidr('203.0.113.0/24', '203.0.113.255'), true);
  assert.equal(ipInCidr('203.0.113.0/24', '203.0.114.0'), false);
  assert.equal(ipInCidr('192.0.2.5/32', '192.0.2.5'), true);
  assert.equal(ipInCidr('192.0.2.5/32', '192.0.2.6'), false);
  assert.equal(ipInCidr('0.0.0.0/0', '8.8.8.8'), true);
  assert.equal(ipInCidr('10.0.0.0/33', '10.0.0.1'), false);
});

test('matchProtocol: case-insensitive equality', () => {
  assert.equal(matchProtocol('TCP', 'tcp'), true);
  assert.equal(matchProtocol('TCP', 'UDP'), false);
});

test('matchFlags: all required present (subset semantics)', () => {
  assert.equal(matchFlags(['SYN'], ['SYN', 'ACK']), true);
  assert.equal(matchFlags(['SYN', 'ACK'], ['SYN']), false);
  assert.equal(matchFlags([], ['SYN']), true);
  assert.equal(matchFlags(['FIN', 'URG', 'PSH'], ['FIN', 'PSH', 'URG']), true);
});

test('matchGeo: region membership via geoMap', () => {
  const geoMap = { '203.0.113.0/24': 'XX', '198.51.100.0/24': 'YY' };
  assert.equal(matchGeo('XX', '203.0.113.9', geoMap), true);
  assert.equal(matchGeo('XX', '198.51.100.9', geoMap), false);
  assert.equal(matchGeo('ZZ', '203.0.113.9', geoMap), false);
  assert.equal(matchGeo('XX', '203.0.113.9', null), false);
});

test('matchSignature: any indicator carries the signature', () => {
  const inds = [{ label: 'a', value: 'x', signatureId: null }, { label: 'b', value: 'y', signatureId: 'SIG-1' }];
  assert.equal(matchSignature('SIG-1', inds), true);
  assert.equal(matchSignature('SIG-2', inds), false);
  assert.equal(matchSignature('SIG-1', []), false);
});

test('matchTechnique: packet technique membership', () => {
  assert.equal(matchTechnique('spoofed-source', { techniques: ['spoofed-source'] }), true);
  assert.equal(matchTechnique('disguised-c2', { techniques: ['spoofed-source'] }), false);
  assert.equal(matchTechnique('spoofed-source', { techniques: [] }), false);
});
