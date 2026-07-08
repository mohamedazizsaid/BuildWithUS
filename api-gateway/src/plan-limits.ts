// ─── Subscription plan limits (server-side source of truth) ─────────────────
// Enforced by the gateway on every gated action (template create, AI
// interaction, user invite, API-key creation). Keep the capability matrix in
// sync with frontend/lib/plans.ts (PLAN_CAPABILITIES) — that copy only drives
// UI hints; THIS one is the one that actually blocks.
//
//   free     → email only, 1 email template + 1 AI interaction (lifetime).
//   pro      → everything unlimited EXCEPT inviting users / creating API keys.
//   pro_org  → everything, unlimited.
//   internal → our own company's tenants: everything, unlimited (never sold).

export interface PlanLimits {
  /** Max EMAIL templates a tenant may ever create. null = unlimited. */
  emailTemplates: number | null;
  /** Max non-email templates (facture/contrat/sms/rcs). 0 = feature blocked,
   *  null = unlimited. Only 0 and null are used today. */
  nonEmailTemplates: number | null;
  /** Max AI assistant interactions (lifetime). null = unlimited. */
  aiInteractions: number | null;
  /** May invite / create additional users in the org. */
  canInviteUsers: boolean;
  /** May generate API integration keys. */
  canCreateApiKeys: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    emailTemplates: 1,
    nonEmailTemplates: 0,
    aiInteractions: 1,
    canInviteUsers: false,
    canCreateApiKeys: false,
  },
  pro: {
    emailTemplates: null,
    nonEmailTemplates: null,
    aiInteractions: null,
    canInviteUsers: false,
    canCreateApiKeys: false,
  },
  pro_org: {
    emailTemplates: null,
    nonEmailTemplates: null,
    aiInteractions: null,
    canInviteUsers: true,
    canCreateApiKeys: true,
  },
  internal: {
    emailTemplates: null,
    nonEmailTemplates: null,
    aiInteractions: null,
    canInviteUsers: true,
    canCreateApiKeys: true,
  },
};

/** Limits for a plan id, defaulting to the (most restrictive) free plan for
 *  unknown / missing values. */
export function limitsFor(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[plan || 'free'] ?? PLAN_LIMITS.free;
}

/** The frontend sends the template type as the proto enum number
 *  (EMAIL=1, FACTURE=2, CONTRAT=3, SMS=4, RCS=5). Be liberal about the shape
 *  so a stringy "1"/"email"/"EMAIL" is also recognised. */
export function isEmailType(type: unknown): boolean {
  return type === 1 || type === '1' || String(type).toLowerCase() === 'email';
}
