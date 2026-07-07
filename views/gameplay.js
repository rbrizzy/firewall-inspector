// views/gameplay.js — the inspection desk.
// Renders the current packet, structured indicators, a consultable rulebook, a
// deep inspector (US4), an optional raw-payload view (US4), moral-dilemma framing
// (US3), per-shift meters (US3), stamping (US1), and wrong-answer feedback (US1).
// The view NEVER decides correctness — it calls state.stampCurrent and renders
// what the pure engine returned.

import { esc, announce, focusMain } from '../render/a11y.js';
import { renderPacketDiagram } from '../render/packet-svg.js';
import { ruleLabel } from '../engine/feedback.js';
import { ipInCidr } from '../engine/matchers.js';
import { mountAmbient } from '../viz/blast-radius.js';

// Per-packet UI state that must survive re-render within a shift.
let rulebookOpen = false;
let inspectorOpen = false;
let rawOpen = false;
let lastAnnouncedId = null;
let ambientHandle = null;

/** Render the in-force rules in priority order (FR-009). Exceptions emphasized. */
function rulebookMarkup(shift) {
  const rules = [...(shift.ruleset.rules || [])].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const items = rules.map((r) => {
    const badge = `<span class="verdict-badge verdict-${esc(r.verdict)}">${esc(r.verdict)}</span>`;
    const exc = r.isException ? ' <span class="tag tag-warn">exception</span>' : '';
    const src = r.source && r.source.shownToPlayer
      ? ` <span class="muted">(${esc(r.source.ref)})</span>` : '';
    return `<li class="rule-item${r.isException ? ' exception' : ''}">${badge}${esc(r.description)}${exc}${src}</li>`;
  }).join('');
  const def = `<li class="rule-item"><span class="muted">Default when no rule matches:</span>
    <span class="verdict-badge verdict-${esc(shift.ruleset.defaultVerdict)}">${esc(shift.ruleset.defaultVerdict)}</span></li>`;
  return `<ol class="rules-list">${items}${def}</ol>`;
}

/** Structured, labeled inspection signals (default surface — never color-only). */
function indicatorsMarkup(packet) {
  const list = packet.payloadIndicators || [];
  if (list.length === 0) return '<p class="muted">No payload indicators.</p>';
  return `<ul class="indicators">${list.map((ind) => {
    const sig = ind.signatureId
      ? ` <span class="tag tag-deny">signature: ${esc(ind.signatureId)}</span>` : '';
    return `<li class="indicator"><span class="label">${esc(ind.label)}</span>
      <span class="value">${esc(ind.value)}</span>${sig}</li>`;
  }).join('')}</ul>`;
}

/** Resolve a source IP to its geo region via the ruleset geoMap, or null. */
function geoRegion(srcIp, geoMap) {
  if (!geoMap) return null;
  for (const [cidr, region] of Object.entries(geoMap)) {
    if (ipInCidr(cidr, srcIp)) return region;
  }
  return null;
}

/** Deep inspector: spoof cross-check, fragment grouping, signatures, geo (US4, FR-013). */
function inspectorMarkup(packet, shift) {
  const rows = [];
  const region = geoRegion(packet.srcAddress, shift.ruleset.geoMap);
  if (region) {
    rows.push(`<li class="indicator"><span class="label">Source region</span>
      <span class="value">${esc(region)}</span>
      <span class="tag tag-warn">resolved via geo lookup — cross-check the rulebook</span></li>`);
  }
  if (packet.expectedSource) {
    const mismatch = packet.expectedSource !== packet.srcAddress;
    rows.push(`<li class="indicator"><span class="label">Expected source</span>
      <span class="value">${esc(packet.expectedSource)}</span>
      ${mismatch ? '<span class="tag tag-deny">MISMATCH — claimed source differs</span>'
                 : '<span class="tag">matches claimed source</span>'}</li>`);
  }
  if (packet.fragmentGroup) {
    rows.push(`<li class="indicator"><span class="label">Fragment group</span>
      <span class="value">${esc(packet.fragmentGroup)}</span>
      <span class="tag tag-warn">part of a fragmented payload</span></li>`);
  }
  const sigInds = (packet.payloadIndicators || []).filter((i) => i.signatureId);
  for (const s of sigInds) {
    rows.push(`<li class="indicator"><span class="label">Signature hit</span>
      <span class="value">${esc(s.signatureId)}</span>
      <span class="tag tag-deny">advisory signature (${esc(s.label)})</span></li>`);
  }
  if ((packet.techniques || []).length) {
    rows.push(`<li class="indicator"><span class="label">Technique flags</span>
      <span class="value">${esc((packet.techniques || []).join(', '))}</span></li>`);
  }
  if (rows.length === 0) rows.push('<li class="muted">Deep inspection shows nothing unusual here.</li>');
  return `<ul class="indicators">${rows.join('')}</ul>`;
}

