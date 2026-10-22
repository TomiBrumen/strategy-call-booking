import { Fragment, useState } from 'react';
import { EVENTS, STEP_EVENTS, STEPS, followUps } from './events.js';
import { fmtDate, fmtTime } from './util.js';

const Chip = ({ name, fired }) => <code className={'chip' + (fired ? ' fired' : '')}><i className={'dot ' + (EVENTS[name]?.by || 'b')} />{name}</code>;

function LogItem({ e, fresh }) {
  const [open, setOpen] = useState(false);
  const meta = EVENTS[e.name] || {};
  return (
    <li className={fresh ? 'new' : ''}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
        <i className={'dot ' + (meta.by || 'b')} /><span className="nm">{e.name}</span><span className="tm">{e.time}</span>
      </button>
      {open && <><div className="nt">{meta.note}</div><pre>{JSON.stringify(e.props, null, 2)}</pre></>}
    </li>
  );
}

export default function Panel({ onClose, step, log, ctx, booking, tz }) {
  const cur = STEPS.find((s) => s.id === step);
  const firedHere = new Set(log.filter((e) => e.step === step).map((e) => e.name));
  const rows = Object.entries(ctx).filter(([, v]) => v !== null && v !== undefined && v !== '');
  const mail = booking && booking.status !== 'canceled' ? followUps(booking.start) : null;

  return (
    <aside className="panel" aria-label="What fires">
      <div className="sec">
        <div className="h"><span>Step {cur.n} · Simulated</span><button type="button" className="x" onClick={onClose} aria-label="Close events panel">✕</button></div>
        <h3>{cur.label}</h3>
        <div className="chips">{STEP_EVENTS[step].map((n) => <Chip key={n} name={n} fired={firedHere.has(n)} />)}</div>
        <p className="unsent">Nothing is sent to Segment. This shows what would fire. Only the Cal.com booking is real.</p>
        <div className="chips" style={{ gap: 12, fontSize: 12, color: 'var(--muted)' }}>
          <span><i className="dot b" /> Browser</span><span><i className="dot s" /> Server or webhook</span><span><i className="dot m" /> Email</span>
        </div>
      </div>

      <div className="sec">
        <div className="h"><span>Events fired</span><span>{log.length}</span></div>
        {log.length === 0 ? <p className="hint">Nothing yet. Interact with the page.</p> : (
          <ul className="log">{[...log].reverse().map((e, i) => <LogItem key={e.id} e={e} fresh={i === 0} />)}</ul>
        )}
      </div>

      <div className="sec">
        <div className="h"><span>Context carried forward</span></div>
        <dl className="kv">{rows.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{String(v)}</dd></Fragment>)}</dl>
      </div>

      {mail && (
        <div className="sec">
          <div className="h"><span>After the booking (steps 4 to 8)</span></div>
          <ul className="tl">
            {followUps(booking.start).map((m) => (
              <li key={m.n} className={(m.kind === 'call' ? 'call ' : '') + (m.when ? '' : 'skip')}>
                <span className="n">{m.n}</span><b style={{ fontWeight: 500 }}>{m.label}</b>
                <span className="when">{m.when ? `${fmtDate(m.when, tz)}, ${fmtTime(m.when, tz)} · ` : ''}{m.tag}</span>
                {m.events.length > 0 && <span className="when" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{m.events.map((n) => <code key={n} className="chip"><i className={'dot ' + (EVENTS[n] ? EVENTS[n].by : n.startsWith('email') ? 'm' : 's')} />{n}</code>)}</span>}
              </li>
            ))}
          </ul>
          <p className="hint">Emails here are only a preview. Cal.com sends its own confirmation, and reschedule or cancel happen on its pages, where its webhooks would fire meeting_booking_rescheduled and meeting_booking_canceled.</p>
        </div>
      )}
    </aside>
  );
}
