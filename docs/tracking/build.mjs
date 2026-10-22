// node docs/tracking/build.mjs
// Writes TRACKING.md (full), tracking-plan.json (full) and tracking.html (short, for developers) from plan.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EVENTS, CONTEXT_PROPS, BOOKING_VARS, IDENTIFY_CALLS, PATHS, OPEN_POINTS, COVERAGE, NAMING, SEGMENT_NOTE, LATER,
  UTM_RULE, PAGE_NOTE, SEGMENT_SOURCE, callOf, jsonFor,
} from './plan.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const J = (o) => JSON.stringify(o, null, 2);
const BY = { browser: 'Browser', server: 'Server', email: 'Email platform' };
const DOT = { browser: 'b', server: 's', email: 'm' };
const UTM_LINE = 'Plus all UTMs, each as a separate property (see the UTM rule).';
const DRAFT = 'Draft 3, 22 Oct 2026';

const USED_IN = {
  booking_id: '1, 2, 3, 5 (reschedule and cancel links)', call_at: 'workflow timing', duration_min: '1', call_weekday: '1', call_date_text: '1, 2, 5, 6', call_time_text: '1, 2, 3, 5, 7',
  join_url: '2, 3', host_name: '1, 2, 3, 5, 6, 7', host_first_name: '2, 3, 5, 6, 7', host_role: '1, 2, 3, 5, 6, 7', host_photo_url: '1, 2, 3, 5, 6, 7',
  calendar_google_url: '1, 5', calendar_outlook_url: '1', calendar_ics_url: '1', rebook_url: '4, 6, 7', name: 'contact', first_name: '1 to 7', last_name: '1',
  reschedule_url: '1, 2, 3, 5', cancel_url: '1, 2, 3, 5',
};

const events = EVENTS.map((e) => ({ ...e, call: callOf(e), json: jsonFor(e) }));
const inBuild = events.filter((e) => !e.later), later = events.filter((e) => e.later);
const flowProps = CONTEXT_PROPS.filter(([n]) => !/^(first|last)_touch/.test(n));

// ---------------- JSON ----------------
const plan = {
  title: 'Strategy call tracking plan', draft: DRAFT, source: 'Strategy Call Booking Flow spec (version 2)',
  rules: { utm: UTM_RULE, naming: NAMING, segment: SEGMENT_NOTE, pageCalls: PAGE_NOTE },
  contextProperties: CONTEXT_PROPS.map(([name, type, description, source]) => ({ name, type, description, source })),
  bookingVariables: BOOKING_VARS.map(([name, type, description, example, source]) => ({ name, type, description, example, source, usedInEmail: USED_IN[name] || null })),
  events: events.map((e) => ({
    inThisBuild: !e.later, name: e.name, segmentCall: e.call, step: e.step, firedBy: (e.byLabel || BY[e.by]), role: e.role,
    when: e.when, paths: e.paths, notes: e.notes,
    specificProperties: e.props.map(([n, t, d, x]) => ({ name: n, type: t, description: d, example: x })),
    example: e.json, plusUtms: 'All UTMs are also sent on this event, as separate properties.',
  })),
  implementedSeparately: LATER, identifyCalls: IDENTIFY_CALLS, entryPaths: PATHS.map(([id, route, values]) => ({ id, route, values })), openPoints: OPEN_POINTS, coverage: COVERAGE,
};
fs.writeFileSync(path.join(dir, 'tracking-plan.json'), J(plan) + '\n');

