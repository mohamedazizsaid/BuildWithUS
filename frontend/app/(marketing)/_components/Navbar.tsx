// Marketing navbar + mobile menu. Static markup — all interactivity
// (scroll state, mobile toggle, magnet) is wired by <MarketingFX/> via the
// data-* attributes below. Internal → app links use plain <a> (full reload)
// so marketing.css never leaks into the dashboard session.

export default function Navbar() {
  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Navigation principale">
        <div className="navbar-inner">
          <a href="/" className="nav-logo" aria-label="Retour à l'accueil">
            <span className="nav-logo-mark">W</span>
            <span>Wina<span className="nav-logo-italic">ity</span></span>
          </a>
          <ul className="nav-menu">
            <li><a href="/#product" className="nav-link">Produit</a></li>
            <li><a href="/pricing" className="nav-link">Tarifs</a></li>
            <li><a href="/features" className="nav-link">Fonctionnalités</a></li>
            <li><a href="/about" className="nav-link">À propos</a></li>
            <li><a href="/demo" className="nav-link">Démo</a></li>
            <li><a href="/contact" className="nav-link">Contact</a></li>
          </ul>
          <div className="nav-actions">
            <a href="/login" className="nav-btn-login">Se connecter</a>
            <a href="/register" className="nav-btn-cta" data-magnet>
              Essayer gratuitement
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
            <button className="nav-toggle btn-icon" data-menu-toggle aria-label="Ouvrir le menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
      </nav>

      <div className="mobile-menu" data-mobile-menu>
        <div className="mobile-menu-header">
          <div className="nav-logo" style={{ color: 'var(--ink-0)' }}>
            <span className="nav-logo-mark">W</span>
            <span>Wina<span className="nav-logo-italic" style={{ color: 'var(--blue-400)' }}>ity</span></span>
          </div>
          <button className="btn-icon" data-menu-close style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
        <ul className="mobile-menu-links">
          <li><a href="/" className="mobile-menu-link">Accueil</a></li>
          <li><a href="/pricing" className="mobile-menu-link"><em style={{ fontStyle: 'italic', color: 'var(--blue-400)' }}>Tarifs</em></a></li>
          <li><a href="/features" className="mobile-menu-link">Fonctionnalités</a></li>
          <li><a href="/about" className="mobile-menu-link">À propos</a></li>
          <li><a href="/demo" className="mobile-menu-link">Démo</a></li>
          <li><a href="/contact" className="mobile-menu-link">Contact</a></li>
          <li><a href="/login" className="mobile-menu-link" style={{ color: 'var(--blue-400)' }}>Se connecter →</a></li>
          <li><a href="/register" className="mobile-menu-link" style={{ color: 'var(--accent-lime)' }}><span className="ticker-dot" style={{ background: 'var(--accent-lime)', marginRight: '8px' }}></span>Essayer gratuitement →</a></li>
        </ul>
      </div>
    </>
  );
}
