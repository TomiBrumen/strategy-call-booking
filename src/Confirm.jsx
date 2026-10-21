import { Header, Footer, Mask, Check } from './Chrome.jsx';
import { DEMO, cancelUrl, rescheduleUrl } from './cal.js';
import { calendarLinks, fmtDate, fmtTime, tzName } from './util.js';

// Step 3. Variant A has the video and a vertical list of next steps, B is text only with a row of cards.
export default function Confirm({ variant, booking, event, tz, fire }) {
  const links = calendarLinks({ title: event.title, start: booking.start, end: booking.end, details: booking.meetingUrl || 'Strategy call with Databox' });
  const when = `${fmtDate(booking.start, tz)} · ${fmtTime(booking.start, tz)}`;
  const added = (calendar) => fire('calendar_added', { calendar });

  const steps = [
    ['Check your email', 'Your confirmation and calendar invite are on the way.'],
    ['Add to calendar', 'Use the buttons above so the call is not missed.'],
    ['Optional prep', '[One line + prep link]'],
  ];

  return (
    <div className="r">
      <Header />
      <main className="cf">
        <div className="hero">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="tick"><Check /></div>
            <h1>You're booked</h1>
            <p className="when">{when} <span className="mut">({tzName(booking.start, tz)})</span></p>
            <div className="addcal">
              <span className="step">Add to calendar</span>
              <div className="seggrp" role="group" aria-label="Add to calendar">
                <a className="seg" href={links.google} target="_blank" rel="noreferrer" onClick={() => added('google')}><span className="pi" />Google</a>
                <a className="seg" href={links.apple} download="strategy-call.ics" onClick={() => added('apple')}><span className="pi" />Apple</a>
                <a className="seg" href={links.outlook} download="strategy-call.ics" onClick={() => added('outlook')}><span className="pi" />Outlook</a>
              </div>
            </div>
          </div>
          <div className="wcard hostcard">
            <span className="step">Your host</span>
            <div className="row">
              {booking.hostAvatar ? <img src={booking.hostAvatar} alt={booking.host} width={72} height={72} style={{ borderRadius: '50%', flexShrink: 0, objectFit: 'cover', filter: 'grayscale(1)' }} /> : <Mask w={72} h={72} r={36} />}
              <div className="hn"><span style={{ fontWeight: 700, fontSize: 18 }}>{booking.host || 'Your host'}</span><span className="mut" style={{ fontSize: 15, lineHeight: '22px' }}>[One line about the host]</span></div>
            </div>
          </div>
        </div>

        {variant === 'A' ? (
          <div className="two">
            <div className="vid" style={{ marginTop: 0 }} aria-hidden="true"><Mask h="auto" r={12} style={{ aspectRatio: '16/9' }} /></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ marginBottom: 4 }}>Next steps</h2>
              <ol className="nsl">
                {steps.map(([t, d], i) => (
                  <li className="ns" key={t}><span className="numc">{i + 1}</span><span className="t"><b>{t}</b><span className="mut" style={{ fontSize: 15, lineHeight: '22px' }}>{d}</span></span></li>
                ))}
              </ol>
              <Manage uid={booking.uid} />
            </div>
          </div>
        ) : (
          <div className="nx">
            <h2>Next steps</h2>
            <ol>
              {steps.map(([t, d], i) => (
                <li className="wcard" key={t}><span className="numc">{i + 1}</span><b>{t}</b><span className="mut" style={{ fontSize: 15, lineHeight: '22px' }}>{d}</span></li>
              ))}
            </ol>
            <Manage uid={booking.uid} />
          </div>
        )}

        <section aria-hidden="true"><Mask h={150} r={14} /></section>
      </main>
      <Footer />
    </div>
  );
}

// Cal.com only lets attendees reschedule or cancel on its own pages (same links as in its emails).
function Manage({ uid }) {
  return (
    <div style={{ marginTop: 20, fontSize: 15 }} className="mut">
      Need a different time?{' '}
      {DEMO ? <span>Reschedule · Cancel <span className="note">links to Cal.com pages in the live version</span></span> : <>
        <a href={rescheduleUrl(uid)} target="_blank" rel="noreferrer">Reschedule</a>{' · '}<a href={cancelUrl(uid)} target="_blank" rel="noreferrer">Cancel</a></>}
    </div>
  );
}
