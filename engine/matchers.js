// engine/matchers.js
// Pure field matchers for the verdict engine. No DOM, no I/O, no randomness.
// Each function answers "does this packet field satisfy this rule criterion?"

/**
 * Match a port against a criterion that is either an exact number or a
 * { min, max } inclusive range.
 * @param {number|{min:number,max:number}} criterion
 * @param {number} port
 * @returns {boolean}
 */
export function matchPort(criterion, port) {
  if (typeof criterion === 'number') return port === criterion;
  if (criterion && typeof criterion === 'object') {
    const { min, max } = criterion;
    return port >= min && port <= max;
  }
  return false;
}

/** Parse an IPv4 dotted-quad string into a 32-bit unsigned integer. */
export function ipToInt(ip) {
  const parts = String(ip).split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    value = (value * 256) + n;
  }
  return value >>> 0;
}

/**
 * IPv4 CIDR membership test, e.g. ipInCidr('10.0.0.0/8', '10.1.2.3') === true.
 * @param {string} cidr
 * @param {string} ip
 * @returns {boolean}
 */
export function ipInCidr(cidr, ip) {
  const [base, bitsRaw] = String(cidr).split('/');
  const bits = Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const baseInt = ipToInt(base);
  const ipInt = ipToInt(ip);
  if (baseInt === null || ipInt === null) return false;
  if (bits === 0) return true; // 0.0.0.0/0 matches everything
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (baseInt & mask) === (ipInt & mask);
}

/** Exact protocol equality (case-insensitive). */
export function matchProtocol(expected, actual) {
  if (expected == null) return true;
  return String(expected).toUpperCase() === String(actual).toUpperCase();
}

/** True when every required flag is present in the packet's flags. */
export function matchFlags(required, flags) {
  if (!Array.isArray(required) || required.length === 0) return true;
  const present = new Set((flags || []).map((f) => String(f).toUpperCase()));
  return required.every((f) => present.has(String(f).toUpperCase()));
}

/**
 * True when the source IP's region (looked up in the ruleset geoMap) equals
 * the criterion region.
 * @param {string} region
 * @param {string} srcIp
 * @param {Object<string,string>} geoMap  map of CIDR -> region code
 */
export function matchGeo(region, srcIp, geoMap) {
  if (!geoMap) return false;
  for (const [cidr, r] of Object.entries(geoMap)) {
    if (ipInCidr(cidr, srcIp)) return r === region;
  }
  return false;
}

/** True when any of the packet's payload indicators carries the signature id. */
export function matchSignature(signatureId, indicators) {
  if (!Array.isArray(indicators)) return false;
  return indicators.some((ind) => ind && ind.signatureId === signatureId);
}

/** True when the packet is tagged with the given attacker technique. */
export function matchTechnique(technique, packet) {
  return Array.isArray(packet.techniques) && packet.techniques.includes(technique);
}
