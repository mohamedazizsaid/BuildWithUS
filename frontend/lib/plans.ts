// ─── Subscription plans (single source of truth) ────────────────────────────
// Consumed by the public /pricing page, the /checkout page, and the
// "Facturation" tab in the Settings dialog so they never drift apart.
//
// ⚠️ PRICES ARE PLACEHOLDERS. The user will confirm the final amounts later.
// When the real numbers land, update only this file. Billing/payment LOGIC
// (Stripe, webhooks, plan enforcement) is intentionally NOT wired yet — these
// are UI scaffolds.

// 'internal' is the unlimited plan reserved for our own company's tenants. It is
// NOT purchasable (never in PLANS / on /pricing) — assigned by us only (backfill
// migration 0002, later from the super-admin page). See backend tenants.plan.
export type PlanId = 'free' | 'pro' | 'pro_org' | 'internal';

export type BillingCycle = 'monthly' | 'annual';

export const INTERNAL_PLAN_ID: PlanId = 'internal';

/** Human-readable label for ANY plan value, including the non-purchasable
 *  'internal' plan. Use this for display (billing tab, super-admin). */
export const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Gratuit',
  pro: 'Pro',
  pro_org: 'Pro Organisation',
  internal: 'Interne (illimité)',
};

export interface Plan {
  id: PlanId;
  /** Display name shown on cards. */
  name: string;
  /** One-line positioning statement under the name. */
  tagline: string;
  /** €/month on the flexible monthly plan (cancel anytime). `null` ⇒ free/custom. */
  priceMonthly: number | null;
  /** €/YEAR on the annual plan — a single lump sum charged once a year (e.g. 240),
   *  cheaper than 12× the monthly rate. Billed one year in advance, renews on the
   *  anniversary. `null` ⇒ free/custom. */
  priceAnnual: number | null;
  /** Overrides the numeric price display, e.g. "Gratuit" or "Sur devis". */
  priceLabel?: string;
  /** Bullet list of what the plan includes. */
  features: string[];
  /** Call-to-action label on the card button. */
  cta: string;
  /** Renders the card in the emphasised "recommended" style. */
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Gratuit',
    tagline: 'Pour découvrir la plateforme.',
    priceMonthly: 0,
    priceAnnual: 0,
    priceLabel: 'Gratuit',
    features: [
      "Jusqu'à 3 templates email",
      "1 interaction avec l'assistant IA (email)",
      'Éditeur email complet',
      'Export PDF & HTML',
    ],
    cta: 'Commencer gratuitement',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Pour les professionnels et les TPE.',
    priceMonthly: 25, // €/mois flexible — Stripe price_1TqZNu3SDTmZuxcVRdoiNXbh
    priceAnnual: 240, // €/an, un seul prélèvement annuel — Stripe (yearly price)
    features: [
      'Usage illimité — emails, contrats, factures',
      "Interactions illimitées avec l'assistant IA",
      'Tous les éditeurs (email, contrat, facture, RCS, SMS)',
      'Export & envoi de tests',
    ],
    cta: 'Passer à Pro',
    highlight: true,
  },
  {
    id: 'pro_org',
    name: 'Pro Organisation',
    tagline: 'Pour les équipes et les structures.',
    priceMonthly: 55, // €/mois flexible — Stripe price_1TqZNu3SDTmZuxcVAAtZ6hJc
    priceAnnual: 600, // €/an, un seul prélèvement annuel — Stripe (yearly price)
    features: [
      'Tout ce qui est inclus dans Pro',
      'Invitez et gérez plusieurs utilisateurs',
      'Intégrations CRM & outils externes',
      "Accès API & clés d'intégration",
      "Gestion d'équipe et des rôles",
    ],
    cta: 'Passer à Pro Org',
  },
];

// Stripe Price IDs (TEST mode). Monthly prices are month-interval; annual prices
// are YEAR-interval — one lump charge per year (240€ / 600€ HT), renewed on the
// anniversary. Must stay in sync with api-gateway PRICE_IDS.
// ⚠️ The two annual IDs are PLACEHOLDERS — create the yearly prices in Stripe
// (scripts/create-annual-prices.js or the dashboard) and paste the real ids here
// AND in api-gateway/src/controllers/billing.controller.ts.
// Swap for live-mode IDs at launch.
export const STRIPE_PRICE_IDS: Record<'pro' | 'pro_org', Record<BillingCycle, string>> = {
  pro: {
    monthly: 'price_1UE7vR8TxBKnCf988VYj8ZNB', // 25€/mois — flexible
    annual: 'price_1UE7vR8TxBKnCf987oTWyefX', // 240€/an — one yearly charge
  },
  pro_org: {
    monthly: 'price_1UE7vS8TxBKnCf98EgvPufpR', // 55€/mois — flexible
    annual: 'price_1UE7vS8TxBKnCf98kzBpwsXX', // 600€/an — one yearly charge
  },
};

export function getPlan(id: string | null | undefined): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

/** Returns the euro amount to display for a plan given the billing cycle. */
export function planPrice(plan: Plan, cycle: BillingCycle): number | null {
  return cycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
}

// ─── VAT / TVA ───────────────────────────────────────────────────────────────
// French standard VAT rate (TVA normale). SaaS/software subscriptions are taxed
// at the standard 20% in France — there is no 5% rate (the reduced rates are
// 10 %, 5,5 % and 2,1 %, none of which cover software). This mirrors how Claude
// Pro is billed in France: 18 € HT → 21,60 € TTC.
//
// ⚠️ This is the DISPLAY rate on /checkout. It MUST equal the percentage of the
// Stripe Tax Rate object referenced by STRIPE_TAX_RATE_ID in the api-gateway,
// otherwise the total shown here won't match what Stripe actually charges.
export const VAT_RATE = 0.2;

/** The VAT rate as a whole-number percentage, for labels e.g. "TVA (20%)". */
export const VAT_RATE_PCT = Math.round(VAT_RATE * 100);

/** Split a HT (pre-tax) euro amount into { ht, vat, ttc }, rounded to cents. */
export function vatBreakdown(ht: number): { ht: number; vat: number; ttc: number } {
  const round = (n: number) => Math.round(n * 100) / 100;
  const vat = round(ht * VAT_RATE);
  return { ht: round(ht), vat, ttc: round(ht + vat) };
}
