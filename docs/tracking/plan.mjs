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

const touch = (p, v) => ({
  [`${p}_source`]: v.source, [`${p}_medium`]: v.medium, [`${p}_campaign`]: v.campaign, [`${p}_content`]: v.content,
  [`${p}_term`]: v.term, [`${p}_click_id`]: v.click_id, [`${p}_click_id_type`]: v.click_id_type,
  [`${p}_landing_page`]: v.landing_page, [`${p}_referrer_domain`]: v.referrer_domain, [`${p}_at`]: v.at,
});
const ad = {
  source: 'linkedin', medium: 'paid_social', campaign: 'q4_strategy_call', content: 'carousel_1', term: null,
  click_id: 'd1f4c0a2-7e55-4b0a-9c21-3a8f6e1b9d70', click_id_type: 'li_fat_id', landing_page: '/ad-landing',
  referrer_domain: 'linkedin.com', at: S.firstTouchAt,
};

// ---------- properties every event carries ("the full context") ----------
export const CONTEXT_PROPS = [
  ['anonymous_id', 'string', 'Segment anonymous id. Joins every event before the person is known. Passed as ajs_aid across domains.', 'Segment cookie'],
  ['booking_session_id', 'string', 'Created at the CTA click, or at the first flow page if there was no click. The one id the scheduler must return.', 'URL param, cookie, hidden field, Cal.com metadata'],
  ['flow_entry', 'enum', 'What delivered the visitor to the flow: cta, ad, email, direct.', 'Read at the booking page or calendar'],
  ['flow_start', 'enum', 'Which page they entered the flow on: booking_page or calendar.', 'Read at the booking page or calendar'],
  ['source_page', 'string or null', 'Path of the page where the CTA was clicked. Null on targeted ads, marketing emails and direct visits. Never the booking page itself.', 'Written at the CTA click'],
  ['cta_id', 'string or null', 'The data-cta id of the clicked CTA. For marketing emails: email id plus link id.', 'Written at the CTA click'],
  ['first_touch_source', 'string or null', 'utm_source of the first marketing touch. Set once, kept 90 days.', 'Touch script, cookie on .databox.com'],
  ['first_touch_medium', 'string or null', 'utm_medium of the first marketing touch.', 'Touch script'],
  ['first_touch_campaign', 'string or null', 'utm_campaign of the first marketing touch.', 'Touch script'],
  ['first_touch_content', 'string or null', 'utm_content of the first marketing touch.', 'Touch script'],
  ['first_touch_term', 'string or null', 'utm_term of the first marketing touch.', 'Touch script'],
  ['first_touch_click_id', 'string or null', 'Ad click id of the first touch. Ad platforms match offline conversions on it.', 'Touch script'],
  ['first_touch_click_id_type', 'enum or null', 'gclid, gbraid, wbraid, li_fat_id, fbclid or msclkid.', 'Touch script'],
  ['first_touch_landing_page', 'string or null', 'Path of the first page they landed on. One field of the touch, not the touch itself.', 'Touch script'],
  ['first_touch_referrer_domain', 'string or null', 'Domain of the external referrer at the first touch.', 'Touch script'],
  ['first_touch_at', 'ISO datetime', 'When the first touch happened (UTC).', 'Touch script'],
  ['last_touch_source', 'string or null', 'Same shape as first_touch_*. Overwritten by a new UTM, click id or external referrer, never by a direct visit.', 'Touch script, cookie'],
  ['last_touch_medium', 'string or null', 'See last_touch_source.', 'Touch script'],
  ['last_touch_campaign', 'string or null', 'See last_touch_source.', 'Touch script'],
  ['last_touch_content', 'string or null', 'See last_touch_source.', 'Touch script'],
  ['last_touch_term', 'string or null', 'See last_touch_source.', 'Touch script'],
  ['last_touch_click_id', 'string or null', 'See last_touch_source.', 'Touch script'],
  ['last_touch_click_id_type', 'enum or null', 'See last_touch_source.', 'Touch script'],
  ['last_touch_landing_page', 'string or null', 'See last_touch_source.', 'Touch script'],
  ['last_touch_referrer_domain', 'string or null', 'See last_touch_source.', 'Touch script'],
  ['last_touch_at', 'ISO datetime', 'See last_touch_source.', 'Touch script'],
  ['variant_booking', 'enum A or B', 'Booking page A/B variant. Sticky per visitor, stored on the booking.', 'Assigned on first view, cookie'],
  ['variant_confirmation', 'enum A or B', 'Confirmation page A/B variant. Sticky per visitor.', 'Assigned on first view, cookie'],
  ['email', 'string', 'The visitor\'s email, on every event from the moment it is known (form submit, or the calendar details). Anonymous before that. Added.', 'Form or calendar details'],
  ['booking_id', 'string', 'The Cal.com booking id, on every event once the booking exists. Added.', 'Cal.com booking response or webhook'],
];

