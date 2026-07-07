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
  /** €/month on the annual plan — cheaper, but a 12-month commitment. Still
   *  billed EVERY MONTH (never one lump sum), just at this lower rate. */
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
    priceMonthly: 25, // flexible — Stripe price_1TqZNu3SDTmZuxcVRdoiNXbh
    priceAnnual: 20, // annual commitment, billed monthly — Stripe price_1TqYDA3SDTmZuxcVMG7DwZn7
    features: [
      'Usage illimité — emails, contrats, factures',
      "Interactions illimitées avec l'assistant IA",
      'Tous les éditeurs (email, contrat, facture, RCS, SMS)',
      'Export & envoi de tests',
      'Support prioritaire',
    ],
    cta: 'Passer à Pro',
    highlight: true,
  },
  {
    id: 'pro_org',
    name: 'Pro Organisation',
    tagline: 'Pour les équipes et les structures.',
    priceMonthly: 55, // flexible — Stripe price_1TqZNu3SDTmZuxcVAAtZ6hJc
    priceAnnual: 50, // annual commitment, billed monthly — Stripe price_1TqYLc3SDTmZuxcVF4VRSK10
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

// Stripe Price IDs (TEST mode). All four are MONTHLY-recurring — the annual
// plans are billed monthly at a lower rate with a 12-month commitment (enforced
// in our cancel/change logic), NOT charged as one yearly lump sum.
// Used server-side to open a Checkout Session. Swap for live-mode IDs at launch.
export const STRIPE_PRICE_IDS: Record<'pro' | 'pro_org', Record<BillingCycle, string>> = {
  pro: {
    monthly: 'price_1TqZNu3SDTmZuxcVRdoiNXbh', // 25€/mois — flexible
    annual: 'price_1TqYDA3SDTmZuxcVMG7DwZn7', // 20€/mois — 12-mo commitment
  },
  pro_org: {
    monthly: 'price_1TqZNu3SDTmZuxcVAAtZ6hJc', // 55€/mois — flexible
    annual: 'price_1TqYLc3SDTmZuxcVF4VRSK10', // 50€/mois — 12-mo commitment
  },
};

export function getPlan(id: string | null | undefined): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

/** Returns the euro amount to display for a plan given the billing cycle. */
export function planPrice(plan: Plan, cycle: BillingCycle): number | null {
  return cycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
}
