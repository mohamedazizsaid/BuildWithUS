'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Lock, ShieldCheck } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import toast from '@/lib/toast';
import { getPlan, planPrice, vatBreakdown, VAT_RATE_PCT, type BillingCycle } from '@/lib/plans';
import { billing } from '@/lib/api';

// Load Stripe.js once (module scope). The publishable key is public by design;
// it only identifies the account and can't move money on its own. Guard the
// empty case — loadStripe('') throws an IntegrationError, so we pass null (the
// provider simply waits) and surface a clean "not configured" message instead.
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

function CheckoutInner() {
  const searchParams = useSearchParams();

  const planId = searchParams.get('plan');
  const cycle = (searchParams.get('billing') as BillingCycle) === 'annual' ? 'annual' : 'monthly';
  const plan = getPlan(planId);
  const isAnnual = cycle === 'annual';

  // The Stripe Embedded Checkout session's client secret. Fetched on mount from
  // our gateway, which creates the (embedded) Checkout Session. Stays null while
  // loading — or forever if the gateway instead sends a redirect `url` (a plan
  // change on an existing subscription needs no payment step).
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Guard inside the effect (not via early-return) so hooks stay unconditional.
    if (!plan || plan.id === 'free') return;
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setError('Le paiement n’est pas configuré (clé Stripe manquante).');
      return;
    }

    let alive = true;
    billing
      .createCheckout(plan.id, cycle)
      .then((res) => {
        if (!alive) return;
        // Plan change on an existing subscription → no payment step, just go back.
        if (res.url) {
          window.location.href = res.url;
          return;
        }
        if (res.clientSecret) {
          setClientSecret(res.clientSecret);
          return;
        }
        setError('Impossible de démarrer le paiement.');
      })
      .catch((err) => {
        if (!alive) return;
        const msg = err instanceof Error ? err.message : 'Impossible de démarrer le paiement';
        setError(msg);
        toast.error(msg);
      });
    return () => {
      alive = false;
    };
  }, [plan, cycle]);

  // Guard: unknown or free plan → back to pricing. (After all hooks, so the
  // rules-of-hooks ordering is preserved.)
  if (!plan || plan.id === 'free') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <p className="text-slate-600">Ce plan n&apos;est pas disponible au paiement.</p>
          <Link href="/pricing" className="mt-3 inline-block text-sm text-slate-900 underline underline-offset-4">
            Retour aux tarifs
          </Link>
        </div>
      </div>
    );
  }

  const price = planPrice(plan, cycle) ?? 0; // €/month HT (both cycles billed monthly)
  // Single source of truth: same VAT_RATE the gateway attaches to the Stripe
  // line item, so this total ALWAYS equals what Stripe charges.
  const { vat, ttc } = vatBreakdown(price);

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* ── Left: order summary ─────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-10 lg:border-b-0 lg:border-r lg:px-16 lg:py-16">
        <div className="mx-auto max-w-md">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft size={15} /> Retour aux tarifs
          </Link>

          <div className="mt-10">
            <p className="text-sm text-slate-500">Vous vous abonnez à</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Winaity {plan.name}</h1>

            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900">{ttc.toFixed(2)}€</span>
              <span className="text-slate-400">/ mois TTC</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {isAnnual ? 'Engagement 12 mois · prélevé chaque mois' : 'Sans engagement · prélevé chaque mois'}
            </p>

            <ul className="mt-8 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200">
                    <Check size={11} className="text-slate-600" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            {/* Totals — charged today, then the same amount every month */}
            <div className="mt-10 space-y-2 border-t border-slate-200 pt-6 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Abonnement (1 mois, HT)</span>
                <span>{price.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>TVA ({VAT_RATE_PCT}%)</span>
                <span>{vat.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between pt-2 text-base font-semibold text-slate-900">
                <span>Total par mois (TTC)</span>
                <span>{ttc.toFixed(2)}€</span>
              </div>
              {isAnnual && (
                <p className="pt-1 text-xs text-slate-400">
                  Engagement de 12 mois. Résiliation possible à la fin de la période engagée.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: payment, embedded on our own page (no Stripe redirect) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start px-6 py-10 lg:px-16 lg:py-16"
      >
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-lg font-semibold text-slate-900">Finaliser l&apos;abonnement</h2>
          <p className="mt-1 text-sm text-slate-500">
            Paiement sécurisé, directement sur Winaity. Vos informations de carte sont chiffrées et
            traitées par Stripe.
          </p>

          <div className="mt-5 space-y-3 rounded-xl border border-slate-200 p-4 text-sm">
            <div className="flex items-center gap-2.5 text-slate-600">
              <ShieldCheck size={16} className="text-slate-400" /> Paiement chiffré de bout en bout
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <Lock size={16} className="text-slate-400" /> Nous ne stockons jamais votre carte
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <Check size={16} className="text-slate-400" /> Résiliable depuis Paramètres → Facturation
            </div>
          </div>

          {/* Embedded Stripe Checkout — renders inside this page. */}
          <div className="mt-6">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
                <Link href="/pricing" className="mt-2 block text-red-900 underline underline-offset-4">
                  Retour aux tarifs
                </Link>
              </div>
            ) : clientSecret ? (
              <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            ) : (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                Préparation du paiement…
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            En continuant, vous acceptez d&apos;être prélevé {ttc.toFixed(2)}€ chaque mois jusqu&apos;à
            résiliation.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutInner />
    </Suspense>
  );
}
