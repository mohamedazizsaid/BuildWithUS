// Build withUs contact page (marketing). The form is a visual placeholder (no
// backend wired); dept switch is handled globally by MarketingFX (data-dept).
const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
);
const Clock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);

export default function ContactPage() {
  return (
    <main>
      {/* HERO */}
      <section className="contact-hero">
        <div className="container">
          <span className="eyebrow">→ Contact</span>
          <h1 className="contact-hero__title">Parlons de <em>votre projet.</em></h1>
          <p className="contact-hero__sub">
            Une équipe humaine, basée à Paris, qui répond vite. Choisissez le canal qui vous convient.
          </p>
        </div>
      </section>

      {/* CHANNELS */}
      <section className="contact-channels">
        <div className="container">
          <div className="channels-row">
            <div className="channel-row reveal">
              <div className="channel-row__left">
                <div className="channel-row__kind">Support commercial</div>
                <h3 className="channel-row__title">Équipe <em>sales.</em></h3>
                <p className="channel-row__text">Plans, volumes, facturation annuelle, marchés publics. Réponse sous 2h ouvrées.</p>
              </div>
              <div className="channel-row__right">
                <a href="mailto:contact@buildwithus.com" className="channel-row__link">contact@buildwithus.com <Arrow /></a>
                <div className="channel-row__status"><span className="status-dot status-dot--live"></span>Disponible</div>
              </div>
            </div>

            <div className="channel-row reveal">
              <div className="channel-row__left">
                <div className="channel-row__kind">Support produit</div>
                <h3 className="channel-row__title">Bug, incident, <em>urgence.</em></h3>
                <p className="channel-row__text">Problème technique ? Contactez l&apos;équipe produit. Priorité absolue pour les clients Pro.</p>
              </div>
              <div className="channel-row__right">
                <a href="mailto:support@buildwithus.com" className="channel-row__link">support@buildwithus.com <Arrow /></a>
                <div className="channel-row__status"><span className="status-dot status-dot--live"></span>Tous services opérationnels</div>
              </div>
            </div>

            <div className="channel-row reveal">
              <div className="channel-row__left">
                <div className="channel-row__kind">Démo produit</div>
                <h3 className="channel-row__title">Voir l&apos;outil <em>en action.</em></h3>
                <p className="channel-row__text">Réservez 30 minutes avec un expert produit, adaptées à votre activité.</p>
              </div>
              <div className="channel-row__right">
                <a href="/demo" className="channel-row__link">Réserver une démo <Arrow /></a>
                <div className="channel-row__status"><span className="status-dot status-dot--live"></span>Créneaux cette semaine</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FORM + ASIDE */}
      <section className="contact-main">
        <div className="container">
          <div className="contact-main__grid">
            <div className="contact-form-open reveal">
              <header className="contact-form-open__head">
                <span className="eyebrow">→ Formulaire</span>
                <h2 className="contact-form-open__title">Écrivez-nous, on <em>revient vers vous.</em></h2>
              </header>

              <div className="contact-switch" role="group">
                <button className="contact-switch__btn is-active" data-dept="sales">Ventes</button>
                <button className="contact-switch__btn" data-dept="support">Support</button>
                <button className="contact-switch__btn" data-dept="press">Presse</button>
                <button className="contact-switch__btn" data-dept="careers">Recrutement</button>
              </div>

              <div className="contact-form__row">
                <div className="contact-form__field">
                  <label htmlFor="ct-firstname">Prénom</label>
                  <input id="ct-firstname" type="text" className="input" placeholder="Alexandre" />
                </div>
                <div className="contact-form__field">
                  <label htmlFor="ct-lastname">Nom</label>
                  <input id="ct-lastname" type="text" className="input" placeholder="Martin" />
                </div>
              </div>

              <div className="contact-form__row">
                <div className="contact-form__field">
                  <label htmlFor="ct-email">Email</label>
                  <input id="ct-email" type="email" className="input" placeholder="vous@entreprise.fr" />
                </div>
                <div className="contact-form__field">
                  <label htmlFor="ct-phone">Téléphone <span>(optionnel)</span></label>
                  <input id="ct-phone" type="tel" className="input" placeholder="+33 6 12 34 56 78" />
                </div>
              </div>

              <div className="contact-form__field">
                <label htmlFor="ct-company">Entreprise <span>(optionnel)</span></label>
                <input id="ct-company" type="text" className="input" placeholder="Acme SAS" />
              </div>

              <div className="contact-form__field">
                <label htmlFor="ct-subject">Objet</label>
                <select id="ct-subject" className="input" defaultValue="Demande d'informations tarifaires">
                  <option>Demande d&apos;informations tarifaires</option>
                  <option>Intégration CRM / outil de mailing</option>
                  <option>Appels d&apos;offres publics / Chorus Pro</option>
                  <option>Question juridique sur les contrats</option>
                  <option>Partenariat / revendeur</option>
                  <option>Autre</option>
                </select>
              </div>

              <div className="contact-form__field">
                <label htmlFor="ct-message">Message</label>
                <textarea id="ct-message" className="input" placeholder="Décrivez votre besoin, nous vous répondrons précisément."></textarea>
              </div>

              <button className="btn btn-primary btn-lg contact-form__submit">
                <span>Envoyer le message</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              </button>

              <label className="contact-form__consent">
                <input type="checkbox" required />
                <span>J&apos;accepte que mes données soient traitées dans le cadre de cette demande, conformément à notre <a href="#">politique de confidentialité</a>. Vos données ne sont jamais revendues.</span>
              </label>
            </div>

            <aside className="contact-aside-open reveal">
              <div className="aside-section">
                <span className="eyebrow">→ Nos bureaux</span>

                <div className="office-line">
                  <div className="office-line__top">
                    <h3 className="office-line__city">Paris <span className="office-line__flag">🇫🇷</span></h3>
                    <span className="office-line__tag">Siège social</span>
                  </div>
                  <div className="office-line__addr">Paris · France</div>
                  <div className="office-line__hours"><Clock /> Lun-Ven · 9h-19h</div>
                </div>

                <div className="office-line">
                  <div className="office-line__top">
                    <h3 className="office-line__city">Support <span className="office-line__flag">💬</span></h3>
                    <span className="office-line__tag">En ligne</span>
                  </div>
                  <div className="office-line__addr">support@buildwithus.com</div>
                  <div className="office-line__hours"><Clock /> Réponse sous 24h ouvrées</div>
                </div>
              </div>

              <div className="aside-section">
                <span className="eyebrow">→ Informations légales</span>
                <dl className="legal-list">
                  <div className="legal-row"><dt>Raison sociale</dt><dd>Build withUs SAS</dd></div>
                  <div className="legal-row"><dt>Contact</dt><dd>contact@buildwithus.com</dd></div>
                  <div className="legal-row"><dt>Hébergement</dt><dd>France</dd></div>
                  <div className="legal-row"><dt>Conformité</dt><dd>RGPD</dd></div>
                </dl>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* SOCIAL */}
      <section className="contact-social">
        <div className="container">
          <h2 className="contact-social__title reveal">Ou simplement <em>dites bonjour.</em></h2>
          <div className="contact-social__links reveal">
            <a href="#" className="contact-social__link" aria-label="LinkedIn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.27 2.37 4.27 5.44v6.3zM5.34 7.43c-1.14 0-2.07-.93-2.07-2.07s.93-2.07 2.07-2.07 2.07.93 2.07 2.07-.93 2.07-2.07 2.07zm1.78 13.02H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z" /></svg></a>
            <a href="#" className="contact-social__link" aria-label="X"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg></a>
            <a href="#" className="contact-social__link" aria-label="GitHub"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.15-.02-2.08-3.2.69-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39s1.97.13 2.89.39c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.4-5.26 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.2.67.79.55C20.22 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" /></svg></a>
            <a href="#" className="contact-social__link" aria-label="YouTube"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg></a>
          </div>
        </div>
      </section>
    </main>
  );
}
