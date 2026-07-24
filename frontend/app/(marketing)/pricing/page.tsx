'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth';
import { billing } from '@/lib/api';
import { PLANS, planPrice, type BillingCycle } from '@/lib/plans';

// Anonymous visitors register first (paid plans carry the choice through to
// checkout); logged-in users skip straight to checkout.
function ctaHref(planId: string, isFree: boolean, cycle: BillingCycle, loggedIn: boolean): string {
  if (isFree) return loggedIn ? '/dashboard' : '/register';
  const q = `plan=${planId}&billing=${cycle}`;
  return loggedIn ? `/checkout?${q}` : `/register?${q}`;
}

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const Plus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const Yes = () => <span className="pricing-table__dot pricing-table__dot--yes">✓</span>;
const No = () => <span className="pricing-table__dot pricing-table__dot--no">–</span>;

export default function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  // The cycle the tenant is actually subscribed on. Needed so the "current plan"
  // marker distinguishes Pro-mensuel from Pro-annuel — otherwise a monthly
  // subscriber sees "plan actuel" under BOTH toggles and can't switch cycles.
  const [currentCycle, setCurrentCycle] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCurrentPlan(null);
      setCurrentCycle(null);
      return;
    }
    let alive = true;
    billing
      .get()
      .then((b) => { if (alive) { setCurrentPlan(b.plan); setCurrentCycle(b.billing_cycle); } })
      .catch(() => { /* can't read billing — leave unmarked */ });
    return () => { alive = false; };
  }, [user]);

  const isInternal = currentPlan === 'internal';

  return (
    <main>
      {/* HERO */}
      <section className="pricing-hero">
        <div className="container">
          <span className="eyebrow pricing-hero__eyebrow">Tarifs · Sans engagement</span>
          <h1 className="pricing-hero__title">Un plan pour<br />chaque <em>équipe.</em></h1>
          <p className="pricing-hero__sub">
            Commencez gratuitement. Passez à la vitesse supérieure quand vous êtes prêt. Aucune carte bancaire requise pour démarrer.
          </p>

          <div className="pricing-toggle" role="group">
            <button
              className={`pricing-toggle__btn ${cycle === 'monthly' ? 'is-active' : ''}`}
              onClick={() => setCycle('monthly')}
            >
              Mensuel
            </button>
            <button
              className={`pricing-toggle__btn ${cycle === 'annual' ? 'is-active' : ''}`}
              onClick={() => setCycle('annual')}
            >
              Annuel
              <span className="pricing-toggle__save">moins cher</span>
            </button>
          </div>
          <div className="pricing-note">
            {cycle === 'annual'
              ? 'Facturé une fois par an, à tarif réduit. Engagement 12 mois.'
              : 'Facturation mensuelle, sans engagement.'}
          </div>
        </div>
      </section>

      {/* PLAN CARDS */}
      <section className="pricing-grid">
        <div className="container">
          <div className="pricing-cards">
            {PLANS.map((plan) => {
              const price = planPrice(plan, cycle);
              const isFree = plan.id === 'free';
              const href = ctaHref(plan.id, isFree, cycle, !!user);
              // Free has no billing cycle, so match on plan alone. Paid plans are
              // "current" only when the shown cycle matches the subscribed one —
              // so a Pro-mensuel user can still switch to Pro-annuel here.
              const isCurrent =
                !!user &&
                currentPlan === plan.id &&
                (isFree || currentCycle === cycle);
              const ctaDisabled = isCurrent || (isInternal && !isFree);

              return (
                <div
                  key={plan.id}
                  className={`price-card${plan.highlight ? ' price-card--featured' : ''}`}
                >
                  {isCurrent ? (
                    <span className="price-card__badge price-card__badge--current">Votre plan actuel</span>
                  ) : plan.highlight ? (
                    <span className="price-card__badge">Le plus populaire</span>
                  ) : null}

                  <h3 className="price-card__name">
                    {plan.highlight ? <>Pro <em>Studio</em></> : plan.name}
                  </h3>
                  <p className="price-card__tagline">{plan.tagline}</p>

                  <div className="price-card__price">
                    {isFree ? (
                      <span className="price-card__amount">{plan.priceLabel ?? '0€'}</span>
                    ) : (
                      <>
                        <span className="price-card__amount">{price}</span>
                        <span className="price-card__currency">€</span>
                      </>
                    )}
                  </div>
                  <div className="price-card__period">
                    {isFree
                      ? 'Pour toujours'
                      : cycle === 'annual'
                        ? 'par an, HT · engagement 12 mois'
                        : 'par mois, HT · sans engagement'}
                  </div>

                  {ctaDisabled ? (
                    <span aria-disabled="true" className="price-card__cta-disabled">
                      {isCurrent ? 'Plan actuel' : 'Indisponible'}
                    </span>
                  ) : (
                    <a
                      href={href}
                      className={`btn btn-lg price-card__cta ${plan.highlight ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {plan.cta}
                    </a>
                  )}

                  <div className="price-card__divider" />
                  <div className="price-card__feat-label">Ce qui est inclus</div>
                  <ul className="price-card__features">
                    {plan.features.map((f) => (
                      <li key={f}><Check /><span>{f}</span></li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="pricing-compare">
        <div className="container">
          <header className="pricing-compare__head reveal">
            <span className="eyebrow">Comparatif détaillé</span>
            <h2 className="pricing-compare__title">Tout ce qu&apos;il faut savoir, <em>aligné.</em></h2>
          </header>

          <div className="pricing-table-wrap reveal">
            <table className="pricing-table">
              <thead>
                <tr>
                  <th>Fonctionnalité</th>
                  <th>Gratuit</th>
                  <th>Pro</th>
                  <th>Pro Organisation</th>
                </tr>
              </thead>
              <tbody>
                <tr className="pricing-table__group"><td colSpan={4}>Création</td></tr>
                <tr>
                  <td><div className="pricing-table__feat">Templates email</div></td>
                  <td>3 max</td><td>Illimité</td><td>Illimité</td>
                </tr>
                <tr>
                  <td><div className="pricing-table__feat">Éditeurs disponibles</div><div className="pricing-table__feat-sub">Email, contrat, facture, RCS, SMS</div></td>
                  <td>Email</td><td>Tous</td><td>Tous</td>
                </tr>
                <tr>
                  <td><div className="pricing-table__feat">Export PDF &amp; HTML</div></td>
                  <td><Yes /></td><td><Yes /></td><td><Yes /></td>
                </tr>
                <tr>
                  <td><div className="pricing-table__feat">Envoi de tests</div></td>
                  <td><No /></td><td><Yes /></td><td><Yes /></td>
                </tr>

                <tr className="pricing-table__group"><td colSpan={4}>Assistant IA</td></tr>
                <tr>
                  <td><div className="pricing-table__feat">Interactions IA</div></td>
                  <td>1 (email)</td><td>Illimité</td><td>Illimité</td>
                </tr>

                <tr className="pricing-table__group"><td colSpan={4}>Équipe &amp; intégrations</td></tr>
                <tr>
                  <td><div className="pricing-table__feat">Utilisateurs multiples</div></td>
                  <td><No /></td><td><No /></td><td><Yes /></td>
                </tr>
                <tr>
                  <td><div className="pricing-table__feat">Intégrations CRM &amp; outils externes</div></td>
                  <td><No /></td><td><No /></td><td><Yes /></td>
                </tr>
                <tr>
                  <td><div className="pricing-table__feat">Accès API &amp; clés d&apos;intégration</div></td>
                  <td><No /></td><td><No /></td><td><Yes /></td>
                </tr>
                <tr>
                  <td><div className="pricing-table__feat">Gestion des rôles</div></td>
                  <td><No /></td><td><No /></td><td><Yes /></td>
                </tr>

                <tr className="pricing-table__group"><td colSpan={4}>Support</td></tr>
                <tr>
                  <td><div className="pricing-table__feat">Niveau de support</div></td>
                  <td>Communauté</td><td>Prioritaire</td><td>Prioritaire</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* TRIAL BANNER */}
      <section className="trial-banner">
        <div className="container">
          <div className="trial-banner__inner reveal">
            <div className="trial-banner__content">
              <span className="trial-banner__eyebrow">
                <span className="badge-dot" />
                Plan gratuit · Sans engagement
              </span>
              <h2 className="trial-banner__title">Commencez <em>gratuitement.</em><br />Générez vos premiers documents.</h2>
              <p className="trial-banner__sub">
                Testez la plateforme sans carte bancaire. Passez à Pro quand votre volume l&apos;exige. Annulable en un clic.
              </p>
              <div className="trial-banner__ctas">
                <a href="/register" className="btn btn-accent btn-xl">Créer mon compte</a>
                <a href="/demo" className="btn btn-ghost btn-xl" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>Voir une démo</a>
              </div>
              <div className="trial-banner__perks">
                <span><Check /> Pas de CB</span>
                <span><Check /> 3 documents offerts</span>
                <span><Check /> Annulable en 1 clic</span>
                <span><Check /> Données en France</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="container">
          <header className="faq-section__head reveal">
            <span className="eyebrow">FAQ</span>
            <h2 className="faq-section__title">Vos questions, <em>nos réponses.</em></h2>
            <p className="faq-section__sub">Vous ne trouvez pas votre réponse ? <a href="/contact" style={{ color: 'var(--blue-500)', textDecoration: 'underline' }}>Contactez l&apos;équipe.</a></p>
          </header>

          <div className="faq-list">
            {[
              {
                q: 'Le plan gratuit est-il vraiment gratuit ?',
                a: "Oui. Le plan Gratuit vous permet de créer jusqu'à 3 templates email, d'utiliser l'éditeur email complet, d'exporter en PDF et HTML, et de tester l'assistant IA une fois. Aucune carte bancaire n'est requise, et vos données restent accessibles.",
              },
              {
                q: 'Puis-je changer de plan à tout moment ?',
                a: "Oui, depuis votre espace de facturation. La montée de gamme est immédiate (au prorata). La descente de gamme prend effet à votre prochaine période de facturation. Aucun frais caché.",
              },
              {
                q: 'Quelle différence entre facturation mensuelle et annuelle ?',
                a: "Le tarif mensuel est flexible et sans engagement, prélevé chaque mois. Le tarif annuel est moins cher : vous réglez l'année entière en une seule fois, avec un engagement de 12 mois, puis le renouvellement se fait automatiquement à la date anniversaire.",
              },
              {
                q: 'Mes documents sont-ils conformes à la législation française ?',
                a: "Oui. Les factures incluent automatiquement les mentions légales obligatoires (SIRET, TVA, conditions de paiement, pénalités de retard), et les contrats sont adaptés au droit français.",
              },
              {
                q: 'Mes données sont-elles hébergées en France ?',
                a: "Oui, vos données sont hébergées en France et nous sommes conformes au RGPD par design. Aucune donnée ne transite hors de l'Union Européenne.",
              },
              {
                q: 'Puis-je inviter mon équipe ?',
                a: "La gestion multi-utilisateurs, les rôles, les intégrations CRM et l'accès API sont inclus dans le plan Pro Organisation. Les plans Gratuit et Pro sont mono-utilisateur.",
              },
              {
                q: 'Quelles méthodes de paiement acceptez-vous ?',
                a: "Carte bancaire (Visa, Mastercard, American Express) via Stripe pour les abonnements mensuels et annuels.",
              },
            ].map((item) => (
              <div className="faq-item reveal" data-faq-item key={item.q}>
                <button className="faq-item__q" data-faq-q>
                  {item.q}
                  <span className="faq-item__icon"><Plus /></span>
                </button>
                <div className="faq-item__a"><div className="faq-item__a-inner">{item.a}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