/** Feedback banner for the previously stamped packet (US1, FR-004). */
function feedbackMarkup(decision) {
  if (!decision) return '';
  if (decision.isCorrect) {
    return `<div class="feedback correct" role="status">
      <b>Correct.</b> ${esc(decision.rationale)}</div>`;
  }
  return `<div class="feedback wrong" role="status">
    <b>Incorrect — should have been
      <span class="verdict-badge verdict-${esc(decision.correctVerdict)}">${esc(decision.correctVerdict)}</span>.</b>
    ${esc(decision.explanation)}</div>`;
}

export function mountGameplay(root, state, ctx) {
  const shift = state.currentShift;
  const packet = state.currentPacket;
  if (!packet) return;

  // The most recent decision belongs to the PREVIOUS packet (immediate advance).
  const lastDecision = state.decisions.length > 0
    ? state.decisions[state.decisions.length - 1] : null;
  const showFeedback = lastDecision && lastDecision.packetId !== packet.id ? lastDecision : null;

  const position = state.queuePos + 1;
  const totalQ = shift.queue.length;
  const clock = state.clockRemaining;
  const clockLabel = clock === null ? 'no timer'
    : `${Math.floor(clock / 60)}:${String(clock % 60).padStart(2, '0')}`;

  root.textContent = '';
  const el = document.createElement('section');
  el.className = 'screen';
  el.innerHTML = `
    <div class="queue-status">
      <div><h1>${esc(shift.briefing?.title || shift.id)}</h1>
        <p class="muted">Packet ${position} of ${totalQ} · Shift ${esc(String(shift.index))}</p></div>
      <div class="meters" aria-label="Shift meters">
        <span class="meter">Morale: <b>${esc(String(state.standing.morale))}</b></span>
        <span class="meter">Security incidents: <b>${esc(String(state.standing.securityIncidents))}</b></span>
        <span class="meter">Clock: <b>${esc(clockLabel)}</b></span>
      </div>
    </div>

    ${feedbackMarkup(showFeedback)}

    <div class="desk">
      <div class="panel card">
        <h2>Packet <span class="muted">${esc(packet.id)}</span></h2>
        <div id="packet-diagram"></div>
        <dl class="packet-fields">
          <dt>src</dt><dd>${esc(packet.srcAddress)}:${esc(String(packet.srcPort))}</dd>
          <dt>dst</dt><dd>${esc(packet.dstAddress)}:${esc(String(packet.dstPort))}</dd>
          <dt>proto</dt><dd>${esc(packet.protocol)}</dd>
          <dt>flags</dt><dd>${esc((packet.flags || []).join(' ') || '—')}</dd>
        </dl>
        <h3>Payload indicators</h3>
        ${indicatorsMarkup(packet)}

        ${packet.narrative ? `<div class="feedback" role="note">
          <b>Context:</b> ${esc(packet.narrative.framing)}
          <div class="muted">The ruleset verdict is unchanged by this context.</div></div>` : ''}

        <details class="inspector" id="inspector" ${inspectorOpen ? 'open' : ''}>
          <summary>Deep inspector <span class="muted">(<kbd>I</kbd>)</span></summary>
          ${inspectorMarkup(packet, shift)}
        </details>

        <details class="inspector" id="rawview" ${rawOpen ? 'open' : ''}>
          <summary>Raw payload <span class="muted">(<kbd>V</kbd>, optional)</span></summary>
          ${packet.rawPayload
            ? `<pre class="raw-payload">${esc(packet.rawPayload)}</pre>
               <p class="muted">Optional depth — never required to decide.</p>`
            : '<p class="muted">No raw payload captured for this packet.</p>'}
        </details>

        <div id="ambient-viz"></div>
      </div>

      <div class="panel card">
        <h2>Stamp a verdict</h2>
        <div class="btn-row">
          <button class="btn btn-allow" id="allow-btn">ALLOW (<kbd>A</kbd>)</button>
          <button class="btn btn-deny" id="deny-btn">DENY (<kbd>D</kbd>)</button>
        </div>
        <div class="btn-row" style="margin-top:8px">
          <button class="btn" id="pause-btn">Pause (<kbd>P</kbd>)</button>
          <button class="btn" id="help-btn">Help (<kbd>?</kbd>)</button>
        </div>

        <details class="inspector rulebook" id="rulebook" ${rulebookOpen ? 'open' : ''}>
          <summary>Rulebook <span class="muted">(<kbd>R</kbd>) — today's rules in priority order</span></summary>
          ${rulebookMarkup(shift)}
        </details>
      </div>
    </div>`;
  root.appendChild(el);

  // SVG packet diagram
  el.querySelector('#packet-diagram').appendChild(renderPacketDiagram(packet));

  // Optional ambient viz (decorative; gated inside the viz module).
  if (ambientHandle) { ambientHandle.destroy?.(); ambientHandle = null; }
  ambientHandle = mountAmbient(el.querySelector('#ambient-viz'), {
    effectsEnabled: state.settings.effectsEnabled,
    reducedMotion: state.settings.reducedMotion,
  });

  // Wire buttons
  el.querySelector('#allow-btn').addEventListener('click', () => stamp('ALLOW'));
  el.querySelector('#deny-btn').addEventListener('click', () => stamp('DENY'));
  el.querySelector('#pause-btn').addEventListener('click', () => state.pause());
  el.querySelector('#help-btn').addEventListener('click', () => ctx.toggleHelp());

  // Keep <details> open-state in sync with the toggle flags.
  const rb = el.querySelector('#rulebook');
  rb.addEventListener('toggle', () => { rulebookOpen = rb.open; });
  const ins = el.querySelector('#inspector');
  ins.addEventListener('toggle', () => { inspectorOpen = ins.open; });
  const rv = el.querySelector('#rawview');
  rv.addEventListener('toggle', () => { rawOpen = rv.open; });

  function stamp(verdict) { state.stampCurrent(verdict); }

  ctx.keys.setBindings({
    a: { handler: () => stamp('ALLOW'), description: 'Stamp ALLOW', label: 'A' },
    d: { handler: () => stamp('DENY'), description: 'Stamp DENY', label: 'D' },
    r: { handler: () => { rulebookOpen = !rulebookOpen; rb.open = rulebookOpen; }, description: 'Toggle rulebook', label: 'R' },
    i: { handler: () => { inspectorOpen = !inspectorOpen; ins.open = inspectorOpen; }, description: 'Toggle deep inspector', label: 'I' },
    v: { handler: () => { rawOpen = !rawOpen; rv.open = rawOpen; }, description: 'Toggle raw payload', label: 'V' },
    p: { handler: () => state.pause(), description: 'Pause', label: 'P' },
    '?': { handler: () => ctx.toggleHelp(), description: 'Keyboard help', label: '?' },
  });

  // Announce feedback for a newly stamped packet exactly once (FR-004).
  if (showFeedback && showFeedback.packetId !== lastAnnouncedId) {
    lastAnnouncedId = showFeedback.packetId;
    announce(showFeedback.isCorrect
      ? `Correct. ${showFeedback.rationale}`
      : `Incorrect. ${showFeedback.explanation}`);
  }

  focusMain(el.querySelector('#allow-btn'));
}

/** Reset per-shift UI toggles (called by the router when a shift starts). */
export function resetGameplayUi() {
  rulebookOpen = false; inspectorOpen = false; rawOpen = false; lastAnnouncedId = null;
}
