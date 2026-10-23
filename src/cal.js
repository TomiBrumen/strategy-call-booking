// Direct calls to Cal.com API v2 from the browser. These endpoints are public (no API key, CORS open),
// so there is no backend: Cal.com keeps the calendars, bookings and emails.
const BASE = 'https://api.cal.com/v2';

// One page, several calendars. The page reads ?link=<id> from the URL and looks it up here.
// Only links listed here are allowed, so the page cannot be pointed at any Cal.com user.
// Each entry names a Cal.com event type in one of three ways: eventTypeId, username + eventTypeSlug,
// or teamSlug + eventTypeSlug. All of these are public identifiers, not secrets.
export const LINKS = {
  default: { eventTypeId: 7549757, title: 'Strategy call', length: 30 }, // team event: Databox > "Round robin test"
  'ops-30': { username: 'databox-operations', eventTypeSlug: '30min', title: 'Strategy call', length: 30 },
  'ops-15': { username: 'databox-operations', eventTypeSlug: '15min', title: 'Quick call', length: 15 },
};

const linkId = () => { try { return new URLSearchParams(window.location.search).get('link'); } catch { return null; } };
export const LINK_ID = LINKS[linkId()] ? linkId() : 'default'; // unknown or missing link: default calendar
export const EVENT = LINKS[LINK_ID];

// What identifies the event type in the slots and booking calls.
const eventRef = ({ eventTypeId, username, teamSlug, eventTypeSlug }) =>
  eventTypeId ? { eventTypeId } : { eventTypeSlug, ...(teamSlug ? { teamSlug } : { username }) };

// Demo build (claude.ai artifact): published pages cannot call outside hosts, so Cal.com is simulated.
export const DEMO = import.meta.env.VITE_DEMO === '1';

async function call(path, { method = 'GET', body, version = '2024-08-13' } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'cal-api-version': version, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || json?.message || 'Cal.com request failed');
  return json.data;
}

// ---- simulated Cal.com, demo build only ----
const tzOffsetMs = (ms, tz) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms;
};
const zonedToUtc = (y, m, d, h, min, tz) => {
  const guess = Date.UTC(y, m - 1, d, h, min);
  return guess - tzOffsetMs(guess - tzOffsetMs(guess, tz), tz);
};
function demoSlots(start, end, tz) {
  const out = {};
  const [y0, m0, d0] = start.split('-').map(Number), [y1, m1, d1] = end.split('-').map(Number);
  const last = Date.UTC(y1, m1 - 1, d1);
  for (let t = Date.UTC(y0, m0 - 1, d0); t <= last; t += 864e5) {
    const dt = new Date(t), dow = dt.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    const list = [];
    for (let h = 9; h < 17; h++) for (const min of [0, 30]) {
      if ((d * 7 + h * 3 + min / 30) % 4 === 0) continue; // some slots already taken
      const ms = zonedToUtc(y, m, d, h, min, tz);
      if (ms > Date.now() + 4 * 36e5) list.push({ start: new Date(ms).toISOString() });
    }
    if (list.length) out[`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`] = list;
  }
  return out;
}
const demoBooking = ({ start }) => ({
  uid: 'demo' + Math.random().toString(36).slice(2, 10), start, end: new Date(new Date(start).getTime() + EVENT.length * 6e4).toISOString(),
  hosts: [{ id: 1, name: 'Databox Operations', username: 'databox-operations' }], meetingUrl: '',
});

export const getSlots = (start, end, timeZone) => DEMO ? Promise.resolve(demoSlots(start, end, timeZone)) :
  call(`/slots?${new URLSearchParams({ ...eventRef(EVENT), start, end, timeZone })}`, { version: '2024-09-04' });

export const createBooking = ({ start, name, email, phone, timeZone, metadata }) => DEMO ? new Promise((r) => setTimeout(() => r(demoBooking({ start })), 900)) :
  call('/bookings', {
    method: 'POST',
    body: {
      start, ...eventRef(EVENT),
      attendee: { name, email, timeZone, language: 'en', ...(phone ? { phoneNumber: phone } : {}) },
      metadata,
    },
  });

// Host photo is not in the booking response. It is public on the host's profile, looked up by username.
export async function getHostAvatar(username) {
  if (!username || DEMO) return null;
  try {
    const list = await call(`/event-types?username=${encodeURIComponent(username)}`, { version: '2024-06-14' });
    return list?.[0]?.users?.find((u) => u.username === username)?.avatarUrl || null;
  } catch { return null; }
}

// Reschedule and cancel are not callable from the browser: Cal.com only allows attendees to do that on its own pages.
export const rescheduleUrl = (uid) => `https://cal.com/reschedule/${uid}`;
export const cancelUrl = (uid) => `https://cal.com/booking/${uid}?cancel=true`;
