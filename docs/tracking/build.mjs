// node docs/tracking/build.mjs
// Writes TRACKING.md, tracking-plan.json and tracking.html next to this file, all from plan.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EVENTS, CONTEXT_PROPS, BOOKING_VARS, PAGE_CALL, IDENTIFY_CALLS, PATHS, OPEN_POINTS, COVERAGE, NAMING, SEGMENT_NOTE, jsonFor } from './plan.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const J = (o) => JSON.stringify(o, null, 2);
const BY = { browser: 'Browser', server: 'Server or webhook', email: 'Email platform' };
const DOT = { browser: 'b', server: 's', email: 'm' };

// which emails read which value (1 confirmation, 2 reminder 24 h, 3 reminder 1 h)
const USED_IN = {
  booking_id: '1, 2, 3 (reschedule and cancel links)', call_at: 'workflow timing', duration_min: '1', call_weekday: '1', call_date_text: '1, 2', call_time_text: '1, 2, 3',
  join_url: '2, 3', host_name: '1, 2, 3', host_first_name: '2, 3', host_role: '1, 2, 3', host_photo_url: '1, 2, 3', calendar_google_url: '1', calendar_outlook_url: '1',
  calendar_ics_url: '1', first_name: '1, 2, 3', last_name: '1', reschedule_url: '1, 2, 3', cancel_url: '1, 2, 3',
};

const events = EVENTS.map((e) => ({ ...e, json: jsonFor(e) }));
const plan = {
  title: 'Strategy call tracking plan', draft: 'Draft 2, 22 Oct 2026', source: 'Strategy Call Booking Flow spec, draft 7',
  contextProperties: CONTEXT_PROPS.map(([name, type, description, source]) => ({ name, type, description, source })),
  bookingVariables: BOOKING_VARS.map(([name, type, description, example, source]) => ({ name, type, description, example, source, usedInEmail: USED_IN[name] || null })),
  events: events.map((e) => ({ name: e.name, step: e.step, firedBy: BY[e.by], role: e.role, addedToSpec: !!e.new, when: e.when, paths: e.paths, notes: e.notes, specificProperties: e.props.map(([n, t, d, x]) => ({ name: n, type: t, description: d, example: x })), example: e.json })),
  naming: NAMING, segment: SEGMENT_NOTE, coverage: COVERAGE, pageCall: PAGE_CALL, identifyCalls: IDENTIFY_CALLS, entryPaths: PATHS.map(([id, route, values]) => ({ id, route, values })), openPoints: OPEN_POINTS,
};
fs.writeFileSync(path.join(dir, 'tracking-plan.json'), J(plan) + '\n');

