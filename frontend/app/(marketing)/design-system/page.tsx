// Build withUs design system — living styleguide (marketing). TOC anchors use the
// global smooth-scroll from MarketingFX.

function Swatch({ hex, name }: { hex: string; name: string }) {
  return (
    <div className="ds-swatch">
      <div className="ds-swatch-preview" style={{ background: hex }} />
      <div className="ds-swatch-info">
        <div className="ds-swatch-name">{name}</div>
        <div className="ds-swatch-hex">{hex}</div>
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  const blues: Array<[string, string]> = [
    ['#EEF2FF', 'Indigo 50'], ['#E0E7FF', 'Indigo 100'], ['#C7D2FE', 'Indigo 200'], ['#A5B4FC', 'Indigo 300'],
    ['#818CF8', 'Indigo 400'], ['#6366F1', 'Indigo 500 · Signature'], ['#4F46E5', 'Indigo 600 · Primary'], ['#4338CA', 'Indigo 700'],
    ['#3730A3', 'Indigo 800'], ['#312E81', 'Indigo 900'], ['#0F0E26', 'Indigo 950 · Nightfall'],
  ];
  const inks: Array<[string, string]> = [
    ['#FFFFFF', 'Ink 0'], ['#F8FAFC', 'Ink 50'], ['#F1F5F9', 'Ink 100'], ['#E2E8F0', 'Ink 200'],
    ['#CBD5E1', 'Ink 300'], ['#94A3B8', 'Ink 400'], ['#64748B', 'Ink 500'], ['#475569', 'Ink 600'],
    ['#334155', 'Ink 700'], ['#1E293B', 'Ink 800'], ['#0F172A', 'Ink 900'], ['#020617', 'Ink 950 · Obsidian'],
  ];
  const accents: Array<[string, string]> = [
    ['#F59E0B', 'Amber · Solar CTA'], ['#F43F5E', 'Coral'], ['#FBBF24', 'Sunburst'], ['#10B981', 'Mint · Success'],
  ];
  const spacing: Array<[string, string, number]> = [
    ['--space-1', '4px', 4], ['--space-2', '8px', 8], ['--space-3', '12px', 12], ['--space-4', '16px', 16],
    ['--space-5', '20px', 20], ['--space-6', '24px', 24], ['--space-8', '32px', 32], ['--space-10', '40px', 40],
    ['--space-12', '48px', 48], ['--space-16', '64px', 64], ['--space-20', '80px', 80], ['--space-24', '96px', 96],
  ];

  return (
    <main>
      {/* Hero */}
      <section className="ds-hero">
        <div className="container">
          <div className="ds-hero-inner">
            <div className="eyebrow" style={{ marginBottom: 'var(--space-4)', justifyContent: 'center', display: 'flex' }}>
              <span>CHARTE GRAPHIQUE · v1.0 · 2026</span>
            </div>
            <h1>Le langage visuel de <em>Build withUs</em></h1>
            <p>Un système de design vivant, pensé pour créer des interfaces honnêtes, lisibles et durables. Chaque token, chaque composant, chaque pixel compte.</p>
            <div className="ds-hero-meta">
              <span>Palette complète</span>
              <span>Typographie Geist</span>
              <span>Composants réutilisables</span>
              <span>Mise à jour 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* TOC */}
      <nav className="ds-toc">
        <a href="#foundations">Fondations</a>
        <a href="#colors">Couleurs</a>
        <a href="#typography">Typographie</a>
        <a href="#spacing">Espacement</a>
        <a href="#radius">Rayons</a>
        <a href="#shadows">Ombres</a>
        <a href="#components">Composants</a>
        <a href="#motion">Motion</a>
        <a href="#icons">Icônes</a>
        <a href="#logo">Logo</a>
        <a href="#voice">Voix</a>
      </nav>

      {/* Foundations */}
      <section className="ds-section" id="foundations">
        <div className="container">
          <div className="ds-section-header">
            <div className="ds-section-number">01 — FONDATIONS</div>
            <h2 className="ds-section-title">Nos <em>principes</em></h2>
            <p className="ds-section-desc">Quatre principes guident chaque décision de design. Ils nous permettent de rester cohérents à mesure que le produit évolue.</p>
          </div>
          <div className="ds-component-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              ['Clarté', "La hiérarchie d'information guide toujours l'œil. Aucun élément décoratif ne doit distraire de l'action à accomplir."],
              ['Honnêteté', 'Pas de dark patterns. Pas de faux boutons. Les interactions font ce qu\'elles promettent, sans artifice ni détour.'],
              ['Artisanat', "Chaque pixel est intentionnel. Le grain, l'italique, la courbe d'easing — tout est choisi, rien n'est généré au hasard."],
              ['Pérennité', 'On privilégie les choix qui vieillissent bien. Pas de tendance éphémère : du fond, de la structure, du sens.'],
            ].map(([t, d]) => (
              <div className="ds-component-card" key={t}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 400, marginBottom: 'var(--space-3)', color: 'var(--ink-950)' }}>{t}</h4>
                <p style={{ fontSize: '0.9375rem', color: 'var(--ink-600)', lineHeight: 1.6 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Colors */}
      <section className="ds-section" id="colors">
        <div className="container">
          <div className="ds-section-header">
            <div className="ds-section-number">02 — COULEURS</div>
            <h2 className="ds-section-title">Palette <em>complète</em></h2>
            <p className="ds-section-desc">L&apos;Indigo électrique est notre signature — il porte la confiance, la précision, l&apos;infrastructure et la créativité. Il se combine avec une échelle d&apos;encre neutre et quatre accents fonctionnels.</p>
          </div>

          <div className="ds-color-family">
            <div className="ds-color-family-title"><h3>Indigo signature</h3><span>Signature de marque — CTAs, liens, emphase</span></div>
            <div className="ds-swatches">{blues.map(([hex, name]) => <Swatch key={name} hex={hex} name={name} />)}</div>
          </div>
          <div className="ds-color-family">
            <div className="ds-color-family-title"><h3>Encre — neutres</h3><span>Texte, arrière-plans, bordures, séparateurs</span></div>
            <div className="ds-swatches">{inks.map(([hex, name]) => <Swatch key={name} hex={hex} name={name} />)}</div>
          </div>
          <div className="ds-color-family">
            <div className="ds-color-family-title"><h3>Accents</h3><span>Highlights, états, illustrations</span></div>
            <div className="ds-swatches">{accents.map(([hex, name]) => <Swatch key={name} hex={hex} name={name} />)}</div>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="ds-section" id="typography">
        <div className="container">
          <div className="ds-section-header">
            <div className="ds-section-number">03 — TYPOGRAPHIE</div>
            <h2 className="ds-section-title">Une seule famille, <em>deux variantes</em></h2>
            <p className="ds-section-desc">Geist pour tout : display, corps de texte, UI. Geist Mono pour le code et les eyebrows. La cohérence par la simplicité.</p>
          </div>

          <div className="ds-fonts-grid">
            <div className="ds-font-card font-sans">
              <div className="ds-font-name">Geist</div>
              <div className="ds-font-specimen" style={{ fontFamily: "'Geist', sans-serif", fontWeight: 700 }}>Aa</div>
              <div className="ds-font-usage">Display, corps de texte, UI, boutons. Sans-serif moderne. Lisibilité maximale, formes nettes, optimisée pour l&apos;écran.</div>
              <div className="ds-font-weights">
                <span className="ds-font-weight">Light 300</span>
                <span className="ds-font-weight">Regular 400</span>
                <span className="ds-font-weight">Medium 500</span>
                <span className="ds-font-weight">Semibold 600</span>
                <span className="ds-font-weight">Bold 700</span>
              </div>
            </div>
            <div className="ds-font-card font-mono">
              <div className="ds-font-name">Geist Mono</div>
              <div className="ds-font-specimen" style={{ fontFamily: "'Geist Mono', monospace", fontWeight: 600 }}>Aa</div>
              <div className="ds-font-usage">Eyebrows, code, données chiffrées, badges techniques. Monospace au design soigné, parfait en majuscules avec letter-spacing 0.14em.</div>
              <div className="ds-font-weights">
                <span className="ds-font-weight">Regular 400</span>
                <span className="ds-font-weight">Medium 500</span>
                <span className="ds-font-weight">Semibold 600</span>
              </div>
            </div>
            <div className="ds-font-card font-serif">
              <div className="ds-font-name">Italique</div>
              <div className="ds-font-specimen">Aa</div>
              <div className="ds-font-usage">L&apos;italique de Geist porte l&apos;emphase et la personnalité de la marque, dans les titres et les mots-clés.</div>
              <div className="ds-font-weights">
                <span className="ds-font-weight">Italic 400</span>
                <span className="ds-font-weight">Italic 600</span>
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 'var(--space-12) 0 var(--space-4)', paddingTop: 'var(--space-8)', borderTop: '1px solid var(--ink-200)' }}>Échelle typographique</h3>
          <div className="ds-type-stack">
            {[
              ['Display Hero', 'Geist Bold · 96px · 0.98', 'display-hero', 'On crée des outils honnêtes'],
              ['Display 1', 'Geist Bold · 64px · 1', 'display-1', 'Une révolution calme'],
              ['Display 2', 'Geist Semibold · 48px', 'display-2', 'Titre de section'],
              ['Heading 1', 'Geist Semibold · 32px', 'heading-1', 'Titre de page ou module'],
              ['Heading 2', 'Geist Semibold · 24px', 'heading-2', 'Titre de carte ou groupe'],
              ['Heading 3', 'Geist Semibold · 20px', 'heading-3', 'Sous-titre ou label fort'],
              ['Body Large', 'Geist Regular · 18px', 'body-lg', 'Introduction ou paragraphe principal, utilisé sous un titre de section.'],
              ['Body', 'Geist Regular · 16px', 'body', 'Corps de texte standard. Optimisé pour le confort de lecture sur écran.'],
              ['Body Small', 'Geist Regular · 14px', 'body-sm', 'Texte secondaire, notes, descriptions courtes.'],
              ['Caption', 'Geist Regular · 12px', 'caption', 'Métadonnées, légendes, mentions légales, horodatages.'],
              ['Mono', 'Geist Mono · 14px', 'mono', 'const invoice = { total: 1250.00 };'],
              ['Eyebrow', 'Geist Mono · 12px · UPPER', 'eyebrow-sample', 'CONSTRUIRE EN CONFIANCE — DEPUIS 2024'],
            ].map(([name, spec, cls, sample]) => (
              <div className="ds-type-row" key={name}>
                <div className="ds-type-label">
                  <span className="ds-type-label-name">{name}</span>
                  <span className="ds-type-label-spec">{spec}</span>
                </div>
                <div className={`ds-type-sample ${cls}`}>{sample}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spacing */}
      <section className="ds-section" id="spacing">
        <div className="container">
          <div className="ds-section-header">
            <div className="ds-section-number">04 — ESPACEMENT</div>
            <h2 className="ds-section-title">Échelle <em>rythmée</em> en base 4</h2>
            <p className="ds-section-desc">Toutes les distances dérivent d&apos;une unité de 4px. Cette contrainte force des compositions cohérentes et un rythme visuel prévisible.</p>
          </div>
          <div className="ds-spacing-stack">
            {spacing.map(([token, value, w]) => (
              <div className="ds-spacing-row" key={token}>
                <div className="ds-spacing-token">{token}</div>
                <div className="ds-spacing-value">{value}</div>
                <div className="ds-spacing-bar" style={{ width: `${w}px` }} />
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 'var(--space-12) 0 var(--space-4)', paddingTop: 'var(--space-8)', borderTop: '1px solid var(--ink-200)' }}>Grille 12 colonnes</h3>
          <div className="ds-grid-demo">
            <div className="ds-grid-cols">
              {Array.from({ length: 12 }, (_, i) => <div className="ds-grid-col" key={i}>{i + 1}</div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Radius */}
      <section className="ds-section" id="radius">
        <div className="container">
          <div className="ds-section-header">
            <div className="ds-section-number">05 — RAYONS</div>
            <h2 className="ds-section-title">Rayons <em>harmonisés</em></h2>
            <p className="ds-section-desc">Six niveaux de rayons qui couvrent tous les cas d&apos;usage, du champ de formulaire à la pastille.</p>
          </div>
          <div className="ds-radius-grid">
            {[['r-sm', '--radius-sm', '6px'], ['r-md', '--radius-md', '10px'], ['r-lg', '--radius-lg', '14px'], ['r-xl', '--radius-xl', '20px'], ['r-2xl', '--radius-2xl', '28px'], ['r-full', '--radius-full', '999px']].map(([cls, token, v]) => (
              <div className={`ds-radius-tile ${cls}`} key={token}>
                <div className="ds-radius-preview" />
                <div className="ds-radius-label">{token}<br />{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shadows */}
      <section className="ds-section" id="shadows">
        <div className="container">
          <div className="ds-section-header">
            <div className="ds-section-number">06 — OMBRES</div>
            <h2 className="ds-section-title">Élévation <em>subtile</em></h2>
            <p className="ds-section-desc">Cinq niveaux d&apos;élévation, avec une ombre lumineuse bleutée réservée aux éléments d&apos;emphase et aux hovers.</p>
          </div>
          <div className="ds-shadow-grid">
            <div className="ds-shadow-tile s-sm"><span>--shadow-sm</span></div>
            <div className="ds-shadow-tile s-md"><span>--shadow-md</span></div>
            <div className="ds-shadow-tile s-lg"><span>--shadow-lg</span></div>
            <div className="ds-shadow-tile s-xl"><span>--shadow-xl</span></div>
            <div className="ds-shadow-tile s-glow"><span>--shadow-glow</span></div>
          </div>
        </div>
      </section>

      {/* Components */}
      <section className="ds-section" id="components">
        <div className="container">
          <div className="ds-section-header">
            <div className="ds-section-number">07 — COMPOSANTS</div>
            <h2 className="ds-section-title">Bibliothèque <em>de composants</em></h2>
            <p className="ds-section-desc">Les briques réutilisables du système. Chaque composant fonctionne seul ou composé avec les autres, sans casser la cohérence visuelle.</p>
          </div>
          <div className="ds-component-grid">
            <div className="ds-component-card">
              <div className="ds-component-label"><h4>Boutons</h4><code>.btn</code></div>
              <div className="ds-component-demo inline">
                <button className="btn btn-primary">Commencer gratuitement</button>
                <button className="btn btn-accent">Essai gratuit</button>
                <button className="btn btn-secondary">Voir la démo</button>
                <button className="btn btn-ghost">En savoir plus</button>
              </div>
              <div className="ds-component-caption">Primary · Accent · Secondary · Ghost</div>
            </div>

            <div className="ds-component-card">
              <div className="ds-component-label"><h4>Tailles de boutons</h4><code>.btn-lg · .btn-xl</code></div>
              <div className="ds-component-demo inline">
                <button className="btn btn-primary">Standard</button>
                <button className="btn btn-primary btn-lg">Large</button>
                <button className="btn btn-primary btn-xl">Extra large</button>
              </div>
              <div className="ds-component-caption">XL réservé aux hero sections.</div>
            </div>

            <div className="ds-component-card">
              <div className="ds-component-label"><h4>Champs de saisie</h4><code>.input</code></div>
              <div className="ds-component-demo">
                <div style={{ width: '100%' }}>
                  <label className="input-label">Email professionnel</label>
                  <input type="email" className="input" placeholder="nom@entreprise.fr" />
                </div>
                <div style={{ width: '100%' }}>
                  <label className="input-label">Message</label>
                  <textarea className="input" rows={3} placeholder="Décrivez votre besoin..."></textarea>
                </div>
              </div>
              <div className="ds-component-caption">Border ink-200 par défaut, blue-500 au focus.</div>
            </div>

            <div className="ds-component-card">
              <div className="ds-component-label"><h4>Badges</h4><code>.badge</code></div>
              <div className="ds-component-demo inline">
                <span className="badge badge-dot"><span></span>EN LIGNE</span>
                <span className="badge" style={{ background: 'var(--blue-50)', color: 'var(--blue-700)', border: '1px solid var(--blue-200)' }}>NOUVEAU</span>
                <span className="badge" style={{ background: 'var(--ink-950)', color: 'var(--accent-lime)' }}>PRO</span>
                <span className="badge" style={{ background: 'rgba(78, 242, 179, 0.15)', color: 'var(--blue-900)', border: '1px solid var(--success)' }}>✓ VÉRIFIÉ</span>
              </div>
              <div className="ds-component-caption">Petits signaux visuels pour statut, nouveauté, emphase.</div>
            </div>

            <div className="ds-component-card">
              <div className="ds-component-label"><h4>Carte standard</h4><code>.card</code></div>
              <div className="ds-component-demo">
                <div className="card" style={{ width: '100%', padding: 'var(--space-5)' }}>
                  <div className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}><span>FACTURATION</span></div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--ink-950)' }}>Facture standard</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--ink-600)' }}>Avec calcul HT/TVA/TTC automatique et toutes les mentions légales françaises.</p>
                </div>
              </div>
              <div className="ds-component-caption">Arrière-plan ink-0, border ink-200, radius xl.</div>
            </div>

            <div className="ds-component-card">
              <div className="ds-component-label"><h4>Eyebrow</h4><code>.eyebrow</code></div>
              <div className="ds-component-demo">
                <div className="eyebrow"><span>FONCTIONNALITÉ PRODUIT</span></div>
                <div className="eyebrow" style={{ color: 'var(--blue-500)' }}><span>DISPONIBLE EN BÊTA</span></div>
                <div className="eyebrow" style={{ color: 'var(--ink-950)' }}><span>— CHAPITRE 01 —</span></div>
              </div>
              <div className="ds-component-caption">Mono uppercase avec letter-spacing 0.15em.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Motion */}
      <section className="ds-section" id="motion">
        <div className="container">
          <div className="ds-section-header">
            <div className="ds-section-number">08 — MOTION</div>
            <h2 className="ds-section-title">Animations <em>maîtrisées</em></h2>
            <p className="ds-section-desc">Survolez chaque carte pour voir l&apos;easing associé. Chaque courbe a son usage.</p>
          </div>
          <div className="ds-motion-grid">
            <div className="ds-motion-card e-spring">
              <div className="ds-motion-ball" />
              <div className="ds-motion-name">--ease-spring</div>
              <div className="ds-motion-desc">Rebond mesuré — boutons, cartes au hover, apparitions.</div>
            </div>
            <div className="ds-motion-card e-smooth">
              <div className="ds-motion-ball" />
              <div className="ds-motion-name">--ease-smooth</div>
              <div className="ds-motion-desc">Transition fluide — reveals au scroll, changements de page.</div>
            </div>
            <div className="ds-motion-card e-linear">
              <div className="ds-motion-ball" />
              <div className="ds-motion-name">Linear</div>
              <div className="ds-motion-desc">Mouvements continus — marquee, loaders, progressions infinies.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Icons */}
      <section className="ds-section" id="icons">
        <div className="container">
          <div className="ds-section-header">
            <div className="ds-section-number">09 — ICÔNES</div>
            <h2 className="ds-section-title">Pictos <em>linéaires</em></h2>
            <p className="ds-section-desc">Stroke de 1.5px, rayons arrondis, grille 24×24. Pas de remplissage par défaut — l&apos;icône doit respirer.</p>
          </div>
          <div className="ds-icons-grid">
            <div className="ds-icon-tile"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z" /><path d="M4 8h16" /></svg><span className="ds-icon-name">email</span></div>
            <div className="ds-icon-tile"><svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 16h6" /></svg><span className="ds-icon-name">facture</span></div>
            <div className="ds-icon-tile"><svg viewBox="0 0 24 24"><path d="M7 3h10v18l-5-3-5 3z" /></svg><span className="ds-icon-name">contrat</span></div>
            <div className="ds-icon-tile"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg><span className="ds-icon-name">temps</span></div>
            <div className="ds-icon-tile"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0z" /><path d="M9 11l2 2 4-4" /></svg><span className="ds-icon-name">check</span></div>
            <div className="ds-icon-tile"><svg viewBox="0 0 24 24"><path d="M3 7l9-4 9 4-9 4z" /><path d="M3 11l9 4 9-4" /><path d="M3 15l9 4 9-4" /></svg><span className="ds-icon-name">stack</span></div>
            <div className="ds-icon-tile"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg><span className="ds-icon-name">ia</span></div>
            <div className="ds-icon-tile"><svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z" /><circle cx="8" cy="11" r="1.5" /><path d="M4 18l5-5 5 5M14 14l2-2 4 4" /></svg><span className="ds-icon-name">image</span></div>
            <div className="ds-icon-tile"><svg viewBox="0 0 24 24"><path d="M3 10l9-7 9 7v11H3z" /><path d="M9 21v-6h6v6" /></svg><span className="ds-icon-name">accueil</span></div>
            <div className="ds-icon-tile"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg><span className="ds-icon-name">user</span></div>
            <div className="ds-icon-tile"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7" /></svg><span className="ds-icon-name">flèche</span></div>
            <div className="ds-icon-tile"><svg viewBox="0 0 24 24"><path d="M12 2l2.5 7.5H22l-6 4.5 2.5 7.5L12 17l-6.5 4.5L8 14 2 9.5h7.5z" /></svg><span className="ds-icon-name">étoile</span></div>
          </div>
        </div>
      </section>

      {/* Logo */}
      <section className="ds-section" id="logo">
        <div className="container">
          <div className="ds-section-header">
            <div className="ds-section-number">10 — LOGO</div>
            <h2 className="ds-section-title">Notre <em>signature</em></h2>
            <p className="ds-section-desc">Le logo combine une marque carrée &laquo;&nbsp;W&nbsp;&raquo; en gradient bleu et un wordmark &laquo;&nbsp;Wina<em>ity</em>&nbsp;&raquo; avec un accent italique sur le suffixe.</p>
          </div>
          <div className="ds-logo-grid">
            <div className="ds-logo-card light">
              <div className="nav-logo"><img src="/buildwithuslogo.png" alt="Build withUs" className="nav-logo-img" /><span>Build <span className="nav-logo-italic">withUs</span></span></div>
              <div className="ds-logo-context">Fond clair — Usage principal</div>
            </div>
            <div className="ds-logo-card dark">
              <div className="nav-logo"><img src="/buildwithuslogo.png" alt="Build withUs" className="nav-logo-img" /><span>Build <span className="nav-logo-italic">withUs</span></span></div>
              <div className="ds-logo-context">Fond sombre — Sections dark</div>
            </div>
            <div className="ds-logo-card accent">
              <div className="nav-logo"><img src="/buildwithuslogo.png" alt="Build withUs" className="nav-logo-img" /><span>Build <span className="nav-logo-italic">withUs</span></span></div>
              <div className="ds-logo-context">Fond violet — CTA, packaging</div>
            </div>
          </div>
        </div>
      </section>

      {/* Voice */}
      <section className="ds-section" id="voice" style={{ borderBottom: 'none' }}>
        <div className="container">
          <div className="ds-section-header">
            <div className="ds-section-number">11 — VOIX &amp; TON</div>
            <h2 className="ds-section-title">Comment on <em>parle</em></h2>
            <p className="ds-section-desc">On s&apos;adresse à des professionnels qui ont besoin d&apos;outils fiables. On est clair, concret, un peu chaleureux, jamais corporate.</p>
          </div>
          <div className="ds-voice-grid">
            <div className="ds-voice-card do">
              <div className="ds-voice-label">✓ À faire</div>
              <p className="ds-voice-example">&laquo;&nbsp;Génère ta facture en 30 secondes, avec toutes les mentions légales.&nbsp;&raquo;</p>
              <p className="ds-voice-note">Concret, temps mesuré, bénéfice direct.</p>
            </div>
            <div className="ds-voice-card dont">
              <div className="ds-voice-label">✕ À éviter</div>
              <p className="ds-voice-example">&laquo;&nbsp;Révolutionnez votre processus de facturation grâce à notre solution innovante.&nbsp;&raquo;</p>
              <p className="ds-voice-note">Superlatifs vides, vocabulaire marketing générique.</p>
            </div>
            <div className="ds-voice-card do">
              <div className="ds-voice-label">✓ À faire</div>
              <p className="ds-voice-example">&laquo;&nbsp;On croit que la création doit être honnête.&nbsp;&raquo;</p>
              <p className="ds-voice-note">Position claire, première personne du pluriel.</p>
            </div>
            <div className="ds-voice-card dont">
              <div className="ds-voice-label">✕ À éviter</div>
              <p className="ds-voice-example">&laquo;&nbsp;Notre mission est de démocratiser la création de contenus professionnels.&nbsp;&raquo;</p>
              <p className="ds-voice-note">Phrase creuse, verbe faible, aucune prise de position réelle.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
