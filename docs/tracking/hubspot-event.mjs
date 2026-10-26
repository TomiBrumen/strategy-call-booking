// Generates HUBSPOT_EVENT.md from plan.mjs: the property list for the one HubSpot custom event "Meeting".
import { EVENTS, CONTEXT_PROPS, BOOKING_VARS, jsonFor } from './plan.mjs';
import fs from 'fs';

const info = {};
for (const [n, t, d] of CONTEXT_PROPS) info[n] = { t, d };
for (const v of BOOKING_VARS) info[v[0]] = { t: v[1], d: v[2] };
const use = {};
for (const e of EVENTS) {
  for (const p of (e.props || [])) info[p[0]] = info[p[0]] || { t: p[1], d: p[2] };
  for (const k of Object.keys(jsonFor(e).properties)) (use[k] = use[k] || []).push(e.name.replace('meeting_', ''));
}

// Not on the HubSpot event: touch properties (contact properties instead), identifiers kept in Segment,
// and two properties dropped to stay under HubSpot's 50-property limit with headroom.
const SKIP = /^(first_touch|last_touch)|^(hutk|anonymous_id|hashed_email|email_domain|contact_id)$/;
const read = { booking_id: 'emails', booking_session_id: 'workflow', call_at: 'workflow', call_date_text: 'emails', call_time_text: 'emails', call_weekday: 'emails', join_url: 'emails', host_name: 'emails', host_first_name: 'emails', host_role: 'emails', host_photo_url: 'emails', calendar_google_url: 'emails', calendar_outlook_url: 'emails', calendar_ics_url: 'emails', rebook_url: 'emails', lead_time_h: 'workflow', host_email: 'workflow', email: 'workflow', first_name: 'emails', last_name: 'emails', name: '', phone: '' };
const vals = { flow_entry: 'cta, ad, email, direct', flow_start: 'booking_page, calendar', variant_booking: 'A, B', variant_confirmation: 'A, B', page: 'booking, confirmation', calendar: 'google, apple, outlook', email_id: 'confirmation, reminder_24h, reminder_1h, recovery, no_show, post_call', link_id: 'join, reschedule, cancel, rebook, report, add_google, add_outlook, add_apple', canceled_by: 'visitor, host' };
const typeOf = (t) => /number/.test(t) ? 'Number' : /datetime/.test(t) ? 'Date and time' : 'Single-line text';
const short = { 'Single-line text': 'text', Number: 'number', 'Date and time': 'datetime', 'Dropdown select': 'dropdown' };

export const HS_SKIP_NOTE = true;
const keys = Object.keys(use).filter((k) => !SKIP.test(k));
export const HS_EVENT_NAMES = EVENTS.map((e) => e.name);
export const rows = [['event_name', 'Dropdown select', HS_EVENT_NAMES.map((n) => '`' + n + '`').join(', '), 'workflow', 'all']].concat(
  keys.map((k) => [k, typeOf(info[k].t), vals[k] || '', read[k] || '', [...new Set(use[k])].join(', ')]));

const table = rows.map((r) => `| \`${r[0]}\` | ${r[1]} | ${r[2]} | ${r[3]} | ${r[4]} |`).join('\n');
export const plain = rows.map((r) => `${r[0]} - ${short[r[1]]}`).join('\n');

const md = `# HubSpot custom event for the strategy call flow

One custom event, \`Meeting\`, receives every \`meeting_*\` event from Segment. Which one it is lives in the property \`event_name\`.

## Event
- Label: Meeting. Internal name: \`meeting\` (HubSpot adds its own prefix). Associated object: contact.
- The contact is matched on **email**, sent as the event identifier and also kept as the property \`email\`. \`hutk\` goes in the HubSpot user token field and is not a property.

## Plain list (${rows.length} properties)
\`\`\`
${plain}
\`\`\`

## Details
Recommended types are HubSpot field types. Closed lists are kept as single-line text on purpose: a value that is not on a dropdown list can be rejected, and then the event is lost.

| Internal name | Field type | Expected values | Read by | Sent on events |
|---|---|---|---|---|
${table}

"Read by": emails = an email token reads it; workflow = a workflow branch or delay reads it. Blank = kept for reporting.

## Not on the event
- **Contact properties instead:** the first and last touch UTMs (\`first_touch_*\`, \`last_touch_*\`, 20 properties), written by the contact mapping.
- **Stay in Segment:** \`hutk\` (sent as the user token), \`hashed_email\`, \`anonymous_id\`.
- **Dropped to stay under the limit:** \`email_domain\` (derivable from \`email\`) and \`contact_id\` (HubSpot already attaches the event to the contact).

## Limits to know
- 50 properties per event occurrence (this list has ${rows.length}); names up to 50 characters, lowercase letters, numbers and underscores, starting with a letter.
- Values up to 256 characters. Keep \`calendar_google_url\` and \`calendar_outlook_url\` under 256 characters, or they may be cut.
- Date and time values go in as ISO 8601 or epoch milliseconds.
- Check that HubSpot accepts a Number type for custom event properties in your portal. If not, use single-line text for \`duration_min\`, \`lead_time_h\`, \`host_id\`, \`pct_watched\` and \`days_ahead\`.
`;
if (process.argv[1] && process.argv[1].endsWith('hubspot-event.mjs')) {
  fs.writeFileSync('../../HUBSPOT_EVENT.md', md);
  console.log(rows.length);
  console.log(plain);
}