// ---------------- markdown (full) ----------------
const md = [];
md.push(`# Strategy call tracking plan\n\n${DRAFT}. Built from the "${plan.source}". Every event below is in the spec. Property descriptions ending in "Added." are the only things this plan adds to it.\n`);
md.push('## Rules for every event\n');
md.push(`1. **${UTM_RULE.headline}** ${UTM_RULE.body} ${UTM_RULE.firstTouch} ${UTM_RULE.lastTouch}`);
md.push(`2. **Names** follow this rule: ${NAMING.rule} ${NAMING.exception}`);
md.push(`3. **Call type:** ${PAGE_NOTE} Everything else is a \`track\` call.`);
md.push(`4. ${SEGMENT_NOTE}`);
md.push('5. **Also on every event:** `email` and `hashed_email` (SHA-256 of the trimmed, lowercased email) as soon as the email is known, and `booking_id` once the booking exists. The flow properties are in section 4.\n');
const row = (e) => `| \`${e.name}\` | ${e.call} | ${(e.byLabel || BY[e.by])} | ${e.role} | ${e.when} |`;
md.push(`## Where to send\n\n- Segment workspace \`${SEGMENT_SOURCE.workspace}\`, source \`${SEGMENT_SOURCE.source}\`, source ID \`${SEGMENT_SOURCE.sourceId}\`. Keys page: ${SEGMENT_SOURCE.keysPage}\n${SEGMENT_SOURCE.lines.map((l) => `- ${l}`).join('\n')}\n`);
md.push('## 1. Events in this build\n');
md.push('| Event | Segment call | Fired by | Role | Fires when |\n|---|---|---|---|---|');
for (const e of inBuild) md.push(row(e));
md.push('\n"counting" events feed the success metrics. "diagnostic" events explain drop-off.\n');
const eventMd = (e) => {
  md.push(`### \`${e.name}\`\n`);
  md.push(`- **Segment call:** ${e.call} · **Fired by:** ${(e.byLabel || BY[e.by])} · **Role:** ${e.role} · **Step:** ${e.step}\n- **Fires when:** ${e.when}\n- **Entry paths:** ${e.paths.join(', ')}`);
  if (e.props.length) md.push(`- **Properties:** ${e.props.map(([n, t, d]) => `\`${n}\` (${t}): ${d}`).join('; ')}`);
  if (e.booking) md.push('- **Properties:** all booking and email variables, see section 5.');
  for (const n of e.notes) md.push(`- ${n}`);
  md.push('\n```json\n' + J(e.json) + '\n```\n_' + UTM_LINE + '_\n');
};
for (const e of inBuild) eventMd(e);
md.push(`## 2. ${LATER.title}\n\n${LATER.intro}\n\n${LATER.effects.map((x) => `- ${x}`).join('\n')}\n`);
md.push('| Event | Segment call | Fired by | Role | Fires when |\n|---|---|---|---|---|');
for (const e of later) md.push(row(e));
md.push('');
for (const e of later) eventMd(e);
md.push('## 3. Identify call\n');
for (const c of IDENTIFY_CALLS) md.push(`${c.when}\n\n\`\`\`json\n${J(c.json)}\n\`\`\`\n`);
md.push('## 4. Flow properties on every event\n');
md.push('| Property | Type | What it holds | Where it is set |\n|---|---|---|---|');
for (const [n, t, d, s] of flowProps) md.push(`| \`${n}\` | ${t} | ${d} | ${s} |`);
md.push('\nUTMs: see rule 1. They are also passed to the booking in the URL, hidden fields and the Cal.com booking metadata.\n');
md.push('## 5. Booking and email variables\n\nCarried by `meeting_booking_confirmed` (and `meeting_booking_rescheduled`). The seven emails read these as custom tokens.\n');
md.push('| Property | Type | What it holds | Example | Where it comes from | Used in email |\n|---|---|---|---|---|---|');
for (const [n, t, d, x, s] of BOOKING_VARS) md.push(`| \`${n}\` | ${t} | ${d} | \`${x === null ? 'null' : String(x).length > 60 ? String(x).slice(0, 57) + '...' : x}\` | ${s} | ${USED_IN[n] || ''} |`);
md.push('\n## 6. Entry paths\n\n| Path | Route | Resulting values |\n|---|---|---|');
for (const [id, r, v] of PATHS) md.push(`| ${id} | ${r} | ${v} |`);
md.push('\n## 7. Open points\n\n' + OPEN_POINTS.map((o) => `- ${o}`).join('\n') + '\n');
md.push('## Naming: spec name to plan name\n\n| Spec | Plan |\n|---|---|\n' + NAMING.renames.map(([a, b]) => `| \`${a}\` | \`${b}\` |`).join('\n') + '\n');
md.push('## Check against the spec\n\n' + COVERAGE.spec + '.\n\n' + COVERAGE.checks.map(([a, b]) => `- **${a}:** ${b}`).join('\n') + '\n');
fs.writeFileSync(path.join(dir, '..', '..', 'TRACKING.md'), md.join('\n'));

