// Single source of truth for the strategy call tracking plan.
// `node docs/tracking/build.mjs` turns this into TRACKING.md, tracking-plan.json and tracking.html.
// Event names and properties follow the spec ("Strategy call booking flow", draft 7). Additions are marked "added".

// ---------- sample values (one consistent visitor and booking, all fictional) ----------
export const S = {
  anonymousId: '4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34',
  userId: 'contact_8812',
  bookingSessionId: 'bs_7f3a91c2',
  email: 'ana.novak@acme.com',
  bookingId: 'k9Zp3QmV7sLw2TnXb8Rc4D',
  firstTouchAt: '2026-10-19T09:12:00Z',
  callAt: '2026-10-29T14:30:00Z',
};

// ---------- properties every event carries ("the full context") ----------
export const CONTEXT_PROPS = [
  ['anonymous_id', 'string', 'Segment anonymous id. Joins every event before the person is known. Passed as ajs_aid across domains.', 'Segment cookie'],
  ['booking_session_id', 'string', 'Created at the CTA click, or at the first flow page if there was no click. The one id the scheduler must return.', 'URL param, cookie, hidden field, Cal.com metadata'],
  ['flow_entry', 'enum', 'What delivered the visitor to the flow: cta, ad, email, direct.', 'Read at the booking page or calendar'],
  ['flow_start', 'enum', 'Which page they entered the flow on: booking_page or calendar.', 'Read at the booking page or calendar'],
  ['source_page', 'string or null', 'Path of the page where the CTA was clicked. Null on targeted ads, marketing emails and direct visits. Never the booking page itself.', 'Written at the CTA click'],
  ['cta_id', 'string or null', 'The data-cta id of the clicked CTA. For marketing emails: email id plus link id.', 'Written at the CTA click'],
  ['first_touch_source', 'string or null', 'utm_source of the first marketing touch, whatever value is on the URL.', 'Touch script, cookie on .databox.com'],
  ['first_touch_medium', 'string or null', 'utm_medium of the first marketing touch.', 'Touch script'],
  ['first_touch_campaign', 'string or null', 'utm_campaign of the first marketing touch.', 'Touch script'],
  ['first_touch_content', 'string or null', 'utm_content of the first marketing touch.', 'Touch script'],
  ['first_touch_term', 'string or null', 'utm_term of the first marketing touch.', 'Touch script'],
  ['first_touch_click_id', 'string or null', 'Ad click id of the first touch. Ad platforms match offline conversions on it.', 'Touch script'],
  ['first_touch_click_id_type', 'enum or null', 'gclid, gbraid, wbraid, li_fat_id, fbclid or msclkid.', 'Touch script'],
  ['first_touch_landing_page', 'string or null', 'Path of the first page they landed on. One field of the touch, not the touch itself.', 'Touch script'],
  ['first_touch_referrer_domain', 'string or null', 'Domain of the external referrer at the first touch.', 'Touch script'],
  ['first_touch_at', 'ISO datetime', 'When the first touch happened (UTC).', 'Touch script'],
  ['last_touch_source', 'string or null', 'utm_source of the page where the visitor started the flow (the page where they clicked the CTA). Same shape as first_touch_*.', 'Read from that page at the CTA click'],
  ['last_touch_medium', 'string or null', 'See last_touch_source.', 'Read from the page where the flow started'],
  ['last_touch_campaign', 'string or null', 'See last_touch_source.', 'Read from the page where the flow started'],
  ['last_touch_content', 'string or null', 'See last_touch_source.', 'Read from the page where the flow started'],
  ['last_touch_term', 'string or null', 'See last_touch_source.', 'Read from the page where the flow started'],
  ['last_touch_click_id', 'string or null', 'See last_touch_source.', 'Read from the page where the flow started'],
  ['last_touch_click_id_type', 'enum or null', 'See last_touch_source.', 'Read from the page where the flow started'],
  ['last_touch_landing_page', 'string or null', 'Path of the page where the CTA was clicked (the same page as source_page).', 'Read from that page at the CTA click'],
  ['last_touch_referrer_domain', 'string or null', 'See last_touch_source.', 'Read from the page where the flow started'],
  ['last_touch_at', 'ISO datetime', 'When the CTA was clicked (UTC).', 'Read at the CTA click'],
  ['first_touch_<other utm_* parameter>', 'string or null', 'Every other utm_* parameter found on the URL (for example utm_id) is captured the same way. Names follow the same pattern; confirm the exact naming with Engineering.', 'Touch script'],
  ['last_touch_<other utm_* parameter>', 'string or null', 'Same, read from the page where the flow started.', 'Read from the page where the flow started'],
  ['variant_booking', 'enum A or B', 'Booking page A/B variant. Sticky per visitor, stored on the booking.', 'Assigned on first view, cookie'],
  ['variant_confirmation', 'enum A or B', 'Confirmation page A/B variant. Sticky per visitor.', 'Assigned on first view, cookie'],
  ['email', 'string', 'The visitor\'s email, on every event from the moment it is known (form submit, or the calendar details). Anonymous before that. Added.', 'Form or calendar details'],
  ['booking_id', 'string', 'The Cal.com booking id, on every event once the booking exists. Added.', 'Cal.com booking response or webhook'],
];

