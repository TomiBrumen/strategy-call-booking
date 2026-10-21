// Event dictionary from the spec (Events & metrics tab). by: b = browser, s = server or webhook, m = email platform.
export const EVENTS = {
  page: { by: 'b', note: 'Segment page call, on every load' },
  cta_clicked: { by: 'b', note: 'Click on an element with data-cta' },
  booking_page_viewed: { by: 'b', note: 'Booking page load' },
  video_played: { by: 'b', note: 'Play on an A variant video' },
  form_started: { by: 'b', note: 'First field focused' },
  form_submitted: { by: 's', note: 'Form accepted. Sent with identify()' },
  calendar_viewed: { by: 'b', note: 'Calendar load' },
  slot_selected: { by: 'b', note: 'Time slot picked, before confirm' },
  booking_confirmed: { by: 's', note: 'Booking created, from the scheduler webhook. Sent with identify() when no form ran' },
  confirmation_viewed: { by: 'b', note: 'Confirmation page load' },
  calendar_added: { by: 'b', note: 'Add-to-calendar click' },
  booking_rescheduled: { by: 's', note: 'Time changed on an existing booking' },
  booking_canceled: { by: 's', note: 'Booking canceled' },
};

// What each screen can fire, in order. Shown as chips that light up when fired.
export const STEP_EVENTS = {
  cta: ['page', 'cta_clicked'],
  booking: ['page', 'booking_page_viewed', 'video_played', 'form_started', 'form_submitted'],
  calendar: ['page', 'calendar_viewed', 'slot_selected', 'booking_confirmed'],
  confirm: ['page', 'confirmation_viewed', 'calendar_added'],
};

export const STEPS = [
  { id: 'cta', n: '0', label: 'CTA on a page' },
  { id: 'booking', n: '1', label: 'Booking page + form' },
  { id: 'calendar', n: '2', label: 'Calendar' },
  { id: 'confirm', n: '3', label: 'Confirmation page' },
];

// Emails and call that follow a booking (steps 4 to 8). Not rendered, shown as a timeline.
export function followUps(startIso, createdAt = Date.now()) {
  const call = new Date(startIso).getTime();
  const leadH = (call - createdAt) / 36e5;
  const at = (ms) => new Date(ms);
  return [
    { n: '4', kind: 'mail', label: 'Confirmation email', when: at(createdAt), tag: 'instant', events: ['email_sent', 'email_clicked'] },
    leadH >= 24
      ? { n: '5', kind: 'mail', label: 'Reminder (T-24h)', when: at(call - 24 * 36e5), tag: 'T-24h', events: ['email_sent', 'email_clicked'] }
      : { n: '5', kind: 'mail', label: 'Reminder (T-24h)', when: null, tag: 'skipped: booked under 24h ahead', events: [] },
    { n: '6', kind: 'mail', label: 'Reminder (T-1h)', when: at(call - 36e5), tag: 'T-1h', events: ['email_sent', 'email_clicked'] },
    { n: '7', kind: 'call', label: 'Call', when: at(call), tag: 'scheduled time', events: ['call_held', 'call_no_show'] },
    { n: 'N', kind: 'mail', label: 'No-show email', when: at(call + 15 * 6e4), tag: '+15 min, only if no join', events: ['email_clicked', 'booking_confirmed'] },
    { n: '8', kind: 'mail', label: 'Post-call email', when: at(call + 30 * 6e4 + 36e5), tag: 'same day', events: ['email_sent', 'email_clicked'] },
  ];
}
