'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Lock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPlan, planPrice, type BillingCycle } from '@/lib/plans';
import { billing } from '@/lib/api';

function CheckoutInner() {
  const searchParams = useSearchParams();

  const planId = searchParams.get('plan');
  const cycle = (searchParams.get('billing') as BillingCycle) === 'annual' ? 'annual' : 'monthly';
  const plan = getPlan(planId);

  const [submitting, setSubmitting] = useState(false);

  // Guard: unknown or free plan → back to pricing.
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

  const price = planPrice(plan, cycle) ?? 0; // €/month (both cycles billed monthly)
  const isAnnual = cycle === 'annual';
  // Both plans are billed monthly. The only difference: annual = 12-month
  // commitment at this lower rate. We NEVER charge a full year at once.
  const vat = Math.round(price * 0.2 * 100) / 100; // 20% TVA — placeholder
  const total = Math.round((price + vat) * 100) / 100; // charged today and every month

  const pay = async () => {
    setSubmitting(true);
    try {
      const { url } = await billing.createCheckout(plan.id, cycle);
      window.location.href = url; // redirect to Stripe's hosted payment page
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de démarrer le paiement');
      setSubmitting(false);
    }
  };

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
              <span className="text-4xl font-bold text-slate-900">{price}€</span>
              <span className="text-slate-400">/ mois</span>
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
                <span>Abonnement (1 mois)</span>
                <span>{price.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>TVA (20%)</span>
                <span>{vat.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between pt-2 text-base font-semibold text-slate-900">
                <span>Total par mois</span>
                <span>{total.toFixed(2)}€</span>
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

      {/* ── Right: confirm & pay via Stripe (hosted) ────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center px-6 py-10 lg:px-16 lg:py-16"
      >
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-lg font-semibold text-slate-900">Finaliser l&apos;abonnement</h2>
          <p className="mt-1 text-sm text-slate-500">
            Vous allez être redirigé vers notre partenaire de paiement sécurisé Stripe pour saisir
            votre carte.
          </p>

          <div className="mt-6 space-y-3 rounded-xl border border-slate-200 p-4 text-sm">
            <div className="flex items-center gap-2.5 text-slate-600">
              <ShieldCheck size={16} className="text-slate-400" /> Paiement chiffré, géré par Stripe
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <Lock size={16} className="text-slate-400" /> Nous ne stockons jamais votre carte
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <Check size={16} className="text-slate-400" /> Résiliable depuis Paramètres → Facturation
            </div>
          </div>

          <button
            type="button"
            onClick={pay}
            disabled={submitting}
            className="mt-8 w-full rounded-full bg-slate-900 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Redirection…' : `Payer ${total.toFixed(2)}€/mois avec Stripe`}
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            En continuant, vous acceptez d&apos;être prélevé chaque mois jusqu&apos;à résiliation.
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
