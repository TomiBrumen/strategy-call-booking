const pad = (n) => String(n).padStart(2, '0');
export const rand = (p) => p + Math.random().toString(36).slice(2, 10);
export const browserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const fmtDate = (iso, tz) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz }).format(new Date(iso));
export const fmtTime = (iso, tz) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(new Date(iso));
export const tzName = (iso, tz) =>
  new Intl.DateTimeFormat(undefined, { timeZoneName: 'short', timeZone: tz }).formatToParts(new Date(iso)).find((p) => p.type === 'timeZoneName')?.value || tz;
export const fmtMonth = (d) => new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(d);

// Local YYYY-MM-DD of a Date built from year/month/day
export const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

const icsStamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
export function calendarLinks({ title, start, end, details }) {
  const google = 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
    action: 'TEMPLATE', text: title, dates: `${icsStamp(start)}/${icsStamp(end)}`, details,
  });
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Databox//Booking simulator//EN', 'BEGIN:VEVENT',
    `UID:${icsStamp(start)}@databox-sim`, `DTSTAMP:${icsStamp(new Date().toISOString())}`,
    `DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`, `SUMMARY:${title}`, `DESCRIPTION:${details}`,
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const file = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  return { google, apple: file, outlook: file };
}

