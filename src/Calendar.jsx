import { useEffect, useMemo, useRef, useState } from 'react';
import { Header, Chev } from './Chrome.jsx';
import { getSlots } from './cal.js';
import { browserTz, fmtDate, fmtMonth, fmtTime, tzName, ymd } from './util.js';

const ZONES = (() => {
  try { return Intl.supportedValuesOf('timeZone'); } catch { return ['UTC', 'Europe/Ljubljana', 'Europe/London', 'America/New_York', 'America/Los_Angeles']; }
})();

// Step 2. Real availability from Cal.com, booking created straight from the browser.
export default function Calendar({ event, form, setForm, ctx, tz, setTz, onBack, onSlot, onConfirm, busy, error }) {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [slots, setSlots] = useState({});
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [changeTz, setChangeTz] = useState(false);
  const userNav = useRef(false); // set once the visitor changes the month themselves
  const hops = useRef(0); // months skipped automatically while looking for the first available day
  const direct = ctx.flow_start === 'calendar';

  useEffect(() => {
    let off = false;
    setLoading(true);
    const y = month.getFullYear(), m = month.getMonth();
    const first = y === today.getFullYear() && m === today.getMonth() ? today.getDate() : 1;
    const last = new Date(y, m + 1, 0).getDate();
    getSlots(ymd(y, m, first), ymd(y, m, last), tz)
      .then((d) => {
        if (off) return;
        setSlots(d); setLoadErr('');
        const first = Object.keys(d).sort()[0] || null;
        // Nothing free this month: open the next one, up to a year ahead, so the first available day is shown by default
        if (!first && hops.current < 12 && !userNav.current) { hops.current += 1; setMonth(new Date(y, m + 1, 1)); return; }
        setDay((cur) => (cur && d[cur] ? cur : first));
        setSlot(null);
      })
      .catch((e) => !off && (setLoadErr(e.message), setSlots({})))
      .finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [month, tz]);

  const cells = useMemo(() => {
    const y = month.getFullYear(), m = month.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
    const n = new Date(y, m + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)];
  }, [month]);

  const todayKey = ymd(today.getFullYear(), today.getMonth(), today.getDate());
  const isCurrent = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  const pick = (s) => { setSlot(s); onSlot(s.start); };
  const dayLabel = day ? fmtDate(day + 'T12:00:00Z', 'UTC') : '';
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const needDetails = direct && (!form.first.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email));
  const name = `${form.first} ${form.last}`.trim();

  return (
    <div className="r">
      <Header />
      <main className="cal">
        <div className="nav">
          {direct ? <span /> : <button type="button" className="back" onClick={onBack}><Chev d="M15 6l-6 6 6 6" />Back – edit details</button>}
          <span className="step">{direct ? 'Pick a time' : 'Step 2 of 2'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h1>Pick a time</h1>
          <div className="meta" style={{ marginTop: 0 }}><span>{event.title}</span><span className="mut">·</span><span>{event.length} min</span><span className="mut">·</span><span>Free</span></div>
        </div>

        <div className="wcard calbox">
          <div className="calgrid">
            <div className="calL">
              <div className="mhead">
                <button className="icb" type="button" aria-label="Previous month" disabled={isCurrent} onClick={() => { userNav.current = true; setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); }}><Chev d="M15 6l-6 6 6 6" /></button>
                <span style={{ fontWeight: 600, fontSize: 18 }}>{fmtMonth(month)}</span>
                <button className="icb" type="button" aria-label="Next month" onClick={() => { userNav.current = true; setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); }}><Chev d="M9 6l6 6-6 6" /></button>
              </div>
              <div className="days" aria-busy={loading} style={{ opacity: loading ? 0.5 : 1 }}>
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((w) => <span className="wd" key={w}>{w}</span>)}
                {cells.map((n, i) => {
                  if (!n) return <span className="d blank" key={'b' + i} />;
                  const key = ymd(month.getFullYear(), month.getMonth(), n);
                  const av = !!slots[key];
                  return (
                    <button key={key} type="button" disabled={!av} className={'d ' + (key === day ? 'sel' : av ? 'av' : 'off') + (key === todayKey ? ' today' : '')}
                      onClick={() => { setDay(key); setSlot(null); }} aria-pressed={key === day}>{n}</button>
                  );
                })}
              </div>
            </div>
            <div className="calR" aria-live="polite">
              <span className="dayhead">{dayLabel || '—'}</span>
              {loadErr && <div className="err">{loadErr}</div>}
              {loading && [0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="slot sk" aria-hidden="true" />)}
              {!loading && !loadErr && !day && <div className="empty">No times this month. Try the next one.</div>}
              {!loading && day && (slots[day] || []).map((s) => (
                <button key={s.start} type="button" className={'slot' + (slot?.start === s.start ? ' sel' : '')} onClick={() => pick(s)}>{fmtTime(s.start, tz)}</button>
              ))}
            </div>
          </div>

          <div className="tzbar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E5E5E" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
            <span>All times in your time zone: {tz.replace('_', ' ')}{tz === browserTz() ? ' (auto-detected)' : ''}</span>
            {changeTz
              ? <select value={tz} onChange={(e) => { setTz(e.target.value); setChangeTz(false); }} aria-label="Time zone">{ZONES.map((z) => <option key={z}>{z}</option>)}</select>
              : <button type="button" className="linkbtn" onClick={() => setChangeTz(true)}>Change</button>}
          </div>

          <div className="sumbar">
            <div className="sum">
              {slot ? <span style={{ fontWeight: 600 }}>{fmtDate(slot.start, tz)} · {fmtTime(slot.start, tz)} ({tzName(slot.start, tz)})</span> : <span style={{ fontWeight: 600 }}>Select a time</span>}
              {!direct && <span className="mut" style={{ fontSize: 14 }}>{name || '—'} · {form.email || '—'}</span>}
            </div>
            {direct && (
              <div className="inl">
                <input className="in" placeholder="Full name" aria-label="Full name" value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value, last: '' })} />
                <input className="in" placeholder="Work email" aria-label="Work email" type="email" value={form.email} onChange={set('email')} />
                <input className="in" placeholder="What do you want from the call?" aria-label="Qualifying question" value={form.q} onChange={set('q')} style={{ width: 300 }} />
              </div>
            )}
            <button className="wbtn auto" type="button" disabled={!slot || busy || needDetails} onClick={() => onConfirm(slot.start)}>
              {busy ? 'Booking…' : 'Confirm booking'}
            </button>
          </div>
        </div>
        {error && <div className="err" role="alert">{error}</div>}
      </main>
    </div>
  );
}
