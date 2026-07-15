// Shared shell for every marketing route (/, /about, /contact, /demo,
// /features, /pricing, /design-system). Imports the design-system CSS (all
// selectors scoped under .tb so nothing leaks into the dashboard), the shared
// nav/footer, and the DOM-driven effects.
import './marketing.css';
import './mk-components.css';
import './mk-home.css';
import './mk-about.css';
import './mk-contact.css';
import './mk-demo.css';
import './mk-features.css';
import './mk-pricing.css';
import './mk-ds.css';

import Navbar from './_components/Navbar';
import Footer from './_components/Footer';
import MarketingFX from './_components/MarketingFX';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="tb">
      <Navbar />
      {children}
      <Footer />
      <MarketingFX />
    </div>
  );
}
