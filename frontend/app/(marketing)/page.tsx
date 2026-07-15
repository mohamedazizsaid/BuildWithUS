// Winaity home page (marketing). Static markup — interactivity (reveal, tabs,
// counters, magnet, sparkles) is wired globally by <MarketingFX/> in the layout.
import type { CSSProperties } from 'react';

export default function HomePage() {
  return (
    <main>
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-bg-grid"></div>
          <div className="hero-bg-gradient"></div>
        </div>

        <div className="hero-inner">
          <a href="/register" className="hero-badge hero-badge-live blur-in" style={{ textDecoration: 'none' }}>
            <span className="ticker-dot"></span>
            <span className="hero-badge-tag">Nouveau</span>
            <span>Assistant IA + banque d&apos;images intégrée</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </a>

          <h1 className="hero-title blur-in" style={{ animationDelay: '120ms' }}>
            Des templates qui<br />
            <em>claquent</em>, faits<br />
            en deux minutes.
          </h1>

          <p className="hero-subtitle blur-in" style={{ animationDelay: '280ms' }}>
            Email, facture, contrat — Winaity génère, édite et déploie vos documents
            professionnels. Connecté à votre CRM ou en standalone. Boosté par l&apos;IA,
            nourri par une banque d&apos;images libres.
          </p>

          <div className="hero-actions blur-in" style={{ animationDelay: '400ms' }}>
            <a href="/register" className="btn btn-primary btn-xl" data-magnet>
              Démarrer gratuitement
              <svg className="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <a href="/demo" className="btn btn-secondary btn-xl">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M10 8l6 4-6 4V8z" fill="currentColor" /></svg>
              Voir la démo
            </a>
            <a href="/login" className="hero-link-builder" data-magnet>
              <span className="ticker-dot"></span>
              ou se connecter →
            </a>
          </div>

          <div className="hero-trust">
            <span className="hero-trust-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg> Plan gratuit</span>
            <span className="hero-trust-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg> Hébergé en France 🇫🇷</span>
          </div>

          {/* Product preview */}
          <div className="hero-preview">
            <div className="hero-preview-frame">
              <div className="hero-preview-topbar">
                <div className="hero-preview-dots"><span></span><span></span><span></span></div>
                <div className="hero-preview-url">app.winaity.com/editor/new</div>
                <div style={{ width: '44px' }}></div>
              </div>
              <div className="hero-preview-content">
                <svg viewBox="0 0 1200 675" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FAFAFB" />
                      <stop offset="100%" stopColor="#F3F4F6" />
                    </linearGradient>
                    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2E5FF0" />
                      <stop offset="100%" stopColor="#1738A8" />
                    </linearGradient>
                  </defs>
                  <rect width="1200" height="675" fill="url(#bgGrad)" />
                  <rect x="0" y="0" width="260" height="675" fill="white" stroke="#E5E7EB" />
                  <rect x="20" y="24" width="220" height="40" rx="10" fill="#F3F4F6" />
                  <circle cx="40" cy="44" r="8" fill="#2E5FF0" />
                  <rect x="56" y="40" width="140" height="8" rx="4" fill="#374151" />
                  <text x="20" y="100" fontFamily="system-ui" fontSize="11" fill="#9CA3AF" fontWeight="600" letterSpacing="1">BLOCS</text>
                  <rect x="20" y="115" width="105" height="80" rx="10" fill="white" stroke="#E5E7EB" />
                  <rect x="35" y="135" width="75" height="6" rx="3" fill="#2E5FF0" />
                  <rect x="35" y="150" width="60" height="4" rx="2" fill="#E5E7EB" />
                  <rect x="35" y="160" width="70" height="4" rx="2" fill="#E5E7EB" />
                  <rect x="35" y="170" width="50" height="4" rx="2" fill="#E5E7EB" />
                  <rect x="135" y="115" width="105" height="80" rx="10" fill="white" stroke="#E5E7EB" />
                  <rect x="150" y="135" width="40" height="40" rx="6" fill="#C6F24E" />
                  <rect x="195" y="135" width="35" height="6" rx="3" fill="#374151" />
                  <rect x="195" y="148" width="30" height="4" rx="2" fill="#E5E7EB" />
                  <rect x="20" y="205" width="105" height="80" rx="10" fill="white" stroke="#E5E7EB" />
                  <circle cx="72" cy="245" r="18" fill="#2E5FF0" opacity="0.15" />
                  <rect x="54" y="268" width="36" height="4" rx="2" fill="#E5E7EB" />
                  <rect x="135" y="205" width="105" height="80" rx="10" fill="white" stroke="#E5E7EB" />
                  <rect x="150" y="220" width="75" height="20" rx="10" fill="#111827" />
                  <rect x="150" y="248" width="55" height="4" rx="2" fill="#E5E7EB" />
                  <rect x="150" y="258" width="70" height="4" rx="2" fill="#E5E7EB" />
                  <rect x="290" y="40" width="640" height="600" rx="12" fill="white" stroke="#E5E7EB" />
                  <rect x="290" y="40" width="640" height="80" rx="12" fill="url(#blueGrad)" />
                  <rect x="290" y="108" width="640" height="12" fill="url(#blueGrad)" />
                  <rect x="320" y="64" width="120" height="10" rx="5" fill="white" opacity="0.9" />
                  <rect x="320" y="82" width="80" height="6" rx="3" fill="white" opacity="0.6" />
                  <rect x="320" y="150" width="580" height="180" rx="8" fill="#F3F4F6" />
                  <path d="M500 200 L550 240 L620 210 L680 270 L720 260 L720 300 L500 300 Z" fill="#D1D5DB" />
                  <circle cx="560" cy="200" r="14" fill="#FFB547" />
                  <rect x="320" y="360" width="280" height="16" rx="4" fill="#111827" />
                  <rect x="320" y="390" width="480" height="6" rx="3" fill="#D1D5DB" />
                  <rect x="320" y="404" width="420" height="6" rx="3" fill="#D1D5DB" />
                  <rect x="320" y="418" width="450" height="6" rx="3" fill="#D1D5DB" />
                  <rect x="320" y="450" width="140" height="40" rx="20" fill="#111827" />
                  <rect x="340" y="465" width="60" height="8" rx="4" fill="white" />
                  <circle cx="340" cy="580" r="12" fill="#E5E7EB" />
                  <circle cx="370" cy="580" r="12" fill="#E5E7EB" />
                  <circle cx="400" cy="580" r="12" fill="#E5E7EB" />
                  <rect x="960" y="40" width="220" height="600" rx="12" fill="white" stroke="#E5E7EB" />
                  <rect x="980" y="60" width="80" height="10" rx="5" fill="#111827" />
                  <rect x="980" y="90" width="180" height="6" rx="3" fill="#9CA3AF" />
                  <rect x="980" y="120" width="180" height="90" rx="10" fill="#111827" />
                  <text x="995" y="145" fontFamily="system-ui" fontSize="10" fill="#C6F24E" fontWeight="600">✦ AI ASSIST</text>
                  <rect x="995" y="160" width="150" height="4" rx="2" fill="white" opacity="0.4" />
                  <rect x="995" y="170" width="120" height="4" rx="2" fill="white" opacity="0.4" />
                  <rect x="995" y="185" width="80" height="18" rx="9" fill="#C6F24E" />
                  <text x="1010" y="197" fontFamily="system-ui" fontSize="9" fill="#111827" fontWeight="600">Générer</text>
                  <rect x="980" y="235" width="60" height="10" rx="5" fill="#111827" />
                  <circle cx="985" cy="265" r="10" fill="#2E5FF0" />
                  <circle cx="1010" cy="265" r="10" fill="#C6F24E" />
                  <circle cx="1035" cy="265" r="10" fill="#111827" />
                  <circle cx="1060" cy="265" r="10" fill="#FF6B5B" />
                  <circle cx="1085" cy="265" r="10" fill="#FFB547" />
                  <rect x="980" y="300" width="60" height="8" rx="4" fill="#374151" />
                  <rect x="980" y="320" width="180" height="34" rx="8" fill="#F3F4F6" stroke="#E5E7EB" />
                  <rect x="995" y="334" width="60" height="6" rx="3" fill="#9CA3AF" />
                  <rect x="980" y="370" width="80" height="8" rx="4" fill="#374151" />
                  <rect x="980" y="390" width="180" height="34" rx="8" fill="#F3F4F6" stroke="#E5E7EB" />
                  <rect x="980" y="445" width="100" height="8" rx="4" fill="#374151" />
                  <rect x="1130" y="440" width="30" height="16" rx="8" fill="#2E5FF0" />
                  <circle cx="1152" cy="448" r="6" fill="white" />
                </svg>

                <div className="preview-card-float top-left">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #C6F24E, #4EF2B3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6L12 2z" fill="#111827" /></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'var(--font-mono)' } as CSSProperties}>IA GÉNÈRE</div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>Template en 4s</div>
                    </div>
                  </div>
                </div>
                <div className="preview-card-float bottom-right">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--blue-50)', color: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' } as CSSProperties}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" /><path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" /></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'var(--font-mono)' } as CSSProperties}>BANQUE D&apos;IMAGES</div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>Des milliers de visuels</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENTO */}
      <section className="section" id="product">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">→ Un outil, trois mondes</div>
            <h2 className="section-title">
              Tout ce qu&apos;il faut pour produire<br />
              des documents <em>remarquables</em>.
            </h2>
            <p className="section-subtitle">
              Emails, factures, contrats. Un seul builder, infiniment adaptable.
              Connecté à votre CRM ou en standalone. L&apos;IA suggère, vous validez.
            </p>
          </div>

          <div className="bento-grid">
            <article className="bento-card span-4 row-2 reveal">
              <div className="bento-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M2 7l10 7 10-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <h3 className="bento-title">Email builder <em>drag-and-drop</em></h3>
              <p className="bento-desc">
                Des templates prêts à l&apos;emploi, conçus par nos designers.
                Des sections modulaires pour construire bloc par bloc.
                Export HTML propre, responsive, testé sur les principaux clients mail.
              </p>
              <div className="bento-visual">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '16px' }}>
                  <div className="mini-email">
                    <div style={{ height: '40px', background: 'var(--blue-600)', borderRadius: '6px', marginBottom: '8px' }}></div>
                    <div className="mini-email-row w-80"></div>
                    <div className="mini-email-row w-60"></div>
                    <div className="mini-email-row w-40"></div>
                    <div style={{ height: '20px', background: 'var(--ink-900)', borderRadius: '10px', marginTop: '8px', width: '60%' }}></div>
                  </div>
                  <div className="mini-email">
                    <div style={{ height: '30px', background: 'var(--accent-lime)', borderRadius: '6px', marginBottom: '8px' }}></div>
                    <div className="mini-email-row w-60"></div>
                    <div style={{ height: '30px', background: 'var(--ink-100)', borderRadius: '6px', margin: '8px 0' }}></div>
                    <div className="mini-email-row w-40"></div>
                    <div style={{ height: '20px', background: 'var(--ink-900)', borderRadius: '10px', marginTop: '8px', width: '70%' }}></div>
                  </div>
                  <div className="mini-email">
                    <div style={{ height: '50px', background: 'linear-gradient(135deg,var(--blue-400),var(--blue-700))', borderRadius: '6px', marginBottom: '8px' }}></div>
                    <div className="mini-email-row w-80"></div>
                    <div className="mini-email-row w-60"></div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                      <div style={{ width: '16px', height: '16px', background: 'var(--ink-200)', borderRadius: '50%' }}></div>
                      <div style={{ width: '16px', height: '16px', background: 'var(--ink-200)', borderRadius: '50%' }}></div>
                      <div style={{ width: '16px', height: '16px', background: 'var(--ink-200)', borderRadius: '50%' }}></div>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-accent">Newsletter</span>
                  <span className="badge badge-accent">Promo</span>
                  <span className="badge badge-accent">Onboarding</span>
                  <span className="badge badge-accent">Transactionnel</span>
                  <span className="badge">et plus</span>
                </div>
              </div>
            </article>

            <article className="bento-card span-2 dark reveal">
              <div className="bento-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
              </div>
              <h3 className="bento-title">Boosté à l&apos;<em style={{ color: 'var(--accent-lime)', fontStyle: 'italic' }}>IA</em></h3>
              <p className="bento-desc">Générez textes, objets de mail et visuels en une phrase. Suggestions contextuelles.</p>
              <div className="bento-visual" style={{ minHeight: 'auto' }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px', marginTop: '8px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-lime)', marginBottom: '6px' } as CSSProperties}>→ GÉNÉRATION</div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-200)', lineHeight: 1.5 } as CSSProperties}>&laquo;&nbsp;Écris un email de relance client au ton amical…&nbsp;&raquo;</div>
                </div>
              </div>
            </article>

            <article className="bento-card span-2 reveal">
              <div className="bento-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" /><path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <h3 className="bento-title">Banque d&apos;<em>images</em> libres</h3>
              <p className="bento-desc">Banque intégrée de visuels haute définition, classés par thème.</p>
              <div className="bento-visual" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', minHeight: 'auto', marginTop: '12px' }}>
                <div style={{ aspectRatio: '1', background: 'linear-gradient(135deg,#FFB547,#FF6B5B)', borderRadius: '4px' }}></div>
                <div style={{ aspectRatio: '1', background: 'linear-gradient(135deg,#4EF2B3,#2E5FF0)', borderRadius: '4px' }}></div>
                <div style={{ aspectRatio: '1', background: 'linear-gradient(135deg,#C6F24E,#FFB547)', borderRadius: '4px' }}></div>
                <div style={{ aspectRatio: '1', background: 'linear-gradient(135deg,#2E5FF0,#0B1E5C)', borderRadius: '4px' }}></div>
              </div>
            </article>

            <article className="bento-card span-3 accent reveal">
              <div className="bento-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M14 2v6h6M9 13h6M9 17h6M9 9h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <h3 className="bento-title" style={{ color: 'white' }}>Factures conformes <em style={{ color: 'var(--accent-lime)' }}>françaises</em></h3>
              <p className="bento-desc">6 types, calcul auto HT/TVA/TTC, Chorus Pro, Factur-X. Prêt pour l&apos;administration fiscale.</p>
              <div style={{ display: 'flex', gap: '6px', marginTop: '16px', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontFamily: 'var(--font-mono)' } as CSSProperties}>HT/TVA/TTC</span>
                <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontFamily: 'var(--font-mono)' } as CSSProperties}>Chorus Pro</span>
                <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontFamily: 'var(--font-mono)' } as CSSProperties}>Factur-X</span>
              </div>
            </article>

            <article className="bento-card span-3 reveal">
              <div className="bento-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 11h6M9 15h6M9 7h6M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
              </div>
              <h3 className="bento-title"><em>Contrats</em> tout-terrain</h3>
              <p className="bento-desc">B2C, B2B, Web/E-commerce, Appels d&apos;offre publics. Variables dynamiques, signature électronique, archivage.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
                <div style={{ padding: '12px', background: 'var(--ink-50)', borderRadius: '8px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--blue-600)', fontWeight: 600 } as CSSProperties}>B2C</div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-700)', marginTop: '2px' } as CSSProperties}>Particuliers</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--ink-50)', borderRadius: '8px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--blue-600)', fontWeight: 600 } as CSSProperties}>B2B</div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-700)', marginTop: '2px' } as CSSProperties}>Entreprises</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--ink-50)', borderRadius: '8px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--blue-600)', fontWeight: 600 } as CSSProperties}>WEB</div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-700)', marginTop: '2px' } as CSSProperties}>E-commerce / CGV</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--ink-50)', borderRadius: '8px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--blue-600)', fontWeight: 600 } as CSSProperties}>PUB</div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-700)', marginTop: '2px' } as CSSProperties}>Appels d&apos;offre</div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item reveal">
              <div className="stat-value"><em data-counter="20" data-suffix="+">20+</em></div>
              <div className="stat-label">Templates email premium prêts à l&apos;emploi</div>
            </div>
            <div className="stat-item reveal">
              <div className="stat-value"><em data-counter="10248">10 248</em></div>
              <div className="stat-label">Images haute définition libres de droits</div>
            </div>
            <div className="stat-item reveal">
              <div className="stat-value"><em data-counter="4">4</em><span style={{ color: 'var(--ink-400)' }}>s</span></div>
              <div className="stat-label">Pour générer un template complet avec l&apos;IA</div>
            </div>
            <div className="stat-item reveal">
              <div className="stat-value"><em data-counter="99" data-suffix=",9%">99,9%</em></div>
              <div className="stat-label">Uptime garanti sur notre infrastructure Europe</div>
            </div>
          </div>
        </div>
      </section>

      {/* SHOWCASE */}
      <section className="showcase">
        <div className="showcase-inner container">
          <div className="section-header reveal">
            <div className="section-eyebrow">→ Bibliothèque</div>
            <h2 className="section-title">
              20+ templates, zéro<br />
              <em>design fade</em>.
            </h2>
            <p className="section-subtitle">
              Nos designers ont créé chaque template pour qu&apos;il convertisse.
              Filtrez par catégorie, personnalisez, déployez.
            </p>
          </div>

          <div className="templates-tabs reveal">
            <button className="template-tab active" data-template-tab="all">Tout voir</button>
            <button className="template-tab" data-template-tab="newsletter">Newsletter</button>
            <button className="template-tab" data-template-tab="promo">Promo</button>
            <button className="template-tab" data-template-tab="onboarding">Onboarding</button>
            <button className="template-tab" data-template-tab="transac">Transactionnel</button>
            <button className="template-tab" data-template-tab="invoice">Factures</button>
            <button className="template-tab" data-template-tab="contract">Contrats</button>
          </div>

          <div className="templates-grid">
            <article className="template-item" data-template-item data-category="newsletter">
              <span className="template-badge">Nouveau</span>
              <div className="template-preview">
                <svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                  <rect width="400" height="500" fill="#FAFAFB" />
                  <rect x="24" y="24" width="352" height="100" rx="8" fill="#2E5FF0" />
                  <text x="50" y="74" fontFamily="Geist" fontSize="32" fill="white">Newsletter</text>
                  <text x="50" y="95" fontFamily="Geist Mono" fontSize="10" fill="white" opacity="0.8">#042 — MAI 2026</text>
                  <rect x="24" y="144" width="352" height="140" rx="8" fill="#E5E7EB" />
                  <path d="M100 200 L150 240 L220 210 L280 270 L320 260 L320 284 L100 284 Z" fill="#D1D5DB" />
                  <circle cx="170" cy="200" r="14" fill="#FFB547" />
                  <rect x="24" y="304" width="260" height="14" rx="4" fill="#111827" />
                  <rect x="24" y="328" width="352" height="5" rx="2" fill="#D1D5DB" />
                  <rect x="24" y="340" width="320" height="5" rx="2" fill="#D1D5DB" />
                  <rect x="24" y="352" width="300" height="5" rx="2" fill="#D1D5DB" />
                  <rect x="24" y="384" width="120" height="36" rx="18" fill="#111827" />
                  <text x="48" y="407" fontFamily="Geist" fontSize="12" fill="white" fontWeight="600">Lire la suite →</text>
                </svg>
              </div>
              <div className="template-info">
                <div>
                  <div className="template-name">Editorial Clean</div>
                  <div className="template-category">Newsletter</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
            </article>

            <article className="template-item" data-template-item data-category="promo">
              <div className="template-preview">
                <svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                  <rect width="400" height="500" fill="#111827" />
                  <rect x="24" y="24" width="352" height="200" rx="8" fill="#C6F24E" />
                  <text x="200" y="110" fontFamily="Geist" fontSize="48" fill="#111827" textAnchor="middle" fontStyle="italic">-50%</text>
                  <text x="200" y="150" fontFamily="Geist" fontSize="14" fill="#111827" textAnchor="middle" fontWeight="600">BLACK FRIDAY</text>
                  <text x="200" y="180" fontFamily="Geist Mono" fontSize="10" fill="#111827" textAnchor="middle" opacity="0.7">Jusqu&apos;au 30 novembre</text>
                  <rect x="24" y="244" width="280" height="14" rx="4" fill="white" />
                  <rect x="24" y="268" width="352" height="5" rx="2" fill="#6B7280" />
                  <rect x="24" y="280" width="320" height="5" rx="2" fill="#6B7280" />
                  <rect x="24" y="312" width="160" height="40" rx="20" fill="#C6F24E" />
                  <text x="48" y="337" fontFamily="Geist" fontSize="13" fill="#111827" fontWeight="700">J&apos;en profite maintenant</text>
                </svg>
              </div>
              <div className="template-info">
                <div>
                  <div className="template-name">Black Friday Bold</div>
                  <div className="template-category">Promo</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
            </article>

            <article className="template-item" data-template-item data-category="onboarding">
              <div className="template-preview">
                <svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                  <rect width="400" height="500" fill="white" />
                  <rect x="24" y="40" width="48" height="48" rx="12" fill="#2E5FF0" />
                  <text x="42" y="72" fontFamily="Geist" fontSize="22" fill="white" fontWeight="700">✦</text>
                  <text x="24" y="130" fontFamily="Geist" fontSize="30" fill="#111827">Bienvenue 👋</text>
                  <rect x="24" y="150" width="280" height="5" rx="2" fill="#D1D5DB" />
                  <rect x="24" y="162" width="240" height="5" rx="2" fill="#D1D5DB" />
                  <rect x="24" y="200" width="352" height="60" rx="8" fill="#F3F4F6" stroke="#E5E7EB" />
                  <circle cx="54" cy="230" r="14" fill="#2E5FF0" />
                  <text x="48" y="235" fontFamily="Geist" fontSize="14" fill="white" fontWeight="700">1</text>
                  <rect x="82" y="220" width="160" height="8" rx="4" fill="#111827" />
                  <rect x="82" y="236" width="240" height="5" rx="2" fill="#6B7280" />
                  <rect x="24" y="275" width="352" height="60" rx="8" fill="#F3F4F6" stroke="#E5E7EB" />
                  <circle cx="54" cy="305" r="14" fill="#2E5FF0" />
                  <text x="48" y="310" fontFamily="Geist" fontSize="14" fill="white" fontWeight="700">2</text>
                  <rect x="82" y="295" width="180" height="8" rx="4" fill="#111827" />
                  <rect x="82" y="311" width="220" height="5" rx="2" fill="#6B7280" />
                  <rect x="24" y="365" width="140" height="40" rx="20" fill="#111827" />
                  <text x="48" y="390" fontFamily="Geist" fontSize="12" fill="white" fontWeight="600">Commencer →</text>
                </svg>
              </div>
              <div className="template-info">
                <div>
                  <div className="template-name">Welcome Steps</div>
                  <div className="template-category">Onboarding</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
            </article>

            <article className="template-item" data-template-item data-category="transac">
              <div className="template-preview">
                <svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                  <rect width="400" height="500" fill="#FAFAFB" />
                  <rect x="24" y="24" width="352" height="48" rx="8" fill="#10B981" />
                  <text x="48" y="54" fontFamily="Geist" fontSize="14" fill="white" fontWeight="600">✓ Paiement confirmé</text>
                  <text x="24" y="120" fontFamily="Geist" fontSize="28" fill="#111827">Merci, Alexandre !</text>
                  <text x="24" y="150" fontFamily="Geist Mono" fontSize="11" fill="#6B7280">COMMANDE #TB-48291</text>
                  <rect x="24" y="175" width="352" height="1" fill="#E5E7EB" />
                  <rect x="24" y="195" width="120" height="8" rx="4" fill="#111827" />
                  <rect x="300" y="195" width="76" height="8" rx="4" fill="#111827" />
                  <rect x="24" y="225" width="160" height="5" rx="2" fill="#6B7280" />
                  <rect x="320" y="225" width="56" height="5" rx="2" fill="#6B7280" />
                  <rect x="24" y="255" width="140" height="5" rx="2" fill="#6B7280" />
                  <rect x="320" y="255" width="56" height="5" rx="2" fill="#6B7280" />
                  <rect x="24" y="285" width="352" height="1" fill="#E5E7EB" />
                  <rect x="24" y="305" width="60" height="10" rx="4" fill="#111827" />
                  <rect x="320" y="305" width="56" height="10" rx="4" fill="#111827" />
                </svg>
              </div>
              <div className="template-info">
                <div>
                  <div className="template-name">Order Confirmation</div>
                  <div className="template-category">Transactionnel</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
            </article>

            <article className="template-item" data-template-item data-category="invoice">
              <span className="template-badge">Facture</span>
              <div className="template-preview">
                <svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                  <rect width="400" height="500" fill="white" />
                  <text x="24" y="60" fontFamily="Geist" fontSize="28" fill="#111827">FACTURE</text>
                  <text x="24" y="82" fontFamily="Geist Mono" fontSize="11" fill="#6B7280">N° 2026-0481</text>
                  <rect x="280" y="32" width="96" height="32" rx="6" fill="#111827" />
                  <text x="328" y="53" fontFamily="Geist" fontSize="11" fill="white" textAnchor="middle" fontWeight="600">ACME Corp.</text>
                  <rect x="24" y="110" width="1" height="380" fill="#E5E7EB" />
                  <rect x="24" y="110" width="352" height="1" fill="#E5E7EB" />
                  <text x="24" y="132" fontFamily="Geist Mono" fontSize="9" fill="#6B7280">ÉMETTEUR</text>
                  <rect x="24" y="140" width="120" height="5" rx="2" fill="#111827" />
                  <rect x="24" y="152" width="160" height="4" rx="2" fill="#6B7280" />
                  <rect x="24" y="162" width="140" height="4" rx="2" fill="#6B7280" />
                  <text x="200" y="132" fontFamily="Geist Mono" fontSize="9" fill="#6B7280">CLIENT</text>
                  <rect x="200" y="140" width="140" height="5" rx="2" fill="#111827" />
                  <rect x="200" y="152" width="160" height="4" rx="2" fill="#6B7280" />
                  <rect x="200" y="162" width="120" height="4" rx="2" fill="#6B7280" />
                  <rect x="24" y="195" width="352" height="1" fill="#E5E7EB" />
                  <text x="24" y="220" fontFamily="Geist Mono" fontSize="9" fill="#6B7280">DESCRIPTION</text>
                  <text x="240" y="220" fontFamily="Geist Mono" fontSize="9" fill="#6B7280">QTÉ</text>
                  <text x="290" y="220" fontFamily="Geist Mono" fontSize="9" fill="#6B7280">PU HT</text>
                  <text x="340" y="220" fontFamily="Geist Mono" fontSize="9" fill="#6B7280">TOTAL</text>
                  <rect x="24" y="245" width="160" height="6" rx="2" fill="#111827" />
                  <rect x="240" y="246" width="16" height="5" rx="2" fill="#111827" />
                  <rect x="290" y="246" width="30" height="5" rx="2" fill="#111827" />
                  <rect x="340" y="246" width="36" height="6" rx="2" fill="#111827" />
                  <rect x="24" y="270" width="140" height="6" rx="2" fill="#111827" />
                  <rect x="24" y="310" width="352" height="1" fill="#E5E7EB" />
                  <text x="240" y="340" fontFamily="Geist Mono" fontSize="10" fill="#6B7280">TOTAL HT</text>
                  <rect x="320" y="333" width="56" height="8" rx="2" fill="#374151" />
                  <text x="240" y="360" fontFamily="Geist Mono" fontSize="10" fill="#6B7280">TVA 20%</text>
                  <rect x="320" y="353" width="40" height="8" rx="2" fill="#374151" />
                  <text x="240" y="390" fontFamily="Geist" fontSize="12" fill="#111827" fontWeight="700">TOTAL TTC</text>
                  <rect x="320" y="380" width="56" height="14" rx="2" fill="#2E5FF0" />
                </svg>
              </div>
              <div className="template-info">
                <div>
                  <div className="template-name">Facture Standard FR</div>
                  <div className="template-category">Facture • HT/TVA/TTC</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
            </article>

            <article className="template-item" data-template-item data-category="contract">
              <span className="template-badge">Contrat</span>
              <div className="template-preview">
                <svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                  <rect width="400" height="500" fill="#FAFAFB" />
                  <text x="200" y="60" fontFamily="Geist" fontSize="24" fill="#111827" textAnchor="middle">Contrat de prestation</text>
                  <text x="200" y="82" fontFamily="Geist Mono" fontSize="10" fill="#6B7280" textAnchor="middle">B2B — SERVICES</text>
                  <rect x="120" y="95" width="160" height="1" fill="#111827" />
                  <text x="24" y="130" fontFamily="Geist" fontSize="10" fill="#111827" fontWeight="700">ARTICLE 1 — OBJET</text>
                  <rect x="24" y="140" width="352" height="4" rx="2" fill="#9CA3AF" />
                  <rect x="24" y="150" width="320" height="4" rx="2" fill="#9CA3AF" />
                  <rect x="24" y="160" width="340" height="4" rx="2" fill="#9CA3AF" />
                  <rect x="24" y="170" width="280" height="4" rx="2" fill="#9CA3AF" />
                  <text x="24" y="200" fontFamily="Geist" fontSize="10" fill="#111827" fontWeight="700">ARTICLE 2 — DURÉE</text>
                  <rect x="24" y="210" width="352" height="4" rx="2" fill="#9CA3AF" />
                  <rect x="24" y="220" width="300" height="4" rx="2" fill="#9CA3AF" />
                  <text x="24" y="250" fontFamily="Geist" fontSize="10" fill="#111827" fontWeight="700">ARTICLE 3 — CONFIDENTIALITÉ</text>
                  <rect x="24" y="260" width="352" height="4" rx="2" fill="#9CA3AF" />
                  <rect x="24" y="270" width="330" height="4" rx="2" fill="#9CA3AF" />
                  <rect x="24" y="280" width="310" height="4" rx="2" fill="#9CA3AF" />
                  <rect x="24" y="310" width="160" height="1" fill="#E5E7EB" />
                  <rect x="216" y="310" width="160" height="1" fill="#E5E7EB" />
                  <text x="24" y="330" fontFamily="Geist Mono" fontSize="9" fill="#6B7280">LE PRESTATAIRE</text>
                  <text x="216" y="330" fontFamily="Geist Mono" fontSize="9" fill="#6B7280">LE CLIENT</text>
                  <path d="M30 355 Q 60 345 90 360 T 150 355" stroke="#2E5FF0" strokeWidth="1.5" fill="none" />
                  <path d="M226 360 Q 256 348 286 365 T 346 360" stroke="#2E5FF0" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
              <div className="template-info">
                <div>
                  <div className="template-name">Contrat B2B Services</div>
                  <div className="template-category">Contrat • NDA inclus</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
            </article>

            <article className="template-item" data-template-item data-category="newsletter">
              <div className="template-preview">
                <svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                  <rect width="400" height="500" fill="#FFB547" />
                  <text x="24" y="80" fontFamily="Geist" fontSize="40" fill="#111827" fontStyle="italic">Weekly</text>
                  <text x="24" y="115" fontFamily="Geist" fontSize="40" fill="#111827">Digest</text>
                  <rect x="24" y="140" width="80" height="2" fill="#111827" />
                  <rect x="24" y="170" width="352" height="100" rx="4" fill="#111827" />
                  <text x="40" y="210" fontFamily="Geist" fontSize="16" fill="#FFB547" fontWeight="700">3 articles du jour</text>
                  <rect x="40" y="226" width="240" height="4" rx="2" fill="white" opacity="0.6" />
                  <rect x="40" y="238" width="200" height="4" rx="2" fill="white" opacity="0.6" />
                  <rect x="24" y="290" width="180" height="5" rx="2" fill="#111827" />
                  <rect x="24" y="305" width="320" height="4" rx="2" fill="#111827" opacity="0.7" />
                  <rect x="24" y="315" width="280" height="4" rx="2" fill="#111827" opacity="0.7" />
                  <rect x="24" y="345" width="180" height="5" rx="2" fill="#111827" />
                  <rect x="24" y="360" width="340" height="4" rx="2" fill="#111827" opacity="0.7" />
                </svg>
              </div>
              <div className="template-info">
                <div>
                  <div className="template-name">Weekly Digest</div>
                  <div className="template-category">Newsletter</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
            </article>

            <article className="template-item" data-template-item data-category="promo">
              <div className="template-preview">
                <svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="g8" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2E5FF0" />
                      <stop offset="100%" stopColor="#0B1E5C" />
                    </linearGradient>
                  </defs>
                  <rect width="400" height="500" fill="url(#g8)" />
                  <circle cx="350" cy="80" r="60" fill="#C6F24E" opacity="0.2" />
                  <circle cx="50" cy="400" r="80" fill="#FF6B5B" opacity="0.2" />
                  <text x="200" y="180" fontFamily="Geist" fontSize="48" fill="white" textAnchor="middle" fontStyle="italic">Nouveau.</text>
                  <rect x="150" y="200" width="100" height="2" fill="#C6F24E" />
                  <text x="200" y="240" fontFamily="Geist" fontSize="13" fill="white" textAnchor="middle" opacity="0.8">Notre nouvelle collection arrive</text>
                  <rect x="120" y="290" width="160" height="48" rx="24" fill="#C6F24E" />
                  <text x="200" y="320" fontFamily="Geist" fontSize="13" fill="#111827" textAnchor="middle" fontWeight="700">Découvrir →</text>
                </svg>
              </div>
              <div className="template-info">
                <div>
                  <div className="template-name">Product Launch</div>
                  <div className="template-category">Promo</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
            </article>
          </div>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-16)' } as CSSProperties} className="reveal">
            <a href="/register" className="btn btn-accent btn-lg" data-magnet>
              Explorer les templates
              <svg className="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">→ Comment ça marche</div>
            <h2 className="section-title">
              De l&apos;<em>idée</em> au document,<br />
              en 4 étapes.
            </h2>
          </div>

          <div className="steps-wrapper">
            <ol className="steps-list reveal">
              <li className="step active" data-step="1">
                <span className="step-num">1</span>
                <div className="step-title">Choisissez un template ou partez de zéro</div>
                <p className="step-desc">20+ templates pro ou un canvas vierge. Sections modulaires disponibles à la carte.</p>
              </li>
              <li className="step" data-step="2">
                <span className="step-num">2</span>
                <div className="step-title">L&apos;IA écrit, vous ajustez</div>
                <p className="step-desc">Objets, textes, CTA — générés en fonction de votre ton. Vous gardez le contrôle.</p>
              </li>
              <li className="step" data-step="3">
                <span className="step-num">3</span>
                <div className="step-title">Ajoutez images &amp; variables</div>
                <p className="step-desc">Des milliers de visuels libres. Variables dynamiques {'{{client_nom}}'}, {'{{montant_ht}}'}…</p>
              </li>
              <li className="step" data-step="4">
                <span className="step-num">4</span>
                <div className="step-title">Exportez ou synchronisez</div>
                <p className="step-desc">HTML, PDF, MJML, JSON. Ou push direct vers Brevo, Mailchimp, HubSpot, Chorus Pro…</p>
              </li>
            </ol>

            <div className="steps-visual reveal">
              <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                <defs>
                  <linearGradient id="blueG" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2E5FF0" />
                    <stop offset="100%" stopColor="#1738A8" />
                  </linearGradient>
                </defs>
                <rect width="500" height="500" fill="#FAFAFB" rx="20" />
                <rect x="50" y="60" width="400" height="380" rx="12" fill="white" stroke="#E5E7EB" />
                <rect x="50" y="60" width="400" height="60" rx="12" fill="url(#blueG)" />
                <rect x="50" y="108" width="400" height="12" fill="url(#blueG)" />
                <rect x="80" y="80" width="120" height="10" rx="5" fill="white" opacity="0.9" />
                <rect x="80" y="96" width="80" height="6" rx="3" fill="white" opacity="0.6" />
                <rect x="80" y="150" width="340" height="140" rx="8" fill="#F3F4F6" />
                <path d="M150 210 L200 240 L260 220 L320 260 L380 250 L380 290 L120 290 Z" fill="#D1D5DB" />
                <circle cx="200" cy="210" r="12" fill="#FFB547" />
                <rect x="80" y="310" width="200" height="12" rx="4" fill="#111827" />
                <rect x="80" y="332" width="340" height="5" rx="2" fill="#D1D5DB" />
                <rect x="80" y="344" width="300" height="5" rx="2" fill="#D1D5DB" />
                <rect x="80" y="376" width="120" height="34" rx="17" fill="#111827" />
                <g transform="translate(340, 180)">
                  <circle r="32" fill="#111827" />
                  <text x="0" y="-2" fontFamily="Geist Mono" fontSize="9" fill="#C6F24E" textAnchor="middle" fontWeight="700">✦ IA</text>
                  <text x="0" y="12" fontFamily="Geist" fontSize="10" fill="white" textAnchor="middle">4 sec</text>
                </g>
                <path d="M340 212 L320 260" stroke="#111827" strokeWidth="1.5" strokeDasharray="4 4" />
                <g transform="translate(460, 250)">
                  <circle r="20" fill="white" stroke="#E5E7EB" />
                  <path d="M-6 -4 L2 4 L8 -6" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING TEASER — real Winaity plans */}
      <section className="section pricing-teaser" id="pricing">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">→ Tarifs simples</div>
            <h2 className="section-title">
              Le bon outil,<br />
              au <em>bon prix</em>.
            </h2>
            <p className="section-subtitle">Commencez gratuitement, sans carte bancaire. Évoluez quand votre volume l&apos;exige.</p>
          </div>

          <div className="pricing-teaser-grid stagger">
            <article className="pricing-teaser-card reveal">
              <div className="pricing-teaser-tag">Gratuit</div>
              <div className="pricing-teaser-price">
                <span className="pricing-teaser-amount">0</span>
                <span className="pricing-teaser-currency">€</span>
              </div>
              <p className="pricing-teaser-tagline">Pour découvrir la plateforme.</p>
              <ul className="pricing-teaser-features">
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg> 3 templates email</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg> Éditeur email complet</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg> Export PDF &amp; HTML</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg> 1 interaction assistant IA</li>
              </ul>
              <a href="/register" className="pricing-teaser-cta">Commencer →</a>
            </article>

            <article className="pricing-teaser-card pricing-teaser-card--featured reveal">
              <div className="pricing-teaser-badge">★ Le plus choisi</div>
              <div className="pricing-teaser-tag">Pro</div>
              <div className="pricing-teaser-price">
                <span className="pricing-teaser-amount">25</span>
                <span className="pricing-teaser-currency">€</span>
                <span className="pricing-teaser-period">/mois</span>
              </div>
              <p className="pricing-teaser-tagline">Pour les professionnels et les TPE.</p>
              <ul className="pricing-teaser-features">
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg> Usage illimité — emails, contrats, factures</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg> Interactions IA illimitées</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg> Tous les éditeurs (email, contrat, facture, RCS, SMS)</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg> Export &amp; envoi de tests</li>
              </ul>
              <a href="/register" className="pricing-teaser-cta pricing-teaser-cta--accent">Passer à Pro →</a>
            </article>

            <article className="pricing-teaser-card reveal">
              <div className="pricing-teaser-tag">Pro Organisation</div>
              <div className="pricing-teaser-price">
                <span className="pricing-teaser-amount">55</span>
                <span className="pricing-teaser-currency">€</span>
                <span className="pricing-teaser-period">/mois</span>
              </div>
              <p className="pricing-teaser-tagline">Pour les équipes et les structures.</p>
              <ul className="pricing-teaser-features">
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg> Tout ce qui est inclus dans Pro</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg> Invitez et gérez plusieurs utilisateurs</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg> Intégrations CRM &amp; outils externes</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg> Accès API &amp; clés d&apos;intégration</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg> Gestion d&apos;équipe et des rôles</li>
              </ul>
              <a href="/contact" className="pricing-teaser-cta">Nous contacter →</a>
            </article>
          </div>

          <div className="pricing-teaser-footer reveal">
            <span>Voir tous les plans en détail →</span>
            <a href="/pricing">Comparatif complet →</a>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="section" style={{ background: 'var(--ink-50)' } as CSSProperties}>
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">→ Pour qui ?</div>
            <h2 className="section-title">
              Conçu pour les équipes<br />
              qui n&apos;ont pas le temps.
            </h2>
          </div>

          <div className="use-cases-grid">
            <article className="use-case-card reveal">
              <div className="use-case-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <h3 className="use-case-title">Équipes <em style={{ fontStyle: 'italic', color: 'var(--blue-600)' }}>marketing</em></h3>
              <p className="use-case-desc">Déployez newsletters et campagnes promo en minutes. Maintenez la cohérence de marque sur tous les canaux.</p>
              <div className="use-case-tags">
                <span className="use-case-tag">Newsletter</span>
                <span className="use-case-tag">A/B Test</span>
                <span className="use-case-tag">Segmentation</span>
              </div>
            </article>

            <article className="use-case-card reveal">
              <div className="use-case-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" /><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <h3 className="use-case-title">Freelances &amp; <em style={{ fontStyle: 'italic', color: 'var(--blue-600)' }}>TPE/PME</em></h3>
              <p className="use-case-desc">Factures conformes, devis, contrats clients. Tout ce qu&apos;il faut pour facturer vite et bien, sans expert-comptable pour chaque document.</p>
              <div className="use-case-tags">
                <span className="use-case-tag">Factures FR</span>
                <span className="use-case-tag">Devis</span>
                <span className="use-case-tag">Chorus Pro</span>
              </div>
            </article>

            <article className="use-case-card reveal">
              <div className="use-case-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M9 9h6v6H9z" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <h3 className="use-case-title">Agences <em style={{ fontStyle: 'italic', color: 'var(--blue-600)' }}>digitales</em></h3>
              <p className="use-case-desc">Multi-tenants, white-label possible. Gérez les templates de dizaines de clients dans une seule interface.</p>
              <div className="use-case-tags">
                <span className="use-case-tag">Multi-compte</span>
                <span className="use-case-tag">White-label</span>
                <span className="use-case-tag">API</span>
              </div>
            </article>

            <article className="use-case-card reveal">
              <div className="use-case-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M20 7L10 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h3 className="use-case-title">Services <em style={{ fontStyle: 'italic', color: 'var(--blue-600)' }}>juridiques</em></h3>
              <p className="use-case-desc">Contrats B2C, B2B, e-commerce, appels d&apos;offre publics. Variables dynamiques, clauses conditionnelles, signature électronique.</p>
              <div className="use-case-tags">
                <span className="use-case-tag">Contrats</span>
                <span className="use-case-tag">eIDAS</span>
                <span className="use-case-tag">RGPD</span>
              </div>
            </article>

            <article className="use-case-card reveal">
              <div className="use-case-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" /><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M17 11h4M19 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <h3 className="use-case-title">Équipes <em style={{ fontStyle: 'italic', color: 'var(--blue-600)' }}>sales</em></h3>
              <p className="use-case-desc">Emails d&apos;outreach personnalisés, relances, closing. Synchronisé avec votre CRM — à chaque contact, le bon template.</p>
              <div className="use-case-tags">
                <span className="use-case-tag">HubSpot</span>
                <span className="use-case-tag">Pipedrive</span>
                <span className="use-case-tag">Salesforce</span>
              </div>
            </article>

            <article className="use-case-card reveal">
              <div className="use-case-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <h3 className="use-case-title">Fonction <em style={{ fontStyle: 'italic', color: 'var(--blue-600)' }}>finance</em></h3>
              <p className="use-case-desc">Factures récurrentes, acomptes, avoirs. Numérotation auto, export comptable, archivage 10 ans conforme.</p>
              <div className="use-case-tags">
                <span className="use-case-tag">Factur-X</span>
                <span className="use-case-tag">Sage / EBP</span>
                <span className="use-case-tag">Archives 10 ans</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">→ Ils en parlent</div>
            <h2 className="section-title">
              Des équipes nous font<br />
              <em>confiance</em>.
            </h2>
          </div>

          <div className="testimonials-grid">
            <article className="testimonial-card featured reveal">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-quote">&laquo;&nbsp;Le seul builder qui comprend vraiment la différence entre un mail de newsletter et une facture B2B avec pénalités de retard. L&apos;IA est bluffante, l&apos;export PDF impeccable. Adopté en 2 jours par toute l&apos;équipe.&nbsp;&raquo;</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">CM</div>
                <div>
                  <div className="testimonial-name">Camille Marchand</div>
                  <div className="testimonial-role">Head of Ops — Kairo Studio</div>
                </div>
              </div>
            </article>

            <article className="testimonial-card reveal">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-quote">&laquo;&nbsp;On a divisé par 5 le temps de production de nos newsletters. L&apos;intégration avec Brevo est transparente.&nbsp;&raquo;</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: 'linear-gradient(135deg, #FFB547, #FF6B5B)' }}>JR</div>
                <div>
                  <div className="testimonial-name">Julien Richter</div>
                  <div className="testimonial-role">CMO — Northwave</div>
                </div>
              </div>
            </article>

            <article className="testimonial-card reveal">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-quote">&laquo;&nbsp;Enfin un outil français qui gère Chorus Pro correctement. Factur-X natif, c&apos;est un game-changer.&nbsp;&raquo;</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: 'linear-gradient(135deg, #C6F24E, #4EF2B3)', color: '#111827' }}>SL</div>
                <div>
                  <div className="testimonial-name">Sophie Lemaire</div>
                  <div className="testimonial-role">DAF — Groupe Altheys</div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta-final">
        <div className="container cta-final-inner">
          <div className="reveal">
            <div className="section-eyebrow" style={{ justifyContent: 'center', display: 'inline-flex' }}>→ Derniers mots</div>
            <h2>
              Un essai, puis vous<br />
              <em>ne reviendrez plus</em><br />
              en arrière.
            </h2>
            <p>Démarrez gratuitement. Sans engagement. Sans carte bancaire.<br />Testez toute la puissance de l&apos;outil.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' } as CSSProperties}>
              <a href="/register" className="btn btn-primary btn-xl" data-magnet>
                Créer mon compte
                <svg className="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </a>
              <a href="/demo" className="btn btn-secondary btn-xl">
                Réserver une démo
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
