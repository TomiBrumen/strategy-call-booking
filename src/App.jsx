import { useCallback, useEffect, useRef, useState } from 'react';
import Cta from './Cta.jsx';
import Booking from './Booking.jsx';
import Calendar from './Calendar.jsx';
import Confirm from './Confirm.jsx';
import Panel from './Panel.jsx';
import { STEPS } from './events.js';
import { browserTz, rand } from './util.js';
import { DEMO, EVENT, createBooking, getHostAvatar } from './cal.js';

const load = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

const emptyForm = { first: '', last: '', email: '', cc: '+1', phone: '', consent: false, q: '' };
const touch = (entry) => entry === 'ad'
  ? { source: 'linkedin', medium: 'paid_social', campaign: 'q4_strategy_call' }
  : { source: 'google', medium: 'organic', campaign: null };

function freshCtx(entry) {
  const t = touch(entry);
  return {
    anonymous_id: rand('anon_'), booking_session_id: rand('bs_'),
    flow_entry: entry === 'ad' ? 'ad' : 'cta', flow_start: entry === 'ad' ? 'calendar' : 'booking_page',
    source_page: null, cta_id: null,
    first_touch_source: t.source, first_touch_medium: t.medium, first_touch_campaign: t.campaign,
    last_touch_source: t.source, last_touch_medium: t.medium, last_touch_campaign: t.campaign,
  };
}

const Seg = ({ value, onChange, options }) => (
  <span className="seg2">{options.map(([v, l]) => <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>)}</span>
);