// ---------------- html (short, for the developer) ----------------
const card = (e) => {
  const props = e.props.length
    ? `<p class="pr"><b>Extra properties</b> ${e.props.map(([n, t, , x]) => `<code>${esc(n)}</code> <span class="mut">${esc(t)}, e.g. ${esc(JSON.stringify(x))}</span>`).join(' · ')}</p>`
    : e.booking ? '<p class="pr"><b>Extra properties</b> every value in the table "What the booking event carries".</p>' : '';
  const notes = e.notes.slice(0, 2);
  return `<details class="ev" id="ev-${e.name}">
  <summary><span class="nm"><i class="dot ${DOT[e.by]}"></i><code>${e.name}</code></span><span class="meta"><span class="chip call-${e.call}">${e.call}</span><span class="by">${(e.byLabel || BY[e.by])}</span></span></summary>
  <div class="body">
    <p><b>Fires when</b> ${esc(e.when)}</p>
    ${props}
    ${notes.length ? `<ul>${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    <div class="jh"><span class="lbl">Example call</span><button class="copy" type="button" data-copy>Copy JSON</button></div>
    <pre class="json"><code>${esc(J(e.json))}</code></pre>
    <p class="mut utmline">${UTM_LINE}</p>
  </div>
</details>`;
};
const html = `<title>Strategy Call Tracking Plan</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap">
<style>
:root{--bg:#f6f6f4;--surface:#ffffff;--fg:#17171a;--muted:#5d5d66;--line:#d9d9de;--site:#6b4fd8;--site-bg:#f0ecff;--srv:#8a4b08;--srv-bg:#fbefdf;--mail:#0f7a64;--new:#b4234a;--new-bg:#fdecef;--code:#f1f1f3;--font:"Geist",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"Geist Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#121215;--surface:#1b1b20;--fg:#ececf0;--muted:#a1a1ab;--line:#33333b;--site:#b4a3ff;--site-bg:#2a2347;--srv:#f2b26b;--srv-bg:#3a2810;--mail:#6fd6b9;--new:#ff8fa8;--new-bg:#3d1621;--code:#101014;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#121215;--surface:#1b1b20;--fg:#ececf0;--muted:#a1a1ab;--line:#33333b;--site:#b4a3ff;--site-bg:#2a2347;--srv:#f2b26b;--srv-bg:#3a2810;--mail:#6fd6b9;--new:#ff8fa8;--new-bg:#3d1621;--code:#101014;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font);font-size:15px;line-height:1.55;padding-inline:max(16px,env(safe-area-inset-left,0px)) max(16px,env(safe-area-inset-right,0px));padding-block:32px 72px}
a{color:var(--site)}code{font-family:var(--mono);font-size:12.5px}
.wrap{max-width:960px;margin:0 auto;display:flex;flex-direction:column;gap:26px;min-width:0}
.eyebrow,.lbl{font-family:var(--mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:500}
h1{font-size:28px;line-height:1.2;font-weight:600;margin:6px 0 8px;letter-spacing:-.01em;text-wrap:balance}
h2{font-size:20px;font-weight:600;margin:0}
.lede{margin:0;max-width:70ch;color:var(--muted)}.mut{color:var(--muted)}
section{display:flex;flex-direction:column;gap:12px}
.rules{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:16px 18px}
.rules ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:12px}
.utmbox{background:var(--srv-bg);border-radius:8px;padding:12px 14px;margin-top:8px;font-size:14px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.chip{font-family:var(--mono);font-size:11.5px;background:var(--bg);border:1px solid var(--line);border-radius:5px;padding:0 7px;white-space:nowrap}
.chip.call-page{background:var(--site-bg);color:var(--site);border-color:transparent}
.tw{overflow-x:auto;background:var(--surface);border:1px solid var(--line);border-radius:10px}
table{border-collapse:collapse;width:100%;min-width:560px;font-size:13.5px}
th,td{text-align:left;vertical-align:top;padding:8px 12px;border-bottom:1px solid var(--line)}
tr:last-child td{border-bottom:0}
th{font-family:var(--mono);font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:500;background:var(--bg)}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0}.dot.b{background:var(--site)}.dot.s{background:var(--srv)}.dot.m{background:var(--mail)}
.tag{font-family:var(--mono);font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--new);background:var(--new-bg);border-radius:4px;padding:1px 6px;font-weight:500;margin-left:8px}
details.ev{background:var(--surface);border:1px solid var(--line);border-radius:10px}
details.ev summary{list-style:none;cursor:pointer;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:space-between;padding:11px 14px}
details.ev summary::-webkit-details-marker{display:none}
details.ev summary::before{content:"+";font-family:var(--mono);color:var(--muted);width:14px}
details.ev[open] summary::before{content:"\\2212"}
.nm{display:flex;align-items:center;gap:8px;flex:1 1 260px}.nm code{font-size:14px;font-weight:500}
.meta{display:flex;align-items:center;gap:8px}.by{font-size:12.5px;color:var(--muted)}
.body{min-width:0;padding:14px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:10px}
.body p{margin:0;max-width:80ch}.body ul{margin:0;padding-left:18px;font-size:14px;max-width:80ch;display:flex;flex-direction:column;gap:3px}
.pr{font-size:14px}.jh{display:flex;justify-content:space-between;align-items:center;margin-top:2px}
pre.json{margin:0;background:var(--code);border:1px solid var(--line);border-radius:8px;padding:12px 14px;overflow-x:auto;font-family:var(--mono);font-size:12px;line-height:1.6}
.utmline{font-size:13px}
.copy,.btn{appearance:none;border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:6px;height:28px;padding:0 10px;font:500 12px var(--font);cursor:pointer}
.copy:hover,.btn:hover{border-color:var(--muted)}
:focus-visible{outline:2px solid var(--site);outline-offset:2px;border-radius:4px}
ul.op{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;max-width:80ch}
.row{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
@media (max-width:620px){h1{font-size:24px}}
</style>
<div class="wrap">
  <header>
    <div class="eyebrow">Databox · Strategy call booking · Tracking plan · ${DRAFT}</div>
    <h1>Strategy call tracking plan</h1>
    <p class="lede">What to send, when, and the JSON for each event. All events go to Segment. Every name starts with <code>meeting_</code>.</p>
  </header>

  <section class="rules" aria-labelledby="h-rules">
    <h2 id="h-rules">Include on every event</h2>
    <ol>
      <li><b>${esc(UTM_RULE.headline)}</b> ${esc(UTM_RULE.body)}
        <div class="utmbox"><b>first_touch_*</b> ${esc(UTM_RULE.firstTouch.replace("first_touch_* is ", "is "))}<br><b>last_touch_*</b> ${esc(UTM_RULE.lastTouch.replace("last_touch_* is ", "is "))}</div></li>
      <li><b>Segment call type.</b> ${esc(PAGE_NOTE)} Everything else is a <code>track</code> call.</li>
      <li><b>Who and what:</b> <code>email</code> and <code>hashed_email</code> (SHA-256 of the trimmed, lowercased email) as soon as the email is known, <code>booking_id</code> once the booking exists, and the flow properties: <code>booking_session_id</code>, <code>anonymous_id</code>, <code>flow_entry</code>, <code>flow_start</code>, <code>source_page</code>, <code>cta_id</code>, <code>variant_booking</code>, <code>variant_confirmation</code>.</li>
    </ol>
  </section>

  <section aria-labelledby="h-send">
    <h2 id="h-send">Where to send</h2>
    <div class="rules"><ul class="op"><li>Segment workspace <code>${SEGMENT_SOURCE.workspace}</code>, source <code>${SEGMENT_SOURCE.source}</code>, source ID <code>${SEGMENT_SOURCE.sourceId}</code>. <a href="${SEGMENT_SOURCE.keysPage}" target="_blank" rel="noreferrer">Keys page</a></li>${SEGMENT_SOURCE.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>
  </section>

  <section id="events" aria-labelledby="h-events">
    <div class="row"><h2 id="h-events">Events</h2><button class="btn" type="button" id="expand">Expand all</button></div>
    <div class="tw"><table><thead><tr><th>Event</th><th>Call</th><th>Fired by</th><th>Fires when</th></tr></thead><tbody>${inBuild.map((e) => `<tr><td><a href="#ev-${e.name}"><code>${e.name}</code></a></td><td><span class="chip call-${e.call}">${e.call}</span></td><td><i class="dot ${DOT[e.by]}"></i> ${(e.byLabel || BY[e.by])}</td><td>${esc(e.when)}</td></tr>`).join('')}</tbody></table></div>
    ${inBuild.map(card).join('\n')}
  </section>

  <section aria-labelledby="h-vars">
    <h2 id="h-vars">What the booking event carries</h2>
    <p class="lede"><code>meeting_booking_confirmed</code> carries every value the emails need, so nothing is looked up later.</p>
    <div class="tw"><table><thead><tr><th>Property</th><th>Example</th><th>Where it comes from</th></tr></thead><tbody>${BOOKING_VARS.map(([n, , , x, s]) => `<tr><td><code>${n}</code></td><td><code>${esc(x === null ? 'null' : String(x).length > 48 ? String(x).slice(0, 45) + '...' : x)}</code></td><td>${esc(s)}</td></tr>`).join('')}</tbody></table></div>
  </section>

  <section aria-labelledby="h-id">
    <h2 id="h-id">Identify</h2>
    <p class="lede">${esc(IDENTIFY_CALLS[0].when)} The same call goes out at <code>meeting_booking_confirmed</code> when no form ran (targeted ads, direct email links).</p>
    <details class="ev"><summary><span class="nm"><i class="dot s"></i><code>identify()</code></span><span class="meta"><span class="by">Server</span></span></summary><div class="body"><div class="jh"><span class="lbl">Example call</span><button class="copy" type="button" data-copy>Copy JSON</button></div><pre class="json"><code>${esc(J(IDENTIFY_CALLS[0].json))}</code></pre></div></details>
  </section>

  <section aria-labelledby="h-later">
    <h2 id="h-later">${esc(LATER.title)}</h2>
    <p class="lede">${esc(LATER.intro)}</p>
    <div class="tw"><table><thead><tr><th>Event</th><th>Call</th><th>Fires when</th></tr></thead><tbody>${later.map((e) => `<tr><td><code>${e.name}</code></td><td>${e.call}</td><td>${esc(e.when)}</td></tr>`).join('')}</tbody></table></div>
  </section>

  <section aria-labelledby="h-open">
    <h2 id="h-open">Open points</h2>
    <ul class="op">${OPEN_POINTS.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
  </section>
</div>
<script>
(function(){
  var evs=[].slice.call(document.querySelectorAll('details.ev'));
  var ex=document.getElementById('expand'), open=false;
  ex.addEventListener('click',function(){ open=!open; evs.forEach(function(e){ e.open=open; }); ex.textContent=open?'Collapse all':'Expand all'; });
  document.addEventListener('click',function(e){
    var a=e.target.closest('a[href^="#ev-"]'); if(a){ var d=document.getElementById(a.getAttribute('href').slice(1)); if(d) d.open=true; }
    var b=e.target.closest('[data-copy]'); if(!b) return;
    var code=b.closest('.body').querySelector('pre code'), txt=code.textContent;
    function done(ok){ b.textContent=ok?'Copied':'Select and copy'; setTimeout(function(){ b.textContent='Copy JSON'; },1600); }
    function sel(){ var r=document.createRange(); r.selectNodeContents(code); var s=window.getSelection(); s.removeAllRanges(); s.addRange(r); done(false); }
    try{ navigator.clipboard.writeText(txt).then(function(){done(true);},sel); }catch(err){ sel(); }
  });
  if(location.hash.indexOf('#ev-')===0){ var d=document.getElementById(location.hash.slice(1)); if(d) d.open=true; }
})();
</script>
`;
fs.writeFileSync(path.join(dir, 'tracking.html'), html);
console.log('events:', events.length, '| in build:', inBuild.length, '| separate:', later.length, '| html KB:', Math.round(html.length / 1024));
