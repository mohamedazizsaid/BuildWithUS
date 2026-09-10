// Build withUs about page (marketing).
const Linkedin = () => (
  <a href="#" aria-label="LinkedIn"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.27 2.37 4.27 5.44v6.3zM5.34 7.43c-1.14 0-2.07-.93-2.07-2.07s.93-2.07 2.07-2.07 2.07.93 2.07 2.07-.93 2.07-2.07 2.07zm1.78 13.02H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z" /></svg></a>
);

export default function AboutPage() {
  return (
    <main>
      {/* HERO */}
      <section className="about-hero">
        <div className="container">
          <div className="about-hero__grid">
            <div className="reveal">
              <span className="eyebrow">Qui nous sommes</span>
              <h1 className="about-hero__title">
                Nous croyons que la<br />
                <em>création</em> doit être<br />
                <em>accessible</em> à tous.
              </h1>
              <p className="about-hero__sub">
                Build withUs est née d&apos;une conviction simple : les équipes, les freelances et les PME méritent un seul outil pour générer emails, factures et contrats — sans compromis sur la qualité ni la conformité.
              </p>

              <div className="about-hero__meta">
                <div className="about-hero__meta-item"><strong>2024</strong><span>Fondation</span></div>
                <div className="about-hero__meta-item"><strong>FR</strong><span>Made in Paris</span></div>
                <div className="about-hero__meta-item"><strong>5</strong><span>Types de documents</span></div>
                <div className="about-hero__meta-item"><strong>IA</strong><span>Au cœur du produit</span></div>
              </div>
            </div>

            <div className="about-hero__visual reveal">
              <div className="about-hero__visual-grid"></div>
              <div className="about-hero__stamp">
                <div className="about-hero__stamp-label">Depuis 2024 · Paris · France</div>
                <div className="about-hero__stamp-title">Un outil <em>puissant.</em><br />Pour des équipes <em>ambitieuses.</em></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section className="about-mission">
        <div className="container">
          <div className="about-mission__inner reveal">
            <span className="eyebrow about-mission__eyebrow">Notre mission</span>
            <p className="about-mission__text">
              Rendre la création de documents <em>professionnels</em> aussi simple qu&apos;envoyer un message. Sans sacrifier la <em>rigueur juridique</em>, la conformité légale ni la qualité du design. Pour que vos équipes passent moins de temps à formater — et plus à vendre, convaincre et créer.
            </p>
            <div className="about-mission__signature">
              <span className="about-mission__signature-line"></span>
              <span>L&apos;équipe Build withUs</span>
              <span className="about-mission__signature-line"></span>
            </div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="about-values">
        <div className="container">
          <header className="about-values__head reveal">
            <span className="eyebrow">Nos valeurs</span>
            <h2 className="about-values__title">Trois principes, <em>tenus</em> au quotidien.</h2>
          </header>

          <div className="about-values__grid">
            <div className="value-card reveal">
              <div className="value-card__num">01</div>
              <div className="value-card__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
              </div>
              <h3 className="value-card__title">Artisanat <em>d&apos;abord.</em></h3>
              <p className="value-card__text">
                Chaque template, chaque mention légale, chaque interaction est relue par un humain. L&apos;IA accélère — elle ne remplace pas le jugement. Nos modèles sont validés par des juristes et des designers, pas générés à la chaîne.
              </p>
            </div>

            <div className="value-card reveal">
              <div className="value-card__num">02</div>
              <div className="value-card__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
              </div>
              <h3 className="value-card__title">Conformité <em>réelle.</em></h3>
              <p className="value-card__text">
                Factur-X, Chorus Pro, RGPD, mentions obligatoires, délais de rétractation : tout est à jour, testé en conditions réelles et audité régulièrement. Vous envoyez un document ? Il est juridiquement solide.
              </p>
            </div>

            <div className="value-card reveal">
              <div className="value-card__num">03</div>
              <div className="value-card__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M2 12h20" /><circle cx="12" cy="12" r="4" /></svg>
              </div>
              <h3 className="value-card__title">Transparence <em>totale.</em></h3>
              <p className="value-card__text">
                Pas de frais cachés, pas d&apos;engagement forcé, pas de dark pattern. Nos tarifs sont publics, nos limites claires, vos données restent les vôtres — exportables à tout moment. On travaille pour vous, pas l&apos;inverse.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="about-timeline">
        <div className="container">
          <header className="about-timeline__head reveal">
            <span className="eyebrow">L&apos;histoire</span>
            <h2 className="about-timeline__title">De l&apos;idée, à <em>aujourd&apos;hui.</em></h2>
          </header>

          <div className="timeline">
            <div className="timeline-item reveal">
              <div className="timeline-item__date">Mars 2024</div>
              <h3 className="timeline-item__title">Le <em>déclic.</em></h3>
              <p className="timeline-item__text">
                Un week-end passé à compter le temps perdu à formater des documents. Le calcul fait mal. Le projet Build withUs démarre le lundi matin.
              </p>
            </div>

            <div className="timeline-item reveal">
              <div className="timeline-item__date">Septembre 2024</div>
              <h3 className="timeline-item__title">Première <em>bêta.</em></h3>
              <p className="timeline-item__text">
                Lancement du builder email auprès de beta-testeurs : freelances, agences, TPE. Retour brut, direct, essentiel. Le cœur du produit se dessine autour d&apos;une obsession : la vitesse d&apos;exécution.
              </p>
            </div>

            <div className="timeline-item reveal">
              <div className="timeline-item__date">Février 2025</div>
              <h3 className="timeline-item__title">Factures &amp; contrats <em>arrivent.</em></h3>
              <p className="timeline-item__text">
                Extension majeure : les factures françaises et les contrats rejoignent la plateforme. Les premières intégrations CRM (HubSpot, Brevo) sont déployées.
              </p>
            </div>

            <div className="timeline-item reveal">
              <div className="timeline-item__date">Octobre 2025</div>
              <h3 className="timeline-item__title">Cap sur <em>l&apos;IA.</em></h3>
              <p className="timeline-item__text">
                Lancement de l&apos;assistant IA et de la banque d&apos;images intégrée. L&apos;IA lit une affiche et en génère un template email prêt à l&apos;emploi.
              </p>
            </div>

            <div className="timeline-item reveal">
              <div className="timeline-item__date">Et demain ?</div>
              <h3 className="timeline-item__title">On <em>continue.</em></h3>
              <p className="timeline-item__text">
                Éditeurs RCS et SMS, compatibilité Chorus Pro pour le secteur public, ouverture de l&apos;API publique. Une équipe qui grandit sans perdre son âme.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="about-team">
        <div className="container">
          <header className="about-team__head reveal">
            <h2 className="about-team__title">Les <em>humains</em> derrière l&apos;outil.</h2>
            <p className="about-team__intro">
              Une équipe compacte, exigeante, qui répond elle-même au support. Parce qu&apos;on n&apos;externalise ni notre code, ni notre relation client.
            </p>
          </header>

          <div className="team-grid">
            <div className="team-card reveal">
              <div className="team-card__avatar"><span className="team-card__initials">JD</span></div>
              <div className="team-card__info">
                <h3 className="team-card__name">Julien Delcourt</h3>
                <p className="team-card__role">CEO &amp; Co-fondateur</p>
                <div className="team-card__social"><Linkedin /></div>
              </div>
            </div>
            <div className="team-card reveal">
              <div className="team-card__avatar"><span className="team-card__initials">SM</span></div>
              <div className="team-card__info">
                <h3 className="team-card__name">Sarah Moreau</h3>
                <p className="team-card__role">CPO &amp; Co-fondatrice</p>
                <div className="team-card__social"><Linkedin /></div>
              </div>
            </div>
            <div className="team-card reveal">
              <div className="team-card__avatar"><span className="team-card__initials">RV</span></div>
              <div className="team-card__info">
                <h3 className="team-card__name">Romain Vasseur</h3>
                <p className="team-card__role">CTO &amp; Co-fondateur</p>
                <div className="team-card__social"><Linkedin /></div>
              </div>
            </div>
            <div className="team-card reveal">
              <div className="team-card__avatar"><span className="team-card__initials">LB</span></div>
              <div className="team-card__info">
                <h3 className="team-card__name">Léa Benoît</h3>
                <p className="team-card__role">Lead Design</p>
                <div className="team-card__social"><Linkedin /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="about-cta">
        <div className="container">
          <div className="about-cta__inner reveal">
            <div className="about-cta__content">
              <span className="eyebrow" style={{ color: 'var(--lime)', marginBottom: '16px', display: 'inline-block' }}>Rejoignez-nous</span>
              <h2 className="about-cta__title">Prêt à créer <em>autrement ?</em></h2>
              <p className="about-cta__sub">
                Testez la plateforme gratuitement. Ou échangez avec un membre de l&apos;équipe pour un cas d&apos;usage sur mesure.
              </p>
              <div className="about-cta__ctas">
                <a href="/register" className="btn btn-accent btn-lg">Démarrer gratuitement</a>
                <a href="/contact" className="btn btn-ghost btn-lg" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>Parler à l&apos;équipe</a>
              </div>
            </div>
            <div className="about-cta__visual" aria-hidden="true">
              <div className="about-cta__visual-card about-cta__visual-card--1">
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--ink-500)', letterSpacing: '.05em', textTransform: 'uppercase' }}>Documents</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', marginTop: '4px', letterSpacing: '-.02em' }}>5 <em style={{ color: 'var(--blue-500)', fontStyle: 'italic' }}>types</em></div>
              </div>
              <div className="about-cta__visual-card about-cta__visual-card--2">
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '.05em', textTransform: 'uppercase' }}>Assistant</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', marginTop: '4px', letterSpacing: '-.02em' }}>IA&nbsp;native</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