// ---------------- markdown ----------------
const md = [];
md.push(`# Strategy call tracking plan\n\n${plan.draft}. Built from the "${plan.source}". Anything marked *added* is not in the spec yet.\n`);
md.push(`Every event below has: when it fires, who fires it, and a full example JSON (Segment \`track\` call). All events carry the same context block, including the first and last touch UTMs and click ids, so reports can split on them. From the moment the visitor's email is known, every event carries \`email\`, and from the moment the booking exists, every event carries \`booking_id\`.\n`);
md.push('## Contents\n\n1. Events\n2. Page and identify calls\n3. Context on every event (UTMs)\n4. Booking and email variables\n5. Entry paths\n6. Open points\n');
md.push('## Naming and Segment\n\n**Rule:** ' + NAMING.rule + ' ' + NAMING.exception + '\n\n' + SEGMENT_NOTE + '\n\n| Name in the spec | Name in this plan |\n|---|---|\n' + NAMING.renames.map(([a, b]) => `| \`${a}\` | \`${b}\` |`).join('\n') + '\n');
md.push('## Check against the spec\n\n' + COVERAGE.spec + '.\n\n' + COVERAGE.checks.map(([a, b]) => `- **${a}:** ${b}`).join('\n') + '\n');
md.push('## 1. Events\n\n| Event | Step | Fired by | Role | Fires when |\n|---|---|---|---|---|');
for (const e of events) md.push(`| \`${e.name}\`${e.new ? ' *added*' : ''} | ${e.step} | ${BY[e.by]} | ${e.role} | ${e.when} |`);
md.push('\n"counting" events feed the success metrics and fire server-side. "diagnostic" events explain drop-off and are logged, not reported.\n');
for (const e of events) {
  md.push(`### \`${e.name}\`${e.new ? ' *(added)*' : ''}\n`);
  md.push(`- **Step:** ${e.step} · **Fired by:** ${BY[e.by]} · **Role:** ${e.role}\n- **Fires when:** ${e.when}\n- **Entry paths:** ${e.paths.join(', ')}`);
  if (e.props.length) md.push(`- **Properties beyond the context:** ${e.props.map(([n, t, d]) => `\`${n}\` (${t}): ${d}`).join('; ')}`);
  if (e.booking) md.push('- **Properties beyond the context:** all booking and email variables, see section 4.');
  for (const n of e.notes) md.push(`- ${n}`);
  md.push('\n```json\n' + J(e.json) + '\n```\n');
}
md.push('## 2. Page and identify calls\n');
md.push(`### \`page()\`\n\n${PAGE_CALL.when}\n\n${PAGE_CALL.notes.map((n) => `- ${n}`).join('\n')}\n\n\`\`\`json\n${J(PAGE_CALL.json)}\n\`\`\`\n`);
for (const c of IDENTIFY_CALLS) md.push(`### \`identify()\`\n\n${c.when}\n\n\`\`\`json\n${J(c.json)}\n\`\`\`\n`);
md.push('## 3. Context on every event (UTMs)\n');
md.push('**All UTMs are added, dynamically.** A touch script runs on every page load and reads every `utm_*` parameter on the URL, not a fixed list (the five standard ones are `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`), plus the ad click ids (`gclid`, `gbraid`, `wbraid`, `li_fat_id`, `fbclid`, `msclkid`) and the external referrer. Nothing in the examples below is a real UTM value: they are placeholders for whatever is on the URL. It sets `first_touch_*` once and overwrites `last_touch_*` on every new marketing touch (a direct visit never overwrites it). Both live in a first-party cookie on `.databox.com` for 90 days, and travel to the booking in the URL, the cookie, hidden form fields and the Cal.com booking metadata. Cal.com allows 50 metadata keys; 29 are used, and each extra `utm_*` parameter adds two.\n');
md.push('| Property | Type | What it holds | Where it is set |\n|---|---|---|---|');
for (const [n, t, d, s] of CONTEXT_PROPS) md.push(`| \`${n}\` | ${t} | ${d} | ${s} |`);
md.push('\n## 4. Booking and email variables\n\nCarried by `meeting_booking_confirmed` and again by `meeting_booking_rescheduled`. The emails (1 confirmation, 2 reminder 24 h, 3 reminder 1 h) read these as custom tokens.\n');
md.push('| Property | Type | What it holds | Example | Where it comes from | Used in email |\n|---|---|---|---|---|---|');
for (const [n, t, d, x, s] of BOOKING_VARS) md.push(`| \`${n}\` | ${t} | ${d} | \`${x === null ? 'null' : String(x).length > 60 ? String(x).slice(0, 57) + '...' : x}\` | ${s} | ${USED_IN[n] || ''} |`);
md.push('\n## 5. Entry paths\n\n| Path | Route | Resulting values |\n|---|---|---|');
for (const [id, r, v] of PATHS) md.push(`| ${id} | ${r} | ${v} |`);
md.push('\n## 6. Open points\n\n' + OPEN_POINTS.map((o) => `- ${o}`).join('\n') + '\n');
fs.writeFileSync(path.join(dir, '..', '..', 'TRACKING.md'), md.join('\n'));