// level: how much of the context exists when the event fires
//   anon = no email yet, known = email known, booked = email and booking id known
export function context(level) {
  const c = {
    anonymous_id: S.anonymousId, booking_session_id: S.bookingSessionId,
    flow_entry: 'cta', flow_start: 'booking_page', source_page: '/page-xyz', cta_id: 'xyz_inline',
    ...touch('first_touch', ad), ...touch('last_touch', ad),
    variant_booking: 'A', variant_confirmation: 'A',
  };
  if (level === 'known' || level === 'booked') c.email = S.email;
  if (level === 'booked') c.booking_id = S.bookingId;
  return c;
}

// ---------- booking and email variables (carried by booking_confirmed and booking_rescheduled) ----------
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
  ['first_name', 'string', 'Visitor first name (HubSpot contact is created or matched by email). Added.', 'Ana', 'Booking form, or Cal.com attendee name'],
  ['last_name', 'string', 'Visitor last name. Added.', 'Novak', 'Booking form, or Cal.com attendee name'],
  ['phone', 'string or null', 'Visitor phone. Optional, and the field is hidden on the test event in Cal.com. Added.', '+38640123456', 'Booking form'],
  ['rebook_reason', 'enum or null', 'recovery or no_show when the booking came from a rebook email. Null on a first booking.', null, 'Rebook link in the email'],
];

// name -> value, for JSON
export const bookingProps = (names) => Object.fromEntries(BOOKING_VARS.filter((v) => names.includes(v[0])).map((v) => [v[0], v[3]]));
const ALL_BOOKING = BOOKING_VARS.map((v) => v[0]);