// level: how much of the context exists when the event fires
//   anon = no email yet, known = email known, booked = email and booking id known
export function context(level) {
  // UTM and touch properties are NOT repeated here: every event must also include them, as separate properties.
  const c = {
    anonymous_id: S.anonymousId, booking_session_id: S.bookingSessionId,
    flow_entry: 'cta', flow_start: 'booking_page', source_page: '/page-xyz', cta_id: 'xyz_inline',
    variant_booking: 'A', variant_confirmation: 'A',
  };
  if (level === 'known' || level === 'booked') c.email = S.email;
  if (level === 'booked') c.booking_id = S.bookingId;
  return c;
}

// ---------- booking and email variables (carried by meeting_booking_confirmed and meeting_booking_rescheduled) ----------
// [name, type, description, example value, where it comes from]
export const BOOKING_VARS = [
  ['booking_id', 'string', 'Cal.com booking id (uid). Builds the reschedule and cancel links.', S.bookingId, 'Cal.com webhook: payload.uid'],
  ['call_at', 'ISO datetime', 'Call start, UTC. Drives the 24 h and 1 h reminder timing.', S.callAt, 'Cal.com webhook: payload.startTime'],
  ['call_end_at', 'ISO datetime', 'Call end, UTC. Added.', '2026-10-29T15:30:00Z', 'Cal.com webhook: payload.endTime'],
  ['duration_min', 'number', 'Call length in minutes. The designs say 60. Added.', 60, 'Cal.com webhook: end minus start'],
  ['lead_time_h', 'number', 'Hours between booking and call. Reminder 2 is skipped under 24.', 173, 'Computed'],
  ['time_zone', 'string', 'Visitor\'s time zone (IANA).', 'Europe/Ljubljana', 'Cal.com webhook: attendees[0].timeZone'],
  ['call_weekday', 'string', 'Weekday of the call in the visitor\'s time zone. Email: "See you on ...". Added.', 'Thursday', 'Computed in the visitor\'s time zone'],
  ['call_date_text', 'string', 'Date as shown in emails, visitor\'s time zone. Added.', 'Thursday, 29 October', 'Computed'],
  ['call_time_text', 'string', 'Time with zone as shown in emails. Added.', '15:30 (CET)', 'Computed'],
  ['join_url', 'string', 'Meeting link for the Join the Call buttons. Added.', 'https://meet.google.com/abc-defg-hij', 'Cal.com webhook: payload.videoCallData.url or location'],
  ['meeting_location', 'string', 'Where the call happens, for the "Where" field. Added.', 'Video call', 'Cal.com webhook: payload.location'],
  ['host_id', 'number', 'Cal.com id of the assigned host (round robin pick).', 1001, 'Cal.com webhook: organizer.id'],
  ['host_name', 'string', 'Host full name. Email: "Host" field and sign-off. Added.', 'Alex Rivera', 'Cal.com webhook: organizer.name'],
  ['host_first_name', 'string', 'Host first name for the sign-off. Added.', 'Alex', 'Our host list, or split from host_name'],
  ['host_email', 'string', 'Host work email. Used to find the HubSpot owner. Added.', 'alex.rivera@databox.com', 'Cal.com webhook: organizer.email'],
  ['host_username', 'string', 'Cal.com username. The key into our host list. Added.', 'alex-rivera', 'Cal.com webhook: organizer.username'],
  ['host_role', 'string', 'Host job title for the email ("Name, Role"). Not available from Cal.com. Added.', 'Head of Sales', 'Our host list, keyed by host_username'],
  ['host_photo_url', 'string', 'Public URL of the host photo for the emails. Cal.com\'s photo is only 96 px, so use our own. Added.', 'https://cdn.example.com/hosts/alex-rivera-288.jpg', 'Our host list, keyed by host_username'],
  ['calendar_google_url', 'string', 'Add to Google Calendar link. Added.', 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Strategy+call&dates=20261029T143000Z/20261029T153000Z', 'Computed from call_at, call_end_at, join_url'],
  ['calendar_outlook_url', 'string', 'Add to Outlook Calendar link. Added.', 'https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=Strategy+call&startdt=2026-10-29T14%3A30%3A00.000Z&enddt=2026-10-29T15%3A30%3A00.000Z', 'Computed'],
  ['calendar_ics_url', 'string', 'Add to Apple Calendar: link to an .ics file. Not available yet, see open points. Added.', 'https://cdn.example.com/ics/k9Zp3QmV7sLw2TnXb8Rc4D.ics', 'Needs a place to host the file'],
  ['reschedule_url', 'string', 'Reschedule page. Lets the email use one value instead of building it. Added.', `https://cal.com/reschedule/${S.bookingId}`, 'Computed from booking_id'],
  ['cancel_url', 'string', 'Cancel page. Added.', `https://cal.com/booking/${S.bookingId}?cancel=true`, 'Computed from booking_id'],
  ['name', 'string', 'Name and surname exactly as typed. The form has a single field (Q4 decided). Added.', 'Ana Novak', 'Booking form, or Cal.com attendee name'],
  ['first_name', 'string', 'First name, split from name on the first space. Used by HubSpot and the emails ("Hi Ana"). Added.', 'Ana', 'Derived from name'],
  ['last_name', 'string or empty', 'Rest of name after the first space. Empty if only one word was typed. Added.', 'Novak', 'Derived from name'],
  ['phone', 'string or null', 'Visitor phone. Optional (Q4 decided). The phone field is hidden on the test event in Cal.com, so check it on the real one. Added.', '+38640123456', 'Booking form'],
];

// name -> value, for JSON
export const bookingProps = (names) => Object.fromEntries(BOOKING_VARS.filter((v) => names.includes(v[0])).map((v) => [v[0], v[3]]));
const ALL_BOOKING = BOOKING_VARS.map((v) => v[0]);

// ---------- events ----------
// by: browser | server | email   role: counting | diagnostic   level: anon | known | booked
export const EVENTS = [
  {
    name: 'meeting_cta_clicked', group: 'Site', step: '0', by: 'browser', role: 'diagnostic', level: 'anon', new: true,
    when: 'Click on any element with a data-cta attribute, on any site, blog or product page.',
    paths: ['P1', 'P2', 'P4', 'P5'],
    notes: ['Writes source_page, cta_id and a new booking_session_id (if none) to the booking link as ?src=&cta=&bsid=, and to the cookie as backup.', 'Fires once per click. Not fired for marketing emails or targeted ads: those start further down the flow.'],
    props: [['cta_id', 'string', 'Value of data-cta.', 'xyz_inline'], ['source_page', 'string', 'Current page path.', '/page-xyz'], ['cta_text', 'string', 'Visible button text.', 'Book a strategy call']],
    specific: { cta_id: 'xyz_inline', source_page: '/page-xyz', cta_text: 'Book a strategy call' },
  },
  {
    call: 'page', name: 'meeting_booking_page_viewed', group: 'Site', step: '1', by: 'browser', role: 'counting', level: 'anon',
    when: 'Booking page loads. Replaces the old page_view.',
    paths: ['P1', 'P2', 'P4', 'P5', 'P6'],
    notes: ['Denominator of the visit-to-booked rate (same booking_session_id as meeting_booking_confirmed).', 'Reads source_page and cta_id from the URL params, then the cookie, then the internal referrer. An ad UTM with no CTA data means flow_entry = ad; an email UTM means email; nothing means direct.', 'Fires on load only, not on a variant switch or re-render.'],
    props: [['variant_booking', 'A or B', 'Variant shown.', 'A'], ['flow_entry', 'enum', 'Entry type.', 'cta']],
    specific: { variant_booking: 'A', flow_entry: 'cta' },
  },
  {
    name: 'meeting_video_played', group: 'Site', step: '1, 3', by: 'browser', role: 'diagnostic', level: 'any', new: true,
    when: 'Play pressed on the video of an A variant (booking page or confirmation page).',
    paths: ['P1', 'P2', 'P4', 'P5', 'P6'],
    notes: ['Variant B has no video, so it never fires there.', 'Fire again at 25, 50, 75 and 100 percent if pct_watched is wanted; otherwise once with 0.'],
    props: [['page', 'enum', 'booking or confirmation.', 'booking'], ['pct_watched', 'number', 'Percent watched when the event fires.', 0]],
    specific: { page: 'booking', pct_watched: 0 },
  },
  {
    name: 'meeting_form_started', group: 'Site', step: '1', by: 'browser', role: 'diagnostic', level: 'anon',
    when: 'First field of the booking form gets focus.',
    paths: ['P1', 'P2', 'P4', 'P5', 'P6'],
    notes: ['Once per booking_session_id.'],
    props: [], specific: {},
  },
  {
    name: 'meeting_form_submitted', group: 'Site', step: '1', by: 'server', byLabel: 'Server', role: 'diagnostic', level: 'known',
    when: 'Form accepted and the contact is created or matched. Sent together with identify().',
    paths: ['P1', 'P2', 'P4', 'P5', 'P6'],
    notes: ['The form has three fields: name and surname (one field), business email, phone (optional). No consent checkbox; the legal line sits under the button.', 'Not fired when the visitor goes straight to the calendar (targeted ads, some emails): no form ran, so identify() goes out with meeting_booking_confirmed instead.', 'Stores the context snapshot under booking_session_id; the visitor is then redirected to the calendar with the prefill (name, email), bsid and ajs_aid.', 'Fires from our server so ad blockers and consent choices cannot drop it.'],
    props: [['email_domain', 'string', 'Domain of the work email.', 'acme.com'], ['contact_id', 'string', 'CRM contact id, also the Segment userId.', S.userId]],
    specific: { email_domain: 'acme.com', contact_id: S.userId },
    identify: true,
  },
  {
    call: 'page', name: 'meeting_calendar_page_viewed', group: 'Site', step: '2', by: 'browser', role: 'diagnostic', level: 'any', new: true,
    when: 'Calendar loads, including direct entry from ads and emails.',
    paths: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    notes: ['On P3 and direct P6 this is the first and only context snapshot, so it must run the same read logic as the booking page.', 'On those direct entries the same three fields (name, business email, phone optional) appear after a slot is picked, above the Confirm button.', 'On P7 (flow emails) there is no new touch; the booking keeps its original attribution.'],
    props: [['flow_start', 'enum', 'booking_page or calendar.', 'booking_page'], ['flow_entry', 'enum', 'Entry type.', 'cta']],
    specific: { flow_start: 'booking_page', flow_entry: 'cta' },
  },
  {
    name: 'meeting_slot_selected', group: 'Site', step: '2', by: 'browser', role: 'diagnostic', level: 'known', new: true,
    when: 'A time slot is picked, before the booking is confirmed.',
    paths: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    notes: ['Can fire several times if the visitor changes slot. On the targeted-ad path the email is only known at confirm, so this event is still anonymous there.'],
    props: [['days_ahead', 'number', 'Days between today and the slot.', 7]],
    specific: { days_ahead: 7 },
  },
  {
    name: 'meeting_booking_confirmed', group: 'Site', step: '2, R, N', by: 'server', role: 'counting', level: 'booked',
    when: 'A booking is created. Fired by our server on the Cal.com BOOKING_CREATED webhook.',
    paths: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    notes: ['The event that counts calls. Never count bookings on the thank-you page: reloads double count and ad blockers drop it.', 'Sent with identify() when no form ran (P3, direct P6).', 'This event, and meeting_booking_rescheduled, carry every variable the emails need (table below). The attribution context comes back in the webhook as the booking metadata.', 'Starts the HubSpot workflow: confirmation email now, reminders from call_at.'],
    props: [], specific: bookingProps(ALL_BOOKING), booking: true,
    identify: true,
  },
  {
    call: 'page', name: 'meeting_confirmation_page_viewed', group: 'Site', step: '3', by: 'browser', role: 'diagnostic', level: 'booked',
    when: 'Confirmation (thank-you) page loads.',
    paths: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    notes: ['Never use it to count bookings.', 'Keeps the anonymous id if the scheduler ran on another domain (ajs_aid).'],
    props: [['variant_confirmation', 'A or B', 'Variant shown.', 'A']],
    specific: { variant_confirmation: 'A' },
  },
  {
    name: 'meeting_add_to_calendar_clicked', group: 'Site', step: '3', by: 'browser', role: 'diagnostic', level: 'booked', new: true,
    when: 'Click on an Add to calendar button on the confirmation page.',
    paths: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
    notes: ['Each click fires once.'],
    props: [['calendar', 'enum', 'google, apple or outlook.', 'google']],
    specific: { calendar: 'google' },
  },
  {
    later: true, name: 'meeting_email_sent', group: 'Email', step: 'R, 4 to 8, N', by: 'email', role: 'diagnostic', level: 'booked',
    when: 'The email platform accepts a send of any flow email.',
    paths: ['P6', 'P7'],
    notes: ['Email opens are not tracked: Apple Mail Privacy Protection inflates them.', 'Built so far: confirmation, reminder_24h, reminder_1h. Spec also lists recovery, no_show and post_call (not designed yet).'],
    props: [['email_id', 'enum', 'confirmation, reminder_24h, reminder_1h, recovery, no_show, post_call.', 'confirmation']],
    specific: { email_id: 'confirmation' },
  },
  {
    later: true, name: 'meeting_email_clicked', group: 'Email', step: 'R, 4 to 8, N', by: 'email', role: 'diagnostic', level: 'booked',
    when: 'Tracked link click in a flow email.',
    paths: ['P6', 'P7'],
    notes: ['Flow-email links carry the booking id and never write a new touch; the booking keeps its attribution. Marketing-email links are a different case: they are a new last touch (open question Q10).', 'link_id values: join, reschedule, cancel, rebook, report, add_google, add_outlook, add_apple.'],
    props: [['email_id', 'enum', 'Which email.', 'reminder_24h'], ['link_id', 'enum', 'Which link.', 'join']],
    specific: { email_id: 'reminder_24h', link_id: 'join' },
  },
  {
    later: true, name: 'meeting_booking_rescheduled', group: 'Booking lifecycle and call', step: 'X', by: 'server', role: 'diagnostic', level: 'booked', new: true,
    when: 'The time of an existing booking is changed. Cal.com BOOKING_RESCHEDULED webhook.',
    paths: ['P7'],
    notes: ['Not counted as a new booking. Keeps the original attribution and variant.', 'Cal.com issues a new booking id on a reschedule: send it as booking_id and keep the old one as previous_booking_id so the join to the original stays.', 'Carries all the email variables again with the new time, so reminders can be rescheduled and a "your call moved" email can use them.'],
    props: [['previous_booking_id', 'string', 'Booking id before the reschedule. Added.', 'wUqtfgWLCft74eKnRrEYYs'], ['old_call_at', 'ISO datetime', 'Previous start (UTC).', '2026-10-28T10:00:00Z'], ['new_call_at', 'ISO datetime', 'New start (UTC).', S.callAt]],
    specific: { previous_booking_id: 'wUqtfgWLCft74eKnRrEYYs', old_call_at: '2026-10-28T10:00:00Z', new_call_at: S.callAt, ...bookingProps(ALL_BOOKING) },
  },
  {
    later: true, name: 'meeting_booking_canceled', group: 'Booking lifecycle and call', step: 'X', by: 'server', role: 'counting', level: 'booked', new: true,
    when: 'A booking is cancelled by the visitor or the host. Cal.com BOOKING_CANCELLED webhook.',
    paths: ['P7'],
    notes: ['Subtracted from show rate: meeting_call_held / (meeting_booking_confirmed minus meeting_booking_canceled).', 'Stops the HubSpot reminders for this booking id.'],
    props: [['canceled_by', 'enum', 'visitor or host.', 'visitor'], ['reason', 'string or null', 'Cancellation reason, if given.', 'Need a different time']],
    specific: { canceled_by: 'visitor', reason: 'Need a different time', call_at: S.callAt, host_id: 1001, host_name: 'Alex Rivera', host_username: 'alex-rivera' },
  },
  {
    later: true, name: 'meeting_call_held', group: 'Booking lifecycle and call', step: '7', by: 'server', role: 'counting', level: 'booked',
    when: 'The visitor joined the call.',
    paths: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    notes: ['Source system is open (Q5): the scheduler, the call recorder or the host in the CRM. Cal.com\'s HubSpot app does not mark no-shows.', 'Primary metric for the confirmation page test: show rate.'],
    props: [['duration_min', 'number', 'Minutes the visitor was in the call.', 52]],
    specific: { duration_min: 52, call_at: S.callAt, host_id: 1001, host_name: 'Alex Rivera', host_username: 'alex-rivera' },
  },
  {
    later: true, name: 'meeting_call_no_show', group: 'Booking lifecycle and call', step: '7', by: 'server', role: 'diagnostic', level: 'booked', new: true,
    when: 'The visitor has not joined 15 minutes after the start.',
    paths: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    notes: ['Source system is open (Q5). Triggers the no-show email, which carries one rebook link to the calendar.'],
    props: [], specific: { call_at: S.callAt, host_id: 1001, host_name: 'Alex Rivera', host_username: 'alex-rivera' },
  },
];

// ---------- Segment calls ----------
export const PAGE_NOTE = 'The three page-view events are Segment page() calls (type page, category meeting, name = the event name). Send one page call per page load with that name, and do not also send a second generic page() on those pages.';

export const IDENTIFY_CALLS = [
  {
    when: 'At meeting_form_submitted (server).',
    json: {
      type: 'identify', userId: S.userId, anonymousId: S.anonymousId, timestamp: '2026-10-22T09:14:40.108Z',
      traits: { email: S.email, name: 'Ana Novak', first_name: 'Ana', last_name: 'Novak', phone: '+38640123456', email_domain: 'acme.com' },
    },
  },
  {
    when: 'At meeting_booking_confirmed, when no form ran (targeted ads, direct emails). Same shape, name and email from the calendar step.',
    json: {
      type: 'identify', userId: S.userId, anonymousId: S.anonymousId, timestamp: '2026-10-22T09:17:11.530Z',
      traits: { email: S.email, name: 'Ana Novak', first_name: 'Ana', last_name: 'Novak', phone: null, email_domain: 'acme.com' },
    },
  },
];

// ---------- entry paths from the spec ----------
export const PATHS = [
  ['P1', 'Ad, then ad landing, then a page with a CTA, then booking page, calendar, thank you', 'flow_entry = cta, source_page = the page with the CTA. last_touch = that page, first_touch = the first marketing touch (the ad)'],
  ['P2', 'Ad, then ad landing, then booking page, calendar, thank you', 'flow_entry = cta, source_page = /ad-landing. last_touch = the ad landing page'],
  ['P3', 'Targeted ad straight to the calendar, thank you', 'flow_entry = ad, flow_start = calendar, source_page = null. No CTA click: last_touch = the calendar page the ad opened. No form: identify() goes with meeting_booking_confirmed'],
  ['P4', 'Search, social or direct, any page, header CTA, booking page, calendar, thank you', 'flow_entry = cta, cta_id = header, source_page = the current page. last_touch = that page'],
  ['P5', 'Search, social or partner, landing page, booking page, calendar, thank you', 'flow_entry = cta, source_page = /landing-page. last_touch = that landing page'],
  ['P6', 'Marketing email, booking page (or straight to the calendar), thank you', 'flow_entry = email. No CTA click: last_touch = the booking page or calendar the email link opened, with the email\'s UTMs'],
  ['P7', 'Flow email (reschedule, rebook), calendar, thank you', 'No new touch. The booking keeps its original first_touch and last_touch'],
];

export const OPEN_POINTS = [
  'last_touch is read from the page where the CTA was clicked. If that page\'s URL has no UTMs, should last_touch_* be empty, or fall back to the UTMs kept for the visit?',
  'UTMs are dynamic: capture every utm_* parameter on the URL. Cal.com metadata allows 50 keys; 29 are used today and each extra utm_* adds two.',
  'email is added to every event once known, which sends personal data to every Segment destination. The alternative is to rely on identify() and userId.',
  'Add to Apple Calendar needs a link to an .ics file, which HubSpot emails cannot attach and which needs somewhere to be hosted.',
];// ---------- JSON builder ----------
export const callOf = (e) => e.call || 'track';
export function jsonFor(e) {
  const ctx = context(e.level === 'any' ? 'anon' : e.level);
  const ordered = {};
  for (const k of Object.keys(e.specific)) ordered[k] = e.specific[k];
  for (const k of Object.keys(ctx)) if (!(k in ordered)) ordered[k] = ctx[k];
  const identified = e.level === 'known' || e.level === 'booked';
  const base = { anonymousId: S.anonymousId, userId: identified ? S.userId : null, timestamp: '2026-10-22T09:15:02.771Z' };
  if (callOf(e) === 'page') {
    return { type: 'page', category: 'meeting', name: e.name, ...base, properties: ordered, context: { page: { path: '/strategy-call' } } };
  }
  const envelope = { type: 'track', event: e.name, ...base, properties: ordered };
  if (e.by === 'browser') envelope.context = { page: { path: '/strategy-call' } };
  if (e.by === 'email') envelope.context = { source: 'email platform' };
  return envelope;
}

export const UTM_RULE = {
  headline: 'Every event includes all UTMs, as separate properties.',
  body: 'Read every utm_* parameter that is there, not a fixed list, and send each one as its own property. Never nest them, never hardcode values.',
  firstTouch: 'first_touch_* is the first marketing touch ever.',
  lastTouch: 'last_touch_* is read from the page where the visitor started the flow, the page where they clicked the CTA.',
  firstLast: ['source', 'medium', 'campaign', 'content', 'term', 'click_id', 'click_id_type', 'landing_page', 'referrer_domain', 'at'],
  more: 'Any other utm_* parameter is sent the same way (for example utm_id). Confirm the property naming for these with Engineering.',
  clickIds: ['gclid', 'gbraid', 'wbraid', 'li_fat_id', 'fbclid', 'msclkid'],
};

// ---------- check against the spec file ----------
export const COVERAGE = {
  spec: 'Strategy Call Booking Flow (2), checked 22 Oct 2026',
  checks: [
    ['Event dictionary', '16 of 16 spec events are defined, with the same step, fired-by and counting or diagnostic role, and every property the spec lists for them. 10 are in this build; 6 (booking lifecycle and call, email) are defined but implemented separately.'],
    ['Last touch (changed on purpose)', 'The spec defines last_touch_* as the last marketing touch. This plan defines it as the page where the visitor started the flow (the CTA page), as requested.'],
    ['Context properties', 'anonymous_id, first_touch_*, last_touch_*, booking_session_id, source_page, cta_id, flow_entry, flow_start, variant_booking, variant_confirmation and booking_id are all on every event.'],
    ['Segment calls', 'page() for the three page-view events, track() for the rest, and identify() at form submit and at booking, as the spec says.'],
    ['Entry paths', 'P1 to P7 are all covered, with the events each one fires.'],
    ['Q4 (decided in this version)', 'Form is three fields: name and surname (one field), business email, phone (optional); no consent checkbox. Plan now sends name, with first_name and last_name derived from it.'],
    ['New page copy', 'The confirmation page needs the host name, role and first name, the date line, 60 minutes and the join link. All are in the booking variables. Role and first name come from our host list, not Cal.com.'],
    ['Added beyond the spec', 'email and booking_id on every event once known; the booking and email variables (join_url, host_*, call_*_text, calendar links, reschedule_url, cancel_url and others); call_end_at, duration_min, previous_booking_id; first and last touch for any extra utm_* parameter.'],
  ],
};

// ---------- naming ----------
export const NAMING = {
  rule: 'meeting_<thing>_<what happened>, snake_case, past tense. Page loads end in _page_viewed, clicks in _clicked. The meeting_ prefix makes every event of this flow filterable in one go.',
  exception: 'meeting_call_no_show keeps no_show, the term used across the spec, emails and Q5.',
  renames: [["cta_clicked", "meeting_cta_clicked"], ["booking_page_viewed", "meeting_booking_page_viewed"], ["video_played", "meeting_video_played"], ["form_started", "meeting_form_started"], ["form_submitted", "meeting_form_submitted"], ["calendar_viewed", "meeting_calendar_page_viewed"], ["slot_selected", "meeting_slot_selected"], ["booking_confirmed", "meeting_booking_confirmed"], ["confirmation_viewed", "meeting_confirmation_page_viewed"], ["calendar_added", "meeting_add_to_calendar_clicked"], ["email_sent", "meeting_email_sent"], ["email_clicked", "meeting_email_clicked"], ["booking_rescheduled", "meeting_booking_rescheduled"], ["booking_canceled", "meeting_booking_canceled"], ["call_held", "meeting_call_held"], ["call_no_show", "meeting_call_no_show"]],
};

export const SEGMENT_NOTE = 'Every event of this build goes to Segment, each fired from its own source: browser events through Analytics.js, server events (form, booking, reschedule, cancel, call) from our server or n8n into Segment, and email events from the email platform\'s Segment connection. Same workspace, same naming, one place to filter on meeting_.';

export const LATER = {
  title: 'Implemented separately',
  intro: 'The booking lifecycle and call events (reschedule, cancel, call held, no-show) and the email events (sent, clicked) are not part of this build. They are implemented separately, and only if tracking in Mixpanel is needed. Their definitions stay here so the names and data are agreed up front.',
  effects: [
    'Show rate (call held divided by confirmed minus canceled) cannot be reported from events until meeting_call_held and meeting_booking_canceled exist.',
    'The HubSpot reminders must stop on a cancel and move on a reschedule. Without these events, use Cal.com\'s webhook through n8n, or the meeting outcome that Cal.com\'s HubSpot app sets (RESCHEDULED, CANCELED).',
    'Email sends and clicks are already visible inside HubSpot itself.',
  ],
};
