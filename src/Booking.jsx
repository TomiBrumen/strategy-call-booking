import { useRef, useState } from 'react';
import { Header, Footer, Mask } from './Chrome.jsx';

const CODES = ['+1', '+44', '+386', '+49', '+33', '+353', '+31', '+61', '+91'];
const FREE = /@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|aol|proton|protonmail|gmx|me)\./i;

function validate(f) {
  const e = {};
  if (!f.first.trim()) e.first = 'Enter your first name';
  if (!f.last.trim()) e.last = 'Enter your last name';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) e.email = 'Enter a valid email';
  else if (FREE.test(f.email)) e.email = 'Use your work email';
  if (!f.consent) e.consent = 'Please agree to continue';
  return e;
}

// Step 1. Variant A has the video, B does not.
export default function Booking({ variant, form, setForm, onSubmit, fire, busy }) {
  const [errors, setErrors] = useState({});
  const started = useRef(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const start = () => { if (!started.current) { started.current = true; fire('meeting_form_started', {}); } };
  const submit = (e) => {
    e.preventDefault();
    const er = validate(form);
    setErrors(er);
    if (!Object.keys(er).length) onSubmit();
  };
  const fld = (k, label, type = 'text', extra = {}) => (
    <div className="f">
      <label htmlFor={'f-' + k}>{label}</label>
      <input className={'in' + (errors[k] ? ' bad' : '')} id={'f-' + k} type={type} value={form[k]} onChange={set(k)} onFocus={start} aria-invalid={!!errors[k]} {...extra} />
      {errors[k] && <span className="fe">{errors[k]}</span>}
    </div>
  );

  return (
    <div className="r">
      <Header />
      <section className="bk">
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Mask w="88%" h={56} r={10} />
            <Mask w="62%" h={56} r={10} />
            <Mask w="96%" h={22} r={6} style={{ marginTop: 14 }} />
            <Mask w="70%" h={22} r={6} />
            <Mask w={300} h={18} r={6} style={{ marginTop: 10 }} />
          </div>

          {variant === 'A' && <div className="vid" aria-hidden="true"><Mask h="auto" r={12} style={{ aspectRatio: '16/9' }} /></div>}

          <div className="trust" aria-hidden="true"><div className="logos">{[0, 1, 2, 3, 4, 5].map((i) => <Mask key={i} h={40} />)}</div></div>
          <div className="blk" aria-hidden="true"><Mask h={380} r={12} /></div>
          <div className="blk" aria-hidden="true"><Mask h={170} r={12} /></div>
        </div>

        <div className="side">
          <form className="wcard formcard" onSubmit={submit} noValidate>
            <div className="top"><span className="step">Step 1 of 2</span></div>
            <div className="g2">{fld('first', 'First name', 'text', { autoComplete: 'given-name' })}{fld('last', 'Last name', 'text', { autoComplete: 'family-name' })}</div>
            {fld('email', 'Work email', 'email', { autoComplete: 'email' })}
            <div className="f">
              <label htmlFor="f-phone">Phone</label>
              <div className="phone">
                <select className="in cc" aria-label="Country code" value={form.cc} onChange={set('cc')} onFocus={start}>{CODES.map((c) => <option key={c}>{c}</option>)}</select>
                <input className="in" id="f-phone" type="tel" value={form.phone} onChange={set('phone')} onFocus={start} autoComplete="tel-national" />
              </div>
            </div>
            <div className="consent">
              <input type="checkbox" id="f-consent" checked={form.consent} onChange={set('consent')} onFocus={start} />
              <label htmlFor="f-consent">[Consent and terms copy: what we contact you about, how often, and how to opt out.] <a href="#" onClick={(e) => e.preventDefault()}>[Privacy Policy]</a> and <a href="#" onClick={(e) => e.preventDefault()}>[Terms]</a>.</label>
            </div>
            {errors.consent && <span className="fe">{errors.consent}</span>}
            <button className="wbtn" type="submit" style={{ marginTop: 4 }} disabled={busy}>{busy ? 'Saving…' : 'Continue – pick a time'}</button>
            <p className="reassure">[Short reassurance line]</p>
          </form>
          <div className="proof" aria-hidden="true"><Mask h={130} r={14} /><Mask h={130} r={14} /></div>
        </div>
      </section>

      <section className="sec" aria-hidden="true"><Mask h={420} r={16} /></section>
      <section className="sec" aria-hidden="true"><Mask h={300} r={16} /></section>
      <section className="sec" aria-hidden="true"><Mask h={320} r={16} /></section>
      <Footer />
    </div>
  );
}