// ---------- events ----------
// by: browser | server | email   role: counting | diagnostic   level: anon | known | booked
export const EVENTS = [
  {
    name: 'cta_clicked', group: 'Site', step: '0', by: 'browser', role: 'diagnostic', level: 'anon', new: true,
    when: 'Click on any element with a data-cta attribute, on any site, blog or product page.',
    paths: ['P1', 'P2', 'P4', 'P5'],
    notes: ['Writes source_page, cta_id and a new booking_session_id (if none) to the booking link as ?src=&cta=&bsid=, and to the cookie as backup.', 'Fires once per click. Not fired for marketing emails or targeted ads: those start further down the flow.'],
    props: [['cta_id', 'string', 'Value of data-cta.', 'xyz_inline'], ['source_page', 'string', 'Current page path.', '/page-xyz'], ['cta_text', 'string', 'Visible button text.', 'Book a strategy call']],
    specific: { cta_id: 'xyz_inline', source_page: '/page-xyz', cta_text: 'Book a strategy call' },
  },
  {
    name: 'booking_page_viewed', group: 'Site', step: '1', by: 'browser', role: 'counting', level: 'anon',
    when: 'Booking page loads. Replaces the old page_view.',
    paths: ['P1', 'P2', 'P4', 'P5', 'P6'],
    notes: ['Denominator of the visit-to-booked rate (same booking_session_id as booking_confirmed).', 'Reads source_page and cta_id from the URL params, then the cookie, then the internal referrer. An ad UTM with no CTA data means flow_entry = ad; an email UTM means email; nothing means direct.', 'Fires on load only, not on a variant switch or re-render.'],
    props: [['variant_booking', 'A or B', 'Variant shown.', 'A'], ['flow_entry', 'enum', 'Entry type.', 'cta']],
    specific: { variant_booking: 'A', flow_entry: 'cta' },
  },
  {
    name: 'video_played', group: 'Site', step: '1, 3', by: 'browser', role: 'diagnostic', level: 'any', new: true,
    when: 'Play pressed on the video of an A variant (booking page or confirmation page).',
    paths: ['P1', 'P2', 'P4', 'P5', 'P6'],
    notes: ['Variant B has no video, so it never fires there.', 'Fire again at 25, 50, 75 and 100 percent if pct_watched is wanted; otherwise once with 0.'],
    props: [['page', 'enum', 'booking or confirmation.', 'booking'], ['pct_watched', 'number', 'Percent watched when the event fires.', 0]],
    specific: { page: 'booking', pct_watched: 0 },
  },
  {
    name: 'form_started', group: 'Site', step: '1', by: 'browser', role: 'diagnostic', level: 'anon',
    when: 'First field of the booking form gets focus.',
    paths: ['P1', 'P2', 'P4', 'P5', 'P6'],
    notes: ['Once per booking_session_id.'],
    props: [], specific: {},
  },
  {
    name: 'form_submitted', group: 'Site', step: '1', by: 'server', role: 'diagnostic', level: 'known',
    when: 'Form accepted and the contact is created or matched. Sent together with identify().',
    paths: ['P1', 'P2', 'P4', 'P5', 'P6'],
    notes: ['Not fired when the visitor goes straight to the calendar (targeted ads, some emails): no form ran, so identify() goes out with booking_confirmed instead.', 'Stores the context snapshot under booking_session_id; the visitor is then redirected to the calendar with the prefill (name, email), bsid and ajs_aid.', 'Fires from our server so ad blockers and consent choices cannot drop it.'],
    props: [['email_domain', 'string', 'Domain of the work email.', 'acme.com'], ['contact_id', 'string', 'CRM contact id, also the Segment userId.', S.userId]],
    specific: { email_domain: 'acme.com', contact_id: S.userId },
    identify: true,
  },
  {
    name: 'calendar_viewed', group: 'Site', step: '2', by: 'browser', role: 'diagnostic', level: 'any', new: true,
    when: 'Calendar loads, including direct entry from ads and emails.',
    paths: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    notes: ['On P3 and direct P6 this is the first and only context snapshot, so it must run the same read logic as the booking page.', 'On P7 (flow emails) there is no new touch; the booking keeps its original attribution.'],
    props: [['flow_start', 'enum', 'booking_page or calendar.', 'booking_page'], ['flow_entry', 'enum', 'Entry type.', 'cta']],
    specific: { flow_start: 'booking_page', flow_entry: 'cta' },
  },
  {
    name: 'slot_selected', group: 'Site', step: '2', by: 'browser', role: 'diagnostic', level: 'known', new: true,
    when: 'A time slot is picked, before the booking is confirmed.',
    paths: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    notes: ['Can fire several times if the visitor changes slot. On the targeted-ad path the email is only known at confirm, so this event is still anonymous there.'],
    props: [['days_ahead', 'number', 'Days between today and the slot.', 7]],
    specific: { days_ahead: 7 },
  },
  {
    name: 'booking_confirmed', group: 'Site', step: '2, R, N', by: 'server', role: 'counting', level: 'booked',
    when: 'A booking is created. Fired by our server on the Cal.com BOOKING_CREATED webhook.',
    paths: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    notes: ['The event that counts calls. Never count bookings on the thank-you page: reloads double count and ad blockers drop it.', 'Sent with identify() when no form ran (P3, direct P6).', 'Rebooks from the recovery or no-show email use this same event with rebook_reason, so one event counts bookings.', 'This event, and booking_rescheduled, carry every variable the emails need (table below). The attribution context comes back in the webhook as the booking metadata.', 'Starts the HubSpot workflow: confirmation email now, reminders from call_at.'],
    props: [], specific: bookingProps(ALL_BOOKING), booking: true,
    identify: true,
  },
  {
    name: 'confirmation_viewed', group: 'Site', step: '3', by: 'browser', role: 'diagnostic', level: 'booked',
    when: 'Confirmation (thank-you) page loads.',
    paths: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    notes: ['Never use it to count bookings.', 'Keeps the anonymous id if the scheduler ran on another domain (ajs_aid).'],
    props: [['variant_confirmation', 'A or B', 'Variant shown.', 'A']],
    specific: { variant_confirmation: 'A' },
  },
  {
    name: 'calendar_added', group: 'Site', step: '3', by: 'browser', role: 'diagnostic', level: 'booked', new: true,
    when: 'Click on an Add to calendar button on the confirmation page.',
    paths: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
    notes: ['Each click fires once.'],
    props: [['calendar', 'enum', 'google, apple or outlook.', 'google']],
    specific: { calendar: 'google' },
  },
  {
    name: 'email_sent', group: 'Email', step: 'R, 4 to 8, N', by: 'email', role: 'diagnostic', level: 'booked',
    when: 'The email platform accepts a send of any flow email.',
    paths: ['P6', 'P7'],
    notes: ['Email opens are not tracked: Apple Mail Privacy Protection inflates them.', 'Built so far: confirmation, reminder_24h, reminder_1h. Spec also lists recovery, no_show and post_call (not designed yet).'],
    props: [['email_id', 'enum', 'confirmation, reminder_24h, reminder_1h, recovery, no_show, post_call.', 'confirmation']],
    specific: { email_id: 'confirmation' },
  },
  {
    name: 'email_clicked', group: 'Email', step: 'R, 4 to 8, N', by: 'email', role: 'diagnostic', level: 'booked',
    when: 'Tracked link click in a flow email.',
    paths: ['P6', 'P7'],
    notes: ['Flow-email links carry the booking id and never write a new touch; the booking keeps its attribution. Marketing-email links are a different case: they are a new last touch (open question Q10).', 'link_id values: join, reschedule, cancel, rebook, report, add_google, add_outlook, add_apple.'],
    props: [['email_id', 'enum', 'Which email.', 'reminder_24h'], ['link_id', 'enum', 'Which link.', 'join']],
    specific: { email_id: 'reminder_24h', link_id: 'join' },
  },
  {
    name: 'booking_rescheduled', group: 'Booking lifecycle and call', step: 'X', by: 'server', role: 'diagnostic', level: 'booked', new: true,
    when: 'The time of an existing booking is changed. Cal.com BOOKING_RESCHEDULED webhook.',
    paths: ['P7'],
    notes: ['Not counted as a new booking. Keeps the original attribution and variant.', 'Cal.com issues a new booking id on a reschedule: send it as booking_id and keep the old one as previous_booking_id so the join to the original stays.', 'Carries all the email variables again with the new time, so reminders can be rescheduled and a "your call moved" email can use them.'],
    props: [['previous_booking_id', 'string', 'Booking id before the reschedule. Added.', 'wUqtfgWLCft74eKnRrEYYs'], ['old_call_at', 'ISO datetime', 'Previous start (UTC).', '2026-10-28T10:00:00Z'], ['new_call_at', 'ISO datetime', 'New start (UTC).', S.callAt]],
    specific: { previous_booking_id: 'wUqtfgWLCft74eKnRrEYYs', old_call_at: '2026-10-28T10:00:00Z', new_call_at: S.callAt, ...bookingProps(ALL_BOOKING) },
  },
  {
    name: 'booking_canceled', group: 'Booking lifecycle and call', step: 'X', by: 'server', role: 'counting', level: 'booked', new: true,
    when: 'A booking is cancelled by the visitor or the host. Cal.com BOOKING_CANCELLED webhook.',
    paths: ['P7'],
    notes: ['Subtracted from show rate: call_held / (booking_confirmed minus booking_canceled).', 'Stops the HubSpot reminders for this booking id.'],
    props: [['canceled_by', 'enum', 'visitor or host.', 'visitor'], ['reason', 'string or null', 'Cancellation reason, if given.', 'Need a different time']],
    specific: { canceled_by: 'visitor', reason: 'Need a different time', call_at: S.callAt, host_id: 1001, host_name: 'Alex Rivera', host_username: 'alex-rivera' },
  },
  {
    name: 'call_held', group: 'Booking lifecycle and call', step: '7', by: 'server', role: 'counting', level: 'booked',
    when: 'The visitor joined the call.',
    paths: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    notes: ['Source system is open (Q5): the scheduler, the call recorder or the host in the CRM. Cal.com\'s HubSpot app does not mark no-shows.', 'Primary metric for the confirmation page test: show rate.'],
    props: [['duration_min', 'number', 'Minutes the visitor was in the call.', 52]],
    specific: { duration_min: 52, call_at: S.callAt, host_id: 1001, host_name: 'Alex Rivera', host_username: 'alex-rivera' },
  },
  {
    name: 'call_no_show', group: 'Booking lifecycle and call', step: '7', by: 'server', role: 'diagnostic', level: 'booked', new: true,
    when: 'The visitor has not joined 15 minutes after the start.',
    paths: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    notes: ['Source system is open (Q5). Triggers the no-show email, which carries one rebook link to the calendar (rebook_reason = no_show).'],
    props: [], specific: { call_at: S.callAt, host_id: 1001, host_name: 'Alex Rivera', host_username: 'alex-rivera' },
  },
];

