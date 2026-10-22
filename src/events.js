// Event dictionary from the spec (Events & metrics tab). by: b = browser, s = server or webhook, m = email platform.
export const EVENTS = {
  page: { by: 'b', note: 'Segment page call, on every load' },
  meeting_cta_clicked: { by: 'b', note: 'Click on an element with data-cta' },
  meeting_booking_page_viewed: { by: 'b', note: 'Booking page load' },
  meeting_video_played: { by: 'b', note: 'Play on an A variant video' },
  meeting_form_started: { by: 'b', note: 'First field focused' },
  meeting_form_submitted: { by: 's', note: 'Form accepted. Sent with identify()' },
  meeting_calendar_page_viewed: { by: 'b', note: 'Calendar load' },
  meeting_slot_selected: { by: 'b', note: 'Time slot picked, before confirm' },
  meeting_booking_confirmed: { by: 's', note: 'Booking created, from the scheduler webhook. Sent with identify() when no form ran' },
  meeting_confirmation_page_viewed: { by: 'b', note: 'Confirmation page load' },
  meeting_add_to_calendar_clicked: { by: 'b', note: 'Add-to-calendar click' },
  meeting_booking_rescheduled: { by: 's', note: 'Time changed on an existing booking' },
  meeting_booking_canceled: { by: 's', note: 'Booking canceled' },
};

// What each screen can fire, in order. Shown as chips that light up when fired.
export const STEP_EVENTS = {
  cta: ['page', 'meeting_cta_clicked'],
  booking: ['page', 'meeting_booking_page_viewed', 'meeting_video_played', 'meeting_form_started', 'meeting_form_submitted'],
  calendar: ['page', 'meeting_calendar_page_viewed', 'meeting_slot_selected', 'meeting_booking_confirmed'],
  confirm: ['page', 'meeting_confirmation_page_viewed', 'meeting_add_to_calendar_clicked'],
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
    { n: '4', kind: 'mail', label: 'Confirmation email', when: at(createdAt), tag: 'instant', events: ['meeting_email_sent', 'meeting_email_clicked'] },
    leadH >= 24
      ? { n: '5', kind: 'mail', label: 'Reminder (T-24h)', when: at(call - 24 * 36e5), tag: 'T-24h', events: ['meeting_email_sent', 'meeting_email_clicked'] }
      : { n: '5', kind: 'mail', label: 'Reminder (T-24h)', when: null, tag: 'skipped: booked under 24h ahead', events: [] },
    { n: '6', kind: 'mail', label: 'Reminder (T-1h)', when: at(call - 36e5), tag: 'T-1h', events: ['meeting_email_sent', 'meeting_email_clicked'] },
    { n: '7', kind: 'call', label: 'Call', when: at(call), tag: 'scheduled time', events: ['meeting_call_held', 'meeting_call_no_show'] },
    { n: 'N', kind: 'mail', label: 'No-show email', when: at(call + 15 * 6e4), tag: '+15 min, only if no join', events: ['meeting_email_clicked', 'meeting_booking_confirmed'] },
    { n: '8', kind: 'mail', label: 'Post-call email', when: at(call + 30 * 6e4 + 36e5), tag: 'same day', events: ['meeting_email_sent', 'meeting_email_clicked'] },
  ];
}