// ---------------- html ----------------
const card = (e) => {
  const props = e.props.length
    ? `<div class="tw"><table><thead><tr><th>Property</th><th>Type</th><th>What it holds</th><th>Example</th></tr></thead><tbody>${e.props.map(([n, t, d, x]) => `<tr><td><code>${esc(n)}</code></td><td>${esc(t)}</td><td>${esc(d)}</td><td><code>${esc(JSON.stringify(x))}</code></td></tr>`).join('')}</tbody></table></div>`
    : e.booking ? '<p class="mut">Carries every booking and email variable, listed in the "Booking and email variables" section, plus the context.</p>' : '<p class="mut">No properties beyond the context.</p>';
  return `<details class="ev" id="ev-${e.name}" data-by="${e.by}" data-role="${e.role}" data-text="${esc((e.name + ' ' + e.when + ' ' + e.paths.join(' ')).toLowerCase())}">
  <summary><span class="nm"><i class="dot ${DOT[e.by]}"></i><code>${e.name}</code>${e.new ? '<span class="tag">Added</span>' : ''}</span><span class="meta"><span class="chip">Step ${esc(e.step)}</span><span class="chip role-${e.role}">${e.role}</span><span class="by">${BY[e.by]}</span></span></summary>
  <div class="body">
    <p class="when"><b>Fires when</b> ${esc(e.when)}</p>
    <p class="paths"><b>Entry paths</b> ${e.paths.map((p) => `<span class="chip">${p}</span>`).join('')}</p>
    ${e.notes.length ? `<ul>${e.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    ${props}
    <div class="jh"><span class="lbl">Example call</span><button class="copy" type="button" data-copy>Copy JSON</button></div>
    <pre class="json"><code>${esc(J(e.json))}</code></pre>
  </div>
</details>`;
};
const groups = ['Site', 'Email', 'Booking lifecycle and call'];
const rows = events.map((e) => `<tr><td><a href="#ev-${e.name}"><code>${e.name}</code></a>${e.new ? '<span class="tag">Added</span>' : ''}</td><td>${esc(e.step)}</td><td><i class="dot ${DOT[e.by]}"></i> ${BY[e.by]}</td><td><span class="role ${e.role}">${e.role}</span></td><td>${esc(e.when)}</td></tr>`).join('');
const html = `<title>Strategy Call Tracking Plan</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap">
<style>
:root{--bg:#f6f6f4;--surface:#ffffff;--fg:#17171a;--muted:#5d5d66;--line:#d9d9de;--site:#6b4fd8;--site-bg:#f0ecff;--mail:#0f7a64;--mail-bg:#e6f5f0;--srv:#8a4b08;--srv-bg:#fbefdf;--new:#b4234a;--new-bg:#fdecef;--code:#f1f1f3;--font:"Geist",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"Geist Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#121215;--surface:#1b1b20;--fg:#ececf0;--muted:#a1a1ab;--line:#33333b;--site:#b4a3ff;--site-bg:#2a2347;--mail:#6fd6b9;--mail-bg:#14332b;--srv:#f2b26b;--srv-bg:#3a2810;--new:#ff8fa8;--new-bg:#3d1621;--code:#101014;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#121215;--surface:#1b1b20;--fg:#ececf0;--muted:#a1a1ab;--line:#33333b;--site:#b4a3ff;--site-bg:#2a2347;--mail:#6fd6b9;--mail-bg:#14332b;--srv:#f2b26b;--srv-bg:#3a2810;--new:#ff8fa8;--new-bg:#3d1621;--code:#101014;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font);font-size:15px;line-height:1.55;padding-inline:max(16px,env(safe-area-inset-left,0px)) max(16px,env(safe-area-inset-right,0px));padding-block:36px 80px}
a{color:var(--site)}code{font-family:var(--mono);font-size:12.5px}
.wrap{max-width:1040px;margin:0 auto;display:flex;flex-direction:column;gap:28px;min-width:0}
.eyebrow,.lbl{font-family:var(--mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:500}
h1{font-size:30px;line-height:1.2;font-weight:600;margin:6px 0 8px;letter-spacing:-.01em;text-wrap:balance}
h2{font-size:21px;font-weight:600;margin:0 0 4px;letter-spacing:-.005em}
.lede{margin:0;max-width:70ch;color:var(--muted)}
.mut{color:var(--muted)}
nav.sec{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--bg);border-bottom:1px solid var(--line);display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;margin-inline:-4px;padding-inline:4px}
nav.sec a{color:var(--muted);text-decoration:none;font-weight:500;font-size:14px;padding:11px 10px;white-space:nowrap;border-bottom:2px solid transparent}
nav.sec a:hover{color:var(--fg);border-bottom-color:var(--fg)}
section{display:flex;flex-direction:column;gap:14px;scroll-margin-top:56px}
.tw{overflow-x:auto;background:var(--surface);border:1px solid var(--line);border-radius:10px}
table{border-collapse:collapse;width:100%;min-width:640px;font-size:13.5px}
th,td{text-align:left;vertical-align:top;padding:9px 12px;border-bottom:1px solid var(--line)}
tr:last-child td{border-bottom:0}
th{font-family:var(--mono);font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:500;background:var(--bg)}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0}.dot.b{background:var(--site)}.dot.s{background:var(--srv)}.dot.m{background:var(--mail)}
.tag{font-family:var(--mono);font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--new);background:var(--new-bg);border-radius:4px;padding:1px 6px;font-weight:500;margin-left:8px;white-space:nowrap}
.chip{font-family:var(--mono);font-size:11.5px;background:var(--bg);border:1px solid var(--line);border-radius:5px;padding:0 7px;margin-right:4px;white-space:nowrap;display:inline-block}
.role{font-family:var(--mono);font-size:11px;border-radius:4px;padding:1px 6px;white-space:nowrap}
.role.counting,.chip.role-counting{background:var(--site-bg);color:var(--site);border-color:transparent}
.role.diagnostic,.chip.role-diagnostic{color:var(--muted)}
.legend{display:flex;flex-wrap:wrap;gap:6px 24px;font-size:13px;color:var(--muted)}.legend span{display:inline-flex;align-items:center;gap:6px}
.tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.tools input{flex:1 1 220px;min-width:0;height:36px;border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:8px;padding:0 12px;font:inherit}
.btn{appearance:none;border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:8px;height:36px;padding:0 12px;font:500 13px var(--font);cursor:pointer}
.btn:hover{border-color:var(--muted)}.btn[aria-pressed="true"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
:focus-visible{outline:2px solid var(--site);outline-offset:2px;border-radius:4px}
details.ev{background:var(--surface);border:1px solid var(--line);border-radius:10px}
details.ev[hidden]{display:none}
details.ev summary{list-style:none;cursor:pointer;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:space-between;padding:12px 16px}
details.ev summary::-webkit-details-marker{display:none}
details.ev summary::before{content:"+";font-family:var(--mono);color:var(--muted);width:14px}
details.ev[open] summary::before{content:"\\2212"}
details.ev .nm{display:flex;align-items:center;gap:8px;flex:1 1 280px}
details.ev .nm code{font-size:14px;font-weight:500}
details.ev .meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.by{font-size:12.5px;color:var(--muted)}
details.ev .body{min-width:0;padding:0 16px 16px;display:flex;flex-direction:column;gap:12px;border-top:1px solid var(--line);padding-top:14px}
.body p{margin:0;max-width:78ch}.body ul{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:3px;font-size:14px;max-width:80ch}
.jh{display:flex;justify-content:space-between;align-items:center;margin-top:4px}
pre.json{margin:0;background:var(--code);border:1px solid var(--line);border-radius:8px;padding:14px 16px;overflow-x:auto;font-family:var(--mono);font-size:12px;line-height:1.6}
.copy{appearance:none;border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:6px;height:28px;padding:0 10px;font:500 12px var(--font);cursor:pointer}
.copy:hover{border-color:var(--muted)}
.gh{font-family:var(--mono);font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin:12px 0 -4px}
ul.op{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;max-width:80ch}
.note{background:var(--srv-bg);border:1px solid var(--line);border-radius:10px;padding:12px 16px;font-size:14px;max-width:80ch}
@media (max-width:620px){h1{font-size:25px}}
</style>
<div class="wrap">
  <header>
    <div class="eyebrow">Databox · Strategy call booking · Tracking plan · ${plan.draft}</div>
    <h1>Strategy call tracking plan</h1>
    <p class="lede">Every event in the flow, when it fires, who fires it, and an example JSON for each. All events carry the full UTM context (first and last touch), the email once it is known, and the booking id once the booking exists. The booking events also carry every value the emails need. Checked against the strategy call spec (version 2). Every event name starts with meeting_ so the whole flow filters in one go, and every event goes to Segment. Event and property names marked Added are not in the spec yet.</p>
  </header>
  <nav class="sec" aria-label="Sections"><a href="#naming">Naming and Segment</a><a href="#coverage">Spec check</a><a href="#events">Events</a><a href="#calls">Page and identify</a><a href="#context">Context and UTMs</a><a href="#variables">Booking and email variables</a><a href="#paths">Entry paths</a><a href="#open">Open points</a></nav>

  <section id="naming" aria-labelledby="h-naming">
    <h2 id="h-naming">Naming and Segment</h2>
    <p class="lede"><b>Rule:</b> ${esc(NAMING.rule)} ${esc(NAMING.exception)}</p>
    <p class="lede">${esc(SEGMENT_NOTE)}</p>
    <div class="tw"><table><thead><tr><th>Name in the spec</th><th>Name in this plan</th></tr></thead><tbody>${NAMING.renames.map(([a, b]) => `<tr><td><code>${a}</code></td><td><code>${b}</code></td></tr>`).join('')}</tbody></table></div>
  </section>

  <section id="coverage" aria-labelledby="h-cov">
    <h2 id="h-cov">Check against the spec</h2>
    <p class="lede">${esc(COVERAGE.spec)}.</p>
    <div class="tw"><table><thead><tr><th>Area</th><th>Result</th></tr></thead><tbody>${COVERAGE.checks.map(([a, b]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div>
  </section>

  <section id="events" aria-labelledby="h-events">
    <h2 id="h-events">Events</h2>
    <div class="legend"><span><i class="dot b"></i>Fired by the browser</span><span><i class="dot s"></i>Fired by our server or a webhook</span><span><i class="dot m"></i>Fired by the email platform</span><span><span class="role counting">counting</span> feeds the success metrics</span><span><span class="role diagnostic">diagnostic</span> explains drop-off, logged only</span></div>
    <div class="tw"><table><thead><tr><th>Event</th><th>Step</th><th>Fired by</th><th>Role</th><th>Fires when</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="tools"><input id="q" type="search" placeholder="Filter events by name, trigger or path (for example P3)" aria-label="Filter events"><button class="btn" type="button" id="all-b" aria-pressed="false" data-by="browser">Browser</button><button class="btn" type="button" id="all-s" aria-pressed="false" data-by="server">Server</button><button class="btn" type="button" id="all-m" aria-pressed="false" data-by="email">Email</button><button class="btn" type="button" id="expand">Expand all</button></div>
    ${groups.map((g) => `<div class="gh">${g}</div>${events.filter((e) => e.group === g).map(card).join('\n')}`).join('\n')}
    <p class="mut" id="none" hidden>No event matches.</p>
  </section>

  <section id="calls" aria-labelledby="h-calls">
    <h2 id="h-calls">Page and identify calls</h2>
    <details class="ev"><summary><span class="nm"><i class="dot b"></i><code>page()</code></span><span class="meta"><span class="by">Browser</span></span></summary><div class="body"><p class="when"><b>Fires when</b> ${esc(PAGE_CALL.when)}</p><ul>${PAGE_CALL.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul><div class="jh"><span class="lbl">Example call</span><button class="copy" type="button" data-copy>Copy JSON</button></div><pre class="json"><code>${esc(J(PAGE_CALL.json))}</code></pre></div></details>
    ${IDENTIFY_CALLS.map((c) => `<details class="ev"><summary><span class="nm"><i class="dot s"></i><code>identify()</code></span><span class="meta"><span class="by">Server</span></span></summary><div class="body"><p class="when"><b>Fires when</b> ${esc(c.when)}</p><div class="jh"><span class="lbl">Example call</span><button class="copy" type="button" data-copy>Copy JSON</button></div><pre class="json"><code>${esc(J(c.json))}</code></pre></div></details>`).join('')}
  </section>

  <section id="context" aria-labelledby="h-context">
    <h2 id="h-context">Context on every event, including UTMs</h2>
    <p class="lede"><b>All UTMs are added, dynamically.</b> A touch script runs on every page load and reads every <code>utm_*</code> parameter on the URL, not a fixed list (the five standard ones are <code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code>, <code>utm_content</code>, <code>utm_term</code>), plus the ad click ids (<code>gclid</code>, <code>gbraid</code>, <code>wbraid</code>, <code>li_fat_id</code>, <code>fbclid</code>, <code>msclkid</code>) and the external referrer. Nothing in the examples is a real UTM value: they are placeholders for whatever is on the URL. It sets <code>first_touch_*</code> once and overwrites <code>last_touch_*</code> on each new marketing touch; a direct visit never overwrites it. Both live in a first-party cookie on <code>.databox.com</code> for 90 days, and travel to the booking in the URL, the cookie, hidden fields and the Cal.com booking metadata. Cal.com allows 50 metadata keys; 29 are used, and each extra <code>utm_*</code> parameter adds two.</p>
    <div class="tw"><table><thead><tr><th>Property</th><th>Type</th><th>What it holds</th><th>Where it is set</th></tr></thead><tbody>${CONTEXT_PROPS.map(([n, t, d, s]) => `<tr><td><code>${n}</code></td><td>${esc(t)}</td><td>${esc(d)}</td><td>${esc(s)}</td></tr>`).join('')}</tbody></table></div>
  </section>

  <section id="variables" aria-labelledby="h-vars">
    <h2 id="h-vars">Booking and email variables</h2>
    <p class="lede">Carried by <code>meeting_booking_confirmed</code> and again by <code>meeting_booking_rescheduled</code>. The three emails (1 confirmation, 2 reminder 24 h, 3 reminder 1 h) read them as custom tokens in the HubSpot workflow.</p>
    <div class="tw"><table><thead><tr><th>Property</th><th>Type</th><th>What it holds</th><th>Example</th><th>Where it comes from</th><th>Email</th></tr></thead><tbody>${BOOKING_VARS.map(([n, t, d, x, s]) => `<tr><td><code>${n}</code></td><td>${esc(t)}</td><td>${esc(d)}</td><td><code>${esc(x === null ? 'null' : String(x).length > 70 ? String(x).slice(0, 67) + '...' : x)}</code></td><td>${esc(s)}</td><td>${esc(USED_IN[n] || '')}</td></tr>`).join('')}</tbody></table></div>
  </section>

  <section id="paths" aria-labelledby="h-paths">
    <h2 id="h-paths">Entry paths</h2>
    <p class="lede">Events and payloads are identical on every path. Only the values change.</p>
    <div class="tw"><table><thead><tr><th>Path</th><th>Route</th><th>Resulting values</th></tr></thead><tbody>${PATHS.map(([id, r, v]) => `<tr><td><b>${id}</b></td><td>${esc(r)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>
  </section>

  <section id="open" aria-labelledby="h-open">
    <h2 id="h-open">Open points</h2>
    <ul class="op">${OPEN_POINTS.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
  </section>
</div>
<script>
(function(){
  var evs=[].slice.call(document.querySelectorAll('details.ev[data-by]'));
  var q=document.getElementById('q'), none=document.getElementById('none'), by={};
  function apply(){
    var t=q.value.trim().toLowerCase(), any=Object.keys(by).some(function(k){return by[k];}), shown=0;
    evs.forEach(function(e){
      var ok=(!t||e.dataset.text.indexOf(t)>-1)&&(!any||by[e.dataset.by]);
      e.hidden=!ok; if(ok) shown++;
    });
    none.hidden=shown>0;
  }
  q.addEventListener('input',apply);
  [].slice.call(document.querySelectorAll('.tools [data-by]')).forEach(function(b){
    b.addEventListener('click',function(){ by[b.dataset.by]=!by[b.dataset.by]; b.setAttribute('aria-pressed',by[b.dataset.by]?'true':'false'); apply(); });
  });
  var ex=document.getElementById('expand'), open=false;
  ex.addEventListener('click',function(){ open=!open; evs.forEach(function(e){ e.open=open; }); ex.textContent=open?'Collapse all':'Expand all'; });
  document.addEventListener('click',function(e){
    var a=e.target.closest('a[href^="#ev-"]'); if(a){ var d=document.getElementById(a.getAttribute('href').slice(1)); if(d){ d.hidden=false; d.open=true; } }
    var b=e.target.closest('[data-copy]'); if(!b) return;
    var code=b.closest('.body').querySelector('pre code'), txt=code.textContent;
    function done(ok){ b.textContent=ok?'Copied':'Select and copy'; setTimeout(function(){ b.textContent='Copy JSON'; },1600); }
    try{ navigator.clipboard.writeText(txt).then(function(){done(true);},function(){ sel(); }); }catch(err){ sel(); }
    function sel(){ var r=document.createRange(); r.selectNodeContents(code); var s=window.getSelection(); s.removeAllRanges(); s.addRange(r); done(false); }
  });
  if(location.hash.indexOf('#ev-')===0){ var d=document.getElementById(location.hash.slice(1)); if(d) d.open=true; }
})();
</script>
`;
fs.writeFileSync(path.join(dir, 'tracking.html'), html);
console.log('events:', events.length, '| TRACKING.md, tracking-plan.json, tracking.html written');