// ---------- the two Segment calls that are not track events ----------
export const PAGE_CALL = {
  name: 'page()', by: 'browser',
  when: 'Every page load, site-wide. This is Segment\'s standard call and fires automatically from the Segment snippet.',
  notes: ['It is the only call where Segment attaches UTMs, as context.campaign.', 'Inside the booking flow every step already has its own event, so page() adds nothing to the step counts. Keeping it is a site-wide decision for Engineering; the flow does not depend on it.'],
  json: {
    type: 'page', name: 'Booking page', anonymousId: S.anonymousId, userId: null, timestamp: '2026-10-22T09:12:03.412Z',
    properties: { path: '/strategy-call', url: 'https://www.databox.com/strategy-call?utm_source=linkedin&utm_medium=paid_social&utm_campaign=q4_strategy_call&utm_content=carousel_1', referrer: 'https://www.linkedin.com/', title: 'Book your strategy call' },
    context: { campaign: { name: 'q4_strategy_call', source: 'linkedin', medium: 'paid_social', content: 'carousel_1', term: null }, page: { path: '/strategy-call' } },
  },
};

export const IDENTIFY_CALLS = [
  {
    when: 'At form_submitted (server).',
    json: {
      type: 'identify', userId: S.userId, anonymousId: S.anonymousId, timestamp: '2026-10-22T09:14:40.108Z',
      traits: { email: S.email, first_name: 'Ana', last_name: 'Novak', phone: '+38640123456', email_domain: 'acme.com' },
    },
  },
  {
    when: 'At booking_confirmed, when no form ran (targeted ads, direct emails). Same shape, name and email from the calendar step.',
    json: {
      type: 'identify', userId: S.userId, anonymousId: S.anonymousId, timestamp: '2026-10-22T09:17:11.530Z',
      traits: { email: S.email, first_name: 'Ana', last_name: 'Novak', email_domain: 'acme.com' },
    },
  },
];

