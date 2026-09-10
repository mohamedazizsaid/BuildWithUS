// Build withUs demo page (marketing). Topic/slot chips are toggled globally by
// MarketingFX (data-demo-topic / data-demo-slot). Form is a visual placeholder.
const CheckLi = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const ArrowSm = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
);

export default function DemoPage() {
  return (
    <main>
      {/* HERO */}
      <section className="demo-hero">
        <div className="container">
          <div className="demo-hero__inner reveal">
            <span className="eyebrow">Démo · 30 min · Personnalisée</span>
            <h1 className="demo-hero__title">Voyez Build withUs <em>en action.</em></h1>
            <p className="demo-hero__sub">
              Une démo adaptée à votre activité, animée par un expert produit. Vous repartez avec un plan d&apos;action clair et un environnement de test pré-configuré.
            </p>
          </div>
        </div>
      </section>

      {/* VIDEO */}
      <section className="demo-video">
        <div className="container">
          <div className="demo-video__frame reveal">
            <div className="demo-video__bg"></div>
            <div className="demo-video__grid"></div>
            <div className="demo-video__meta"><span>DÉMO PRODUIT · 3:42</span></div>
            <div className="demo-video__duration">3:42</div>
            <div className="demo-video__play">
              <button className="demo-video__play-btn" aria-label="Lancer la vidéo">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </button>
              <div className="demo-video__label">Vue d&apos;ensemble</div>
              <div className="demo-video__title">Du <em>brief</em> au <em>document envoyé,</em> en moins de 4 minutes.</div>
            </div>
          </div>
        </div>
      </section>

      {/* FORM */}
      <section className="demo-form-section">
        <div className="container">
          <div className="demo-form-section__grid">
            <aside className="demo-aside reveal">
              <span className="eyebrow">Ce que vous obtiendrez</span>
              <h2 className="demo-aside__title">Une démo <em>utile,</em><br />pas une présentation <em>générique.</em></h2>
              <p className="demo-aside__sub">
                On prend 30 minutes pour comprendre votre contexte, puis on vous montre concrètement comment l&apos;outil s&apos;intègre dans votre workflow. Questions bienvenues.
              </p>

              <ul className="demo-checklist">
                <li><CheckLi /><div><strong>Audit rapide de votre production actuelle</strong><span>Emails, factures, contrats : où vous perdez du temps</span></div></li>
                <li><CheckLi /><div><strong>Démonstration live sur vos cas d&apos;usage</strong><span>On part de vos vrais documents, pas d&apos;un template générique</span></div></li>
                <li><CheckLi /><div><strong>Environnement de test pré-configuré</strong><span>Accessible immédiatement après l&apos;appel</span></div></li>
                <li><CheckLi /><div><strong>Estimation de ROI personnalisée</strong><span>Chiffres concrets basés sur votre volume actuel</span></div></li>
              </ul>

              <div className="demo-aside__contact">
                <div className="demo-aside__contact-label">Votre interlocuteur</div>
                <div className="demo-aside__contact-grid">
                  <div className="demo-aside__contact-avatar">TC</div>
                  <div>
                    <div className="demo-aside__contact-name">Thomas Caron</div>
                    <div className="demo-aside__contact-role">Senior Product Specialist · Build withUs</div>
                  </div>
                </div>
              </div>
            </aside>

            <div className="demo-form-card reveal">
              <header className="demo-form-card__head">
                <h3 className="demo-form-card__title">Réservez votre créneau</h3>
                <p className="demo-form-card__sub">Réponse sous 2h ouvrées. Confirmation par email.</p>
              </header>

              <div className="demo-form__grid">
                <div className="demo-form__field">
                  <label htmlFor="demo-firstname">Prénom</label>
                  <input id="demo-firstname" type="text" className="input" placeholder="Alexandre" />
                </div>
                <div className="demo-form__field">
                  <label htmlFor="demo-lastname">Nom</label>
                  <input id="demo-lastname" type="text" className="input" placeholder="Martin" />
                </div>
              </div>

              <div className="demo-form__field">
                <label htmlFor="demo-email">Email professionnel</label>
                <input id="demo-email" type="email" className="input" placeholder="vous@entreprise.fr" />
              </div>

              <div className="demo-form__grid">
                <div className="demo-form__field">
                  <label htmlFor="demo-company">Entreprise</label>
                  <input id="demo-company" type="text" className="input" placeholder="Acme SAS" />
                </div>
                <div className="demo-form__field">
                  <label htmlFor="demo-size">Taille d&apos;équipe</label>
                  <select id="demo-size" className="input" defaultValue="">
                    <option value="">Sélectionner</option>
                    <option>1-5</option>
                    <option>6-20</option>
                    <option>21-50</option>
                    <option>51-200</option>
                    <option>200+</option>
                  </select>
                </div>
              </div>

              <div className="demo-form__field demo-form__field--full">
                <label>Quels documents vous intéressent ? <span>(un ou plusieurs)</span></label>
                <div className="demo-topics">
                  <button type="button" className="demo-topic" data-demo-topic>Emails marketing</button>
                  <button type="button" className="demo-topic" data-demo-topic>Emails transactionnels</button>
                  <button type="button" className="demo-topic" data-demo-topic>Factures</button>
                  <button type="button" className="demo-topic" data-demo-topic>Contrats B2C</button>
                  <button type="button" className="demo-topic" data-demo-topic>Contrats B2B</button>
                  <button type="button" className="demo-topic" data-demo-topic>RCS / SMS</button>
                  <button type="button" className="demo-topic" data-demo-topic>Intégration CRM</button>
                </div>
              </div>

              <div className="demo-form__field demo-form__field--full">
                <label>Créneau souhaité <span>(cette semaine · Europe/Paris)</span></label>
                <div className="demo-slots">
                  <button type="button" className="demo-slot" data-demo-slot>Mar. 10:00</button>
                  <button type="button" className="demo-slot" data-demo-slot>Mar. 14:00</button>
                  <button type="button" className="demo-slot" data-demo-slot>Mer. 11:30</button>
                  <button type="button" className="demo-slot" data-demo-slot>Mer. 15:00</button>
                  <button type="button" className="demo-slot" data-demo-slot>Jeu. 09:30</button>
                  <button type="button" className="demo-slot" data-demo-slot>Jeu. 16:00</button>
                  <button type="button" className="demo-slot" data-demo-slot>Ven. 10:30</button>
                  <button type="button" className="demo-slot" data-demo-slot>Ven. 14:30</button>
                </div>
              </div>

              <div className="demo-form__field demo-form__field--full">
                <label htmlFor="demo-message">Contexte <span>(optionnel)</span></label>
                <textarea id="demo-message" className="input" placeholder="Quelques mots sur votre activité et vos objectifs…"></textarea>
              </div>

              <button className="btn btn-primary btn-lg demo-form__submit">
                <span>Réserver ma démo</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </button>

              <p className="demo-form__footer">
                En soumettant, vous acceptez notre <a href="#">politique de confidentialité</a>. Vos données ne sont jamais revendues.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ALTERNATIVES */}
      <section className="demo-alt">
        <div className="container">
          <header className="demo-alt__head reveal">
            <span className="eyebrow">Pas envie d&apos;attendre ?</span>
            <h2 className="demo-alt__title">Trois autres façons de <em>tester.</em></h2>
          </header>

          <div className="demo-alt__grid">
            <div className="demo-alt-card reveal">
              <div className="demo-alt-card__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              </div>
              <h3 className="demo-alt-card__title">Plan gratuit</h3>
              <p className="demo-alt-card__text">
                Toutes les bases, sans carte bancaire. Créez vos 3 premiers documents dès maintenant.
              </p>
              <a href="/register" className="demo-alt-card__link">Lancer l&apos;essai <ArrowSm /></a>
            </div>

            <div className="demo-alt-card reveal">
              <div className="demo-alt-card__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
              </div>
              <h3 className="demo-alt-card__title">Démo vidéo complète</h3>
              <p className="demo-alt-card__text">
                Découvrez la plateforme en autonomie. Templates, IA, factures, contrats, intégrations : tout y est.
              </p>
              <a href="#" className="demo-alt-card__link">Regarder la vidéo <ArrowSm /></a>
            </div>

            <div className="demo-alt-card reveal">
              <div className="demo-alt-card__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </div>
              <h3 className="demo-alt-card__title">Une question rapide ?</h3>
              <p className="demo-alt-card__text">
                Écrivez à notre équipe. Réponse rapide, sans passer par un formulaire à rallonge.
              </p>
              <a href="/contact" className="demo-alt-card__link">Nous contacter <ArrowSm /></a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
