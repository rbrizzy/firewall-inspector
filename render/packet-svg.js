// render/packet-svg.js — SVG rendering of packet/inspection visuals.
// DOM/SVG only (no canvas), so it is accessible and works without the viz layer.
// Pure-ish: builds SVG strings/elements from packet data; no game logic.

import { esc } from './a11y.js';

const SVGNS = 'http://www.w3.org/2000/svg';

/**
 * Render a compact "packet on the wire" diagram: source → firewall → destination,
 * with protocol/port labels. Conveys direction by shape/text, not color alone.
 * @param {Object} packet
 * @returns {SVGElement}
 */
export function renderPacketDiagram(packet) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 480 120');
  svg.setAttribute('role', 'img');
  svg.setAttribute('width', '100%');
  const summary =
    `Packet from ${packet.srcAddress} port ${packet.srcPort} to ` +
    `${packet.dstAddress} port ${packet.dstPort} over ${packet.protocol}.`;
  svg.setAttribute('aria-label', summary);

  const flags = (packet.flags || []).join(' ') || '—';
  svg.innerHTML = `
    <title>${esc(summary)}</title>
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3"
              orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
      </marker>
    </defs>
    <g font-family="ui-monospace, monospace" font-size="11" fill="currentColor" stroke="none">
      <!-- source node -->
      <rect x="4" y="38" width="120" height="44" rx="6" fill="none" stroke="currentColor"/>
      <text x="64" y="30" text-anchor="middle">source</text>
      <text x="64" y="58" text-anchor="middle">${esc(packet.srcAddress)}</text>
      <text x="64" y="74" text-anchor="middle">:${esc(String(packet.srcPort))}</text>

      <!-- firewall -->
      <rect x="196" y="30" width="88" height="60" rx="6" fill="none" stroke="currentColor" stroke-dasharray="4 3"/>
      <text x="240" y="24" text-anchor="middle">firewall</text>
      <text x="240" y="58" text-anchor="middle">${esc(packet.protocol)}</text>
      <text x="240" y="74" text-anchor="middle">[${esc(flags)}]</text>

      <!-- destination node -->
      <rect x="356" y="38" width="120" height="44" rx="6" fill="none" stroke="currentColor"/>
      <text x="416" y="30" text-anchor="middle">destination</text>
      <text x="416" y="58" text-anchor="middle">${esc(packet.dstAddress)}</text>
      <text x="416" y="74" text-anchor="middle">:${esc(String(packet.dstPort))}</text>

      <!-- wires -->
      <line x1="124" y1="60" x2="192" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow)"/>
      <line x1="284" y1="60" x2="352" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow)"/>
    </g>`;
  return svg;
}

/**
 * Render a static SVG "blast radius" fallback for the consequence view, used when
 * the THREE.js viz layer is disabled/unavailable. Severity scales the rings.
 * @param {number} severity  1..3+
 * @returns {SVGElement}
 */
export function renderBlastRadiusSVG(severity = 1) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 320 180');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Static blast-radius illustration, severity ${severity}.`);
  const rings = Math.max(1, Math.min(4, severity + 1));
  let circles = '';
  for (let i = rings; i >= 1; i -= 1) {
    const r = 18 + i * 24;
    const opacity = (0.15 + 0.18 * (rings - i + 1)).toFixed(2);
    circles += `<circle cx="160" cy="90" r="${r}" fill="currentColor" fill-opacity="${opacity}" />`;
  }
  svg.innerHTML = `
    <title>Blast radius (severity ${esc(String(severity))})</title>
    <g color="#ff7a72">${circles}
      <circle cx="160" cy="90" r="10" fill="#ffffff" />
      <text x="160" y="170" text-anchor="middle" font-family="ui-monospace, monospace"
            font-size="12" fill="currentColor">impact severity ${esc(String(severity))}</text>
    </g>`;
  return svg;
}
