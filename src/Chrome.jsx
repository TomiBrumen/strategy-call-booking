// Everything outside the booking and calendar flow is a plain gray block: no text, logos or copy are rendered.
export const Mask = ({ w = '100%', h = 24, r = 8, style }) => <div className="mask" aria-hidden="true" style={{ width: w, height: h, borderRadius: r, ...style }} />;

export function Header({ onCta }) {
  return (
    <header className="hdr">
      <Mask w={128} h={32} />
      <nav aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <Mask key={i} w={72} h={14} r={7} />)}</nav>
      <Mask w={56} h={14} r={7} />
      {onCta && <button type="button" className="hcta" data-cta="header" onClick={onCta}>Book a strategy call</button>}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="ftr" aria-hidden="true">
      <Mask w={128} h={32} />
      <Mask h={96} r={12} />
    </footer>
  );
}

export const Check = ({ size = 28, color = '#1C1C1C', w = 2.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
);
export const Chev = ({ d }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C1C1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
export const Play = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1C1C1C" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);
