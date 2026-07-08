'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, ArrowLeft } from 'lucide-react';
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

export default function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const { user } = useAuth();
  // Current subscription plan of the logged-in tenant (null while loading /
  // anonymous). Used to mark "your plan" and block re-purchasing it.
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCurrentPlan(null);
      return;
    }
    let alive = true;
    billing
      .usage()
      .then((u) => {
        if (alive) setCurrentPlan(u.plan);
      })
      .catch(() => {
        /* non-admins can't read billing usage — leave unmarked */
      });
    return () => {
      alive = false;
    };
  }, [user]);

  // Internal tenants (our own company) can't buy/switch plans on /pricing.
  const isInternal = currentPlan === 'internal';

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <Link
          href="/"
          aria-label="Retour à l'accueil"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <span className="inline-flex w-9 h-9 bg-slate-900 rounded-lg items-center justify-center">
            <span className="text-white font-bold">W</span>
          </span>
        </Link>
        {user ? (
          <Link
            href="/dashboard?settings=billing"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={15} />
            Retour aux paramètres
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Aller au tableau de bord
          </Link>
        )}
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-6xl mx-auto px-6 pb-24"
      >
        {/* Heading */}
        <div className="text-center mt-8 mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            Un plan pour chaque équipe
          </h1>
          <p className="text-slate-500 mt-3 text-lg">
            Commencez gratuitement. Passez à la vitesse supérieure quand vous êtes prêt.
          </p>
        </div>

        {/* Billing cycle toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1 text-sm">
            {(['monthly', 'annual'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`relative rounded-full px-5 py-1.5 font-medium transition-colors ${
                  cycle === c ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {c === 'monthly' ? 'Mensuel' : 'Annuel'}
                {c === 'annual' && (
                  <span className="ml-1.5 text-xs text-emerald-500">moins cher</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan) => {
            const price = planPrice(plan, cycle);
            const isFree = plan.id === 'free';
            const href = ctaHref(plan.id, isFree, cycle, !!user);
            // The plan the tenant is already on — can't be re-purchased.
            const isCurrent = !!user && currentPlan === plan.id;
            // Internal tenants can't switch plans here at all.
            const ctaDisabled = isCurrent || (isInternal && !isFree);

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl p-7 ${
                  plan.highlight
                    ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/25'
                    : 'bg-white text-slate-900 border border-slate-200'
                }`}
              >
                {isCurrent ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white">
                    Votre plan actuel
                  </div>
                ) : plan.highlight ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-1 text-[11px] font-semibold text-white">
                    Le plus populaire
                  </div>
                ) : null}

                <div className={`text-sm font-semibold ${plan.highlight ? 'text-indigo-300' : 'text-slate-500'}`}>
                  {plan.name}
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  {plan.priceLabel && isFree ? (
                    <span className="text-4xl font-bold">{plan.priceLabel}</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">{price}€</span>
                      <span className={`text-sm ${plan.highlight ? 'text-white/50' : 'text-slate-400'}`}>
                        /mois
                      </span>
                    </>
                  )}
                </div>
                {!isFree && (
                  <div className={`mt-1 text-xs ${plan.highlight ? 'text-white/50' : 'text-slate-400'}`}>
                    {cycle === 'annual' ? 'facturé mensuellement · engagement 12 mois' : 'sans engagement'}
                  </div>
                )}

                <p className={`mt-3 text-sm ${plan.highlight ? 'text-white/60' : 'text-slate-500'}`}>
                  {plan.tagline}
                </p>

                {ctaDisabled ? (
                  <span
                    aria-disabled="true"
                    className={`mt-6 w-full cursor-default rounded-full py-2.5 text-center text-sm font-medium ${
                      plan.highlight
                        ? 'bg-white/20 text-white/70'
                        : 'border border-slate-200 text-slate-400'
                    }`}
                  >
                    {isCurrent ? 'Plan actuel' : 'Indisponible'}
                  </span>
                ) : (
                  <Link
                    href={href}
                    className={`mt-6 w-full rounded-full py-2.5 text-center text-sm font-medium transition-colors ${
                      plan.highlight
                        ? 'bg-white text-slate-900 hover:bg-white/90'
                        : isFree
                          ? 'border border-slate-300 text-slate-900 hover:bg-slate-50'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                )}

                <div className="mt-7 flex flex-col gap-3">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-sm">
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                          plan.highlight ? 'bg-indigo-500/30' : 'bg-slate-100'
                        }`}
                      >
                        <Check size={11} className={plan.highlight ? 'text-indigo-200' : 'text-slate-600'} />
                      </span>
                      <span className={plan.highlight ? 'text-white/80' : 'text-slate-600'}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footnote */}
        <p className="mt-12 text-center text-sm text-slate-400">
          Besoin d&apos;un plan sur mesure ?{' '}
          <a href="mailto:contact@winaity.com" className="text-slate-900 underline underline-offset-4 hover:text-indigo-600">
            Contactez-nous
          </a>
        </p>
      </motion.div>
    </div>
  );
}