export default function App() {
  const event = EVENT;
  const [entry, setEntry] = useState('cta');
  const [vb, setVb] = useState('A');
  const [vc, setVc] = useState('A');
  const [step, setStep] = useState('cta');
  const [ctx, setCtx] = useState(() => freshCtx('cta'));
  const [form, setForm] = useState(emptyForm);
  const [booking, setBooking] = useState(null);
    const [tz, setTz] = useState(browserTz());
  const [log, setLog] = useState([]);
  const [showBar, setShowBar] = useState(() => load('sim-bar') !== '0');
  const [showPanel, setShowPanel] = useState(() => load('sim-panel') !== '0');
  const toggleBar = (v) => { setShowBar(v); save('sim-bar', v ? '1' : '0'); };
  const togglePanel = (v) => { setShowPanel(v); save('sim-panel', v ? '1' : '0'); };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stepRef = useRef(step);
  const seq = useRef(0);
  stepRef.current = step;

  const [knownEmail, setKnownEmail] = useState('');
  const emailRef = useRef('');
  const bookingIdRef = useRef('');
  const identify = (email) => { emailRef.current = email; setKnownEmail(email); };

  const fire = useCallback((name, props = {}) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    // Before the email is known the visitor is anonymous. From then on every event carries it.
    let withWho = emailRef.current && !('email' in props) ? { ...props, email: emailRef.current } : props;
    if (bookingIdRef.current && !('booking_id' in withWho)) withWho = { ...withWho, booking_id: bookingIdRef.current };
    setLog((l) => [...l, { id: ++seq.current, name, props: withWho, time, step: stepRef.current }]);
  }, []);

  const go = (to) => {
    stepRef.current = to;
    fire('page', { path: { cta: '/page-xyz', booking: '/strategy-call', calendar: '/strategy-call/calendar', confirm: '/strategy-call/confirmed' }[to] });
    setError('');
    setStep(to);
    window.scrollTo({ top: 0 });
  };

  const restart = (e = entry) => {
    identify(''); bookingIdRef.current = ''; setCtx(freshCtx(e)); setForm(emptyForm); setBooking(null); setError(''); setBusy(false);
    setLog([]);
    const first = e === 'ad' ? 'calendar' : 'cta';
    stepRef.current = first; setStep(first);
    fire('page', { path: { cta: '/page-xyz', calendar: '/strategy-call/calendar' }[first] });
    window.scrollTo({ top: 0 });
  };

  // Step 1 -> 2
  const onForm = () => {
    identify(form.email);
    fire('form_submitted', { email_domain: form.email.split('@')[1], contact_id: 'contact_' + ctx.booking_session_id.slice(3, 8) });
    go('calendar');
  };

  const daysAhead = (iso) => Math.max(0, Math.round((new Date(iso) - Date.now()) / 864e5));
  // Step 0 -> 1
  const onCta = (id) => {
    setCtx((c) => ({ ...c, source_page: '/page-xyz', cta_id: id }));
    fire('cta_clicked', { cta_id: id, source_page: '/page-xyz', cta_text: 'Book a strategy call' });
    go('booking');
  };

  const onSlot = (start) => fire('slot_selected', { days_ahead: daysAhead(start) });

  const metadata = () => ({
    booking_session_id: ctx.booking_session_id, flow_entry: ctx.flow_entry, flow_start: ctx.flow_start,
    source_page: ctx.source_page || '', cta_id: ctx.cta_id || '', variant_booking: vb, variant_confirmation: vc,
    first_touch_source: ctx.first_touch_source, last_touch_source: ctx.last_touch_source,
    ...(form.q ? { qualifying_answer: form.q.slice(0, 450) } : {}),
  });

  const hostOf = (d) => d.hosts?.[0]?.name || d.organizer?.name || '';
  const hostUser = (d) => d.hosts?.[0]?.username || d.organizer?.username || '';

  const onConfirm = async (start) => {
    setBusy(true); setError('');
    identify(form.email);
    try {
      {
        const d = await createBooking({ start, name: `${form.first} ${form.last}`.trim(), email: form.email, phone: form.phone ? form.cc + form.phone : '', timeZone: tz, metadata: metadata() });
        const b = { uid: d.uid, start: d.start, end: d.end, host: hostOf(d), meetingUrl: d.meetingUrl, status: 'accepted' };
        setBooking(b);
        bookingIdRef.current = d.uid;
        getHostAvatar(hostUser(d)).then((hostAvatar) => hostAvatar && setBooking((cur) => cur && { ...cur, hostAvatar }));
        fire('booking_confirmed', {
          booking_id: d.uid, host_id: d.hosts?.[0]?.id ?? null, call_at: d.start, lead_time_h: Math.round((new Date(d.start) - Date.now()) / 36e5),
          rebook_reason: null, variant_booking: vb,
        });
      }
      go('confirm');
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  useEffect(() => { fire('page', { path: entry === 'ad' ? '/strategy-call/calendar' : '/page-xyz' }); }, []);
  useEffect(() => { if (step === 'confirm') fire('confirmation_viewed', { variant_confirmation: vc, booking_id: booking.uid }); }, [step]);
  useEffect(() => { if (step === 'booking') fire('booking_page_viewed', { variant_booking: vb, flow_entry: ctx.flow_entry }); }, [step, vb]);
  useEffect(() => { if (step === 'calendar') fire('calendar_viewed', { flow_start: ctx.flow_start, flow_entry: ctx.flow_entry, }); }, [step]);

  const idx = STEPS.findIndex((s) => s.id === step);
  const screenEl = {
    cta: <Cta onCta={onCta} />,
    booking: <Booking key={vb} variant={vb} form={form} setForm={setForm} onSubmit={onForm} fire={fire} />,
    calendar: <Calendar event={event} form={form} setForm={setForm} ctx={ctx} tz={tz} setTz={setTz}
      onBack={() => go('booking')} onSlot={onSlot} onConfirm={onConfirm} busy={busy} error={error} />,
    confirm: booking && <Confirm variant={vc} booking={booking} event={event} tz={tz} fire={fire} />,
  }[step];

  return (
    <div className={'app' + (showBar ? '' : ' nobar')}>
      {showBar && <div className="bar">
        <span className="title">Strategy call booking simulator</span>
        {DEMO && <span className="sbtn" style={{ cursor: 'default', background: 'var(--srv-bg)', borderColor: 'transparent', color: 'var(--srv)' }}>Demo: Cal.com is simulated</span>}
        <span className="grp"><span className="l">Entry</span><Seg value={entry} onChange={(v) => { setEntry(v); restart(v); }} options={[['cta', 'CTA click'], ['ad', 'Targeted ad to calendar']]} /></span>
        <span className="grp"><span className="l">Booking</span><Seg value={vb} onChange={setVb} options={[['A', 'A video'], ['B', 'B no video']]} /></span>
        <span className="grp"><span className="l">Confirmation</span><Seg value={vc} onChange={setVc} options={[['A', 'A video'], ['B', 'B text']]} /></span>
        <button type="button" className="sbtn" onClick={() => restart()}>Restart</button>
        <div className="stepper">{STEPS.filter((s) => entry === 'cta' || (s.id !== 'cta' && s.id !== 'booking')).map((s) => (
          <span key={s.id} className={'st' + (s.id === step ? ' on' : STEPS.findIndex((x) => x.id === s.id) < idx ? ' done' : '')}><span className="num">{s.n}</span>{s.label}</span>
        ))}</div>
        <button type="button" className="sbtn" onClick={() => toggleBar(false)} aria-label="Hide controls">Hide controls</button>
      </div>}
      <div className={'main' + (showPanel ? '' : ' nopanel')}>
        <div className="screen">{screenEl}</div>
        {showPanel && <Panel onClose={() => togglePanel(false)} step={step} log={log} ctx={{ ...ctx, ...(knownEmail ? { email: knownEmail } : { email: '(anonymous: not known yet)' }), ...(step === 'booking' || step === 'confirm' ? { variant_booking: vb } : {}), ...(step === 'confirm' ? { variant_confirmation: vc } : {}), ...(booking ? { booking_id: booking.uid } : {}) }} booking={booking} tz={tz} />}
      </div>
      {(!showBar || !showPanel) && (
        <div className="reveal">
          {!showBar && <button type="button" onClick={() => toggleBar(true)}>Show controls</button>}
          {!showPanel && <button type="button" onClick={() => togglePanel(true)}>Show events</button>}
        </div>
      )}
    </div>
  );
}
