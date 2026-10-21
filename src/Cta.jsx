import { Header, Footer, Mask } from './Chrome.jsx';

// Step 0: any page with a strategy-call CTA. Only the buttons are live; the rest of the page is gray blocks.
export default function Cta({ onCta }) {
  return (
    <div className="r">
      <Header onCta={() => onCta('header')} />
      <main className="ctapage">
        <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Mask w={120} h={14} r={6} />
          <Mask w="80%" h={56} r={10} />
          <Mask w="55%" h={56} r={10} />
          <Mask w="92%" h={22} r={6} style={{ marginTop: 12 }} />
          <Mask w="64%" h={22} r={6} />
        </div>
        <button type="button" className="wbtn auto sm" data-cta="xyz_inline" onClick={() => onCta('xyz_inline')}>Book a strategy call</button>
        <div aria-hidden="true"><Mask h={340} r={14} style={{ maxWidth: 640 }} /></div>
      </main>
      <Footer />
    </div>
  );
}
