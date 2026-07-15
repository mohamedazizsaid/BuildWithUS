// Marketing footer — static, rebranded to Winaity.

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-cta">
          <div>
            <p className="eyebrow" style={{ color: 'var(--blue-400)', marginBottom: 'var(--space-4)' }}>→ Prêt à démarrer</p>
            <h2 className="footer-cta-title">
              Construisez<br />
              vos <em>templates</em><br />
              en quelques clics.
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
            <a href="/register" className="btn btn-accent btn-xl" data-magnet>
              Essai gratuit
              <svg className="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
            <a href="/login" style={{ color: 'var(--ink-300)', fontSize: '13px', fontFamily: 'var(--font-mono)', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
              <span className="ticker-dot" style={{ background: 'var(--accent-lime)', boxShadow: '0 0 0 2px rgba(198,242,78,0.2)' }}></span>
              ou se connecter →
            </a>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>Sans carte bancaire • Annulation à tout moment</span>
          </div>
        </div>

        <div className="footer-grid">
          <div className="footer-brand">
            <div className="nav-logo">
              <span className="nav-logo-mark">W</span>
              <span>Wina<span className="nav-logo-italic">ity</span></span>
            </div>
            <p className="footer-tagline">Le Template Builder nouvelle génération pour emails, factures et contrats. Boosté à l&apos;IA, pensé en France.</p>
            <div className="footer-social">
              <a href="#" aria-label="LinkedIn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>
              <a href="#" aria-label="X (Twitter)"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg></a>
              <a href="#" aria-label="GitHub"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg></a>
              <a href="#" aria-label="YouTube"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Produit</h4>
            <ul>
              <li><a href="/features">Fonctionnalités</a></li>
              <li><a href="/pricing">Tarifs</a></li>
              <li><a href="/features#emails">Templates email</a></li>
              <li><a href="/features#contrats">Contrats &amp; Factures</a></li>
              <li><a href="/features#ia">Banque d&apos;images</a></li>
              <li><a href="/features#integrations">Intégrations</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Entreprise</h4>
            <ul>
              <li><a href="/about">Qui sommes-nous</a></li>
              <li><a href="/demo">Demander une démo</a></li>
              <li><a href="/contact">Contact</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Carrières</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Ressources</h4>
            <ul>
              <li><a href="/design-system">Design system</a></li>
              <li><a href="/developers">Documentation</a></li>
              <li><a href="/developers">API</a></li>
              <li><a href="#">Changelog</a></li>
              <li><a href="#">Status</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Légal</h4>
            <ul>
              <li><a href="#">Mentions légales</a></li>
              <li><a href="#">CGU / CGV</a></li>
              <li><a href="#">RGPD</a></li>
              <li><a href="#">Politique cookies</a></li>
              <li><a href="#">Sécurité</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Winaity — Fait avec soin à Paris 🇫🇷</span>
          <span>contact@winaity.com</span>
        </div>

        <div className="footer-wordmark" aria-hidden="true">
          Wina<em>ity</em>
        </div>
      </div>
    </footer>
  );
}