// ---------- entry paths from the spec ----------
export const PATHS = [
  ['P1', 'Ad, then ad landing, then a page with a CTA, then booking page, calendar, thank you', 'flow_entry = cta, source_page = the page with the CTA, first and last touch = the ad'],
  ['P2', 'Ad, then ad landing, then booking page, calendar, thank you', 'flow_entry = cta, source_page = /ad-landing, first and last touch = the ad'],
  ['P3', 'Targeted ad straight to the calendar, thank you', 'flow_entry = ad, flow_start = calendar, source_page = null. No form: identify() goes with booking_confirmed'],
  ['P4', 'Search, social or direct, any page, header CTA, booking page, calendar, thank you', 'flow_entry = cta, cta_id = header, source_page = the current page'],
  ['P5', 'Search, social or partner, landing page, booking page, calendar, thank you', 'flow_entry = cta, source_page = /landing-page'],
  ['P6', 'Marketing email, booking page (or straight to the calendar), thank you', 'flow_entry = email, last_touch = the email campaign. A new last touch'],
  ['P7', 'Flow email (reschedule, rebook), calendar, thank you', 'No new touch. booking_rescheduled, or booking_confirmed with rebook_reason; inherits the original booking'],
];

export const OPEN_POINTS = [
  'Event naming: the spec uses snake_case (booking_confirmed). Segment\'s own convention is Object Action in title case. Match the existing Databox Segment workspace before building (Q11).',
  'Raw email on every event: the spec sends email_domain on events and the email on identify() only. This plan adds the email to every event once known, because you need to see who to assign it to. It sends personal data to every Segment destination, including ad platforms. The alternative is to rely on identify() and userId.',
  'Who marks call_held and call_no_show (Q5). Cal.com\'s HubSpot app does not set no-show.',
  'Host list: host_role, host_first_name and host_photo_url are not in Cal.com. They come from a small list on our side, keyed by host_username.',
  'Add to Apple Calendar needs a link to an .ics file, and HubSpot marketing emails cannot attach files. Decide who hosts the file, or keep Cal.com\'s own confirmation email, which carries the .ics.',
  'Call length: the emails say 60 minutes, the Cal.com test event is 30. Set the real event to 60 so duration_min and call_end_at are right.',
  'Cancel and reschedule must be switched on in the Cal.com event type, or the reschedule_url and cancel_url in the emails will not work.',
  'Cal.com webhook payload: the field names in the "Where it comes from" column are the expected ones. Verify them against a real BOOKING_CREATED payload before building.',
  'Consent: whether the touch cookie counts as functional or analytics under the consent banner is still open (Q3).',
];

// ---------- JSON builder ----------
export function jsonFor(e) {
  const ctx = context(e.level === 'any' ? 'anon' : e.level);
  const props = e.booking ? { ...e.specific, ...ctx } : { ...e.specific, ...ctx };
  // booking_confirmed carries booking_id and email already inside specific/ctx; keep order stable
  const ordered = {};
  for (const k of Object.keys(e.specific)) ordered[k] = e.specific[k];
  for (const k of Object.keys(ctx)) if (!(k in ordered)) ordered[k] = ctx[k];
  void props;
  const identified = e.level === 'known' || e.level === 'booked';
  const envelope = {
    type: 'track', event: e.name,
    anonymousId: S.anonymousId, userId: identified ? S.userId : null,
    timestamp: '2026-10-22T09:15:02.771Z',
    properties: ordered,
    context: { page: { path: e.by === 'server' ? undefined : '/strategy-call' } },
  };
  if (e.by === 'server') delete envelope.context;
  if (e.by === 'email') envelope.context = { source: 'email platform' };
  return envelope;
}
