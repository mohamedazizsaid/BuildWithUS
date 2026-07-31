import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Headers,
  HttpCode,
  Inject,
  OnModuleInit,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
// CommonJS import form: this project's tsconfig has allowSyntheticDefaultImports
// (typecheck) but NOT esModuleInterop (runtime), so `import Stripe from 'stripe'`
// compiles to `stripe_1.default` (undefined) and crashes. `import = require`
// matches stripe's `export =` and works at runtime.
import Stripe = require('stripe');
import * as crypto from 'crypto';
import { ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';
import { Roles, RolesGuard } from '../guards/roles.guard';
import { limitsFor } from '../plan-limits';

// ── Stripe price IDs (TEST mode) — must stay in sync with frontend/lib/plans.ts.
// "monthly" = month-interval price billed every month (flexible, sans engagement).
// "annual"  = YEAR-interval price billed once a year as a single lump sum (240€ /
//   600€ HT). The next charge is one year later. This is a real yearly interval,
//   NOT a monthly charge — so cancellation naturally ends at the year boundary.
//
// ⚠️ The two annual IDs below are PLACEHOLDERS. Create the yearly prices in Stripe
// (see scripts/create-annual-prices.js or the dashboard) and paste their real
// `price_…` ids here AND in frontend/lib/plans.ts, then redeploy.
const PRICE_IDS: Record<string, Record<string, string>> = {
  pro: {
    monthly: 'price_1TqZNu3SDTmZuxcVRdoiNXbh', // 25€/mois — flexible
    annual: 'price_1TwMMv3SDTmZuxcVlulvXqwv', // 240€/an — one yearly charge
  },
  pro_org: {
    monthly: 'price_1TqZNu3SDTmZuxcVAAtZ6hJc', // 55€/mois — flexible
    annual: 'price_1TwMNm3SDTmZuxcVAjqTtEcZ', // 600€/an — one yearly charge
  },
};

// ── Stripe Tax Rate (TVA) ────────────────────────────────────────────────────
// The listed prices above are HT (pre-tax). To charge — and to SHOW — French
// TVA on Stripe's checkout, we attach a Stripe Tax Rate object to every line
// item / subscription item. Create it once in the Stripe Dashboard
// (Tax rates → 20% exclusive, "TVA"), then set its id (txr_…) here via env.
// Its percentage MUST equal frontend VAT_RATE, or the /checkout total and the
// amount Stripe charges will disagree. Empty ⇒ no tax attached (falls back to
// the old HT-only behaviour instead of crashing).
const TAX_RATE_ID = process.env.STRIPE_TAX_RATE_ID || '';

/** tax_rates array for a line/subscription item, or undefined when unconfigured.
 *  Only a well-formed Stripe id (`txr_` + alphanumerics) is sent — an unset var
 *  or a leftover placeholder (e.g. "txr_PASTE_YOUR_TAX_RATE_ID_HERE") falls back
 *  to HT-only pricing instead of throwing "No such tax rate" (a 500) at Stripe. */
function taxRates(): string[] | undefined {
  return /^txr_[A-Za-z0-9]+$/.test(TAX_RATE_ID) ? [TAX_RATE_ID] : undefined;
}

// Reverse lookup: Stripe price id → { plan, cycle }. Lets webhooks map a
// subscription's price back to our plan when Stripe (not us) is the source.
const PRICE_TO_PLAN: Record<string, { plan: string; cycle: string }> = Object.entries(
  PRICE_IDS,
).reduce((acc, [plan, cycles]) => {
  for (const [cycle, id] of Object.entries(cycles)) acc[id] = { plan, cycle };
  return acc;
}, {} as Record<string, { plan: string; cycle: string }>);

function frontendUrl(): string {
  return process.env.STRIPE_RETURN_URL || process.env.FRONTEND_PUBLIC_URL || 'http://localhost:3001';
}

// Current-period end (the next renewal date, unix seconds). As of Stripe API
// 2025-03-31.basil (SDK v18+, we're on v22), `current_period_end` no longer sits
// on the Subscription object — it moved onto each subscription ITEM. Read the
// item first, then fall back to the legacy top-level field for older API
// versions. This is why `cancel_at` (still top-level) rendered but the renewal
// date came back empty.
function periodEnd(sub: Stripe.Subscription): number | null {
  const s = sub as any;
  return s?.items?.data?.[0]?.current_period_end ?? s?.current_period_end ?? null;
}

// ── CRM Gestion forwarding config ─────────────────────────────────────────────
// On every subscription payment (and failure/cancellation) we POST a JSON
// payload to the external "CRM Gestion" platform.
//
// Two auth modes, auto-detected:
//   • OAuth2 (real CRM): set CRM_TOKEN_URL + CRM_CLIENT_ID + CRM_CLIENT_SECRET.
//     We fetch a client_credentials access token (cached) and send it as Bearer.
//   • Static key (local fake CRM): leave CRM_TOKEN_URL empty and set CRM_API_KEY.
// If CRM_HMAC_SECRET is set we also HMAC-sign the raw body (fake CRM verifies it;
// the real CRM ignores unknown headers — harmless).
//
// Real CRM (confirmed 2026-07-30 by the CRM dev):
//   POST https://api-gestion.winaity.com/api/webhook/abonnement
//   token: POST https://api-gestion.winaity.com/oauth/token (client_credentials,
//          form-urlencoded). ⚠️ always api-gestion.*, never gestion.winaity.com
//          (that host 307-redirects and the POST body is lost).
//   scope: MUST NOT be requested — the CRM ignores the `scope` param and grants
//          the scopes configured on the client ("full").
//   token TTL 1h, rate limit 1000 req/h → the cache below is mandatory.
const CRM = {
  enabled: process.env.CRM_FORWARD_ENABLED === 'true',
  url: process.env.CRM_API_URL || '',
  apiKey: process.env.CRM_API_KEY || '',
  hmacSecret: process.env.CRM_HMAC_SECRET || '',
  // OAuth2 client-credentials (real CRM)
  tokenUrl: process.env.CRM_TOKEN_URL || '',
  clientId: process.env.CRM_CLIENT_ID || '',
  clientSecret: process.env.CRM_CLIENT_SECRET || '',
  scope: process.env.CRM_SCOPE || '',
  // Which event_type values the CRM currently accepts. Its DTO validation is
  // STRICT — an event_type (or any field) it doesn't know about is rejected with
  // 400 — and as of 2026-07-30 only `payment.succeeded` is live on their side.
  // The other four (payment.failed, payment.refunded, subscription.updated,
  // subscription.canceled) are built here and switch on by adding them to
  // CRM_EVENTS once the CRM dev confirms they're deployed. No redeploy needed.
  events: (process.env.CRM_EVENTS || 'payment.succeeded')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
const crmUsesOauth = () => Boolean(CRM.tokenUrl && CRM.clientId && CRM.clientSecret);

// Outcome of one CRM POST. `skipped` = we never sent it.
//
// The CRM webhook is ASYNCHRONOUS: it answers 202 "queued for recording" with a
// correlation_id and a status_url, then records the payment a moment later.
// Verified 2026-07-30: a FIRST send and a replay of the same event_id both return
// 202 with the SAME correlation_id (one record, no duplicate) — so the status code
// alone can't tell them apart. We keep the correlation_id in the logs because it's
// the only handle for asking the CRM dev what happened to a given payment
// (GET /api/webhook/status/<correlation_id> → status SUCCESS / … ).
type CrmResult = {
  ok: boolean;
  status?: number;
  correlationId?: string;
  skipped?: string;
  error?: string;
};

// Cached OAuth2 token (module-level so it survives across webhook calls).
let crmToken: { value: string; expiresAt: number } | null = null;

// The subscription id an invoice belongs to. Stripe keeps moving this field
// across API versions (top-level `subscription`, then under `parent`, then on
// the line item), so try every known location before giving up. A null result
// means this invoice isn't tied to a subscription (e.g. a one-off) → skip it.
function invoiceSubscriptionId(inv: Stripe.Invoice): string | null {
  const i = inv as any;
  const line = i?.lines?.data?.[0];
  const candidate =
    i?.subscription ??
    i?.parent?.subscription_details?.subscription ??
    line?.subscription ??
    line?.parent?.subscription_item_details?.subscription ??
    null;
  return typeof candidate === 'string' ? candidate : candidate?.id ?? null;
}

// Always UTC with an explicit `Z` offset — the CRM's DTO also accepts a naive
// date but would then read it in the CRM SERVER's timezone, silently shifting
// every payment date. toISOString() is what guarantees the offset is there.
function unixToIso(unix: number | null | undefined): string | null {
  return unix ? new Date(unix * 1000).toISOString() : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Total TVA on an invoice, in cents. Stripe keeps moving where tax lives: the
// legacy top-level `tax` field is no longer populated on newer API versions
// (v22 "basil"), where it sits in a `total_taxes` array (and, on the API version
// before that, `total_tax_amounts`). Sum whichever is present; last resort is
// TTC − HT (only reliable when there are no invoice-level discounts).
function invoiceTax(inv: Stripe.Invoice): number {
  const i = inv as any;
  if (typeof i.tax === 'number' && i.tax > 0) return i.tax;
  const arr = i.total_taxes ?? i.total_tax_amounts;
  if (Array.isArray(arr) && arr.length) {
    return arr.reduce((sum: number, t: any) => sum + (t.amount ?? 0), 0);
  }
  const ttc = i.amount_paid ?? i.total ?? null;
  if (typeof i.subtotal === 'number' && typeof ttc === 'number') {
    return Math.max(0, ttc - i.subtotal);
  }
  return 0;
}

@Controller('billing')
export class BillingController implements OnModuleInit {
  private authService: any;
  private stripe: Stripe;

  constructor(@Inject('AUTH_SERVICE') private readonly client: ClientGrpc) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  }

  onModuleInit() {
    this.authService = this.client.getService('AuthService');
  }

  // ── Create a Stripe Checkout Session and return its hosted URL ────────────
  @Post('checkout')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async createCheckout(
    @Req() req: any,
    @Body() body: { plan?: string; billing?: string },
  ) {
    const plan = body?.plan ?? '';
    const cycle = body?.billing === 'annual' ? 'annual' : 'monthly';
    const priceId = PRICE_IDS[plan]?.[cycle];
    if (!priceId) {
      throw new BadRequestException('Unknown plan or billing cycle');
    }

    const tenantId = req.user.tenant_id;
    const meta = { tenant_id: tenantId, plan, billing_cycle: cycle };

    // If the tenant already has a live subscription, this is a PLAN CHANGE (or a
    // "changed my mind after cancelling") — modify the existing subscription in
    // place rather than opening a second one. This also clears any scheduled
    // cancellation, so a re-purchase after cancelling immediately drops the
    // "your plan ends on …" state instead of leaving it dangling.
    const info: any = await firstValueFrom(
      this.authService.GetTenantBilling({ tenant_id: tenantId }),
    );
    if (info?.stripe_subscription_id) {
      try {
        const existing = await this.stripe.subscriptions.retrieve(
          info.stripe_subscription_id,
        );
        const liveStatuses = ['active', 'trialing', 'past_due', 'unpaid'];
        if (liveStatuses.includes((existing as any).status)) {
          const itemId = existing.items.data[0]?.id;
          const updated = await this.stripe.subscriptions.update(
            info.stripe_subscription_id,
            {
              items: itemId
                ? [{ id: itemId, price: priceId, tax_rates: taxRates() }]
                : undefined,
              cancel_at_period_end: false,
              cancel_at: null,
              proration_behavior: 'create_prorations',
              metadata: meta,
            },
          );
          // Apply the change to our tenant record immediately — don't wait for
          // the webhook (which may be delayed or, in dev, not running at all).
          // The webhook stays as a backstop / source of truth.
          await this.applyPlan({
            tenantId,
            plan,
            cycle,
            status: (updated as any).status || 'active',
            customerId:
              typeof updated.customer === 'string' ? updated.customer : info.stripe_customer_id || '',
            subscriptionId: updated.id,
          });
          // No Stripe redirect needed — go straight back to the dashboard.
          return { url: `${frontendUrl()}/dashboard?upgraded=1` };
        }
      } catch {
        /* subscription gone / unusable in Stripe — fall through to new checkout */
      }
    }

    // Embedded (not hosted) Checkout: the payment form is mounted INSIDE our own
    // /checkout page, so the user never gets bounced to a stripe.com page. We
    // return the session's client_secret instead of a redirect URL, and use
    // return_url (there is no success_url/cancel_url in embedded mode). Stripe
    // redirects to return_url once payment completes; the dashboard confirms the
    // session there so the plan lands even if the webhook is delayed (dev).
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      ui_mode: 'embedded_page',
      line_items: [{ price: priceId, quantity: 1, tax_rates: taxRates() }],
      customer_email: req.user.email || undefined,
      client_reference_id: tenantId,
      // metadata on the session (for checkout.session.completed) AND on the
      // subscription (for later subscription.updated/deleted events).
      metadata: meta,
      subscription_data: { metadata: meta },
      return_url: `${frontendUrl()}/dashboard?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
      allow_promotion_codes: true,
    });

    return { clientSecret: session.client_secret };
  }

  // ── Confirm a completed Checkout Session and apply the plan ───────────────
  // Called by the dashboard when the user returns from Stripe. Idempotent and
  // safe: we only trust a session that is paid AND whose tenant matches the
  // caller's own tenant. This is the primary path in dev (no webhook); the
  // webhook remains the source of truth in production.
  @Post('confirm')
  @UseGuards(AuthGuard)
  async confirm(@Req() req: any, @Body() body: { session_id?: string }) {
    const sessionId = (body?.session_id || '').trim();
    if (!sessionId) throw new BadRequestException('session_id is required');

    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    const tenantId = session.metadata?.tenant_id || (session.client_reference_id ?? '');
    // Only apply a session that belongs to the caller and is actually paid.
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('This checkout session does not belong to your account');
    }
    if (session.payment_status !== 'paid' && (session as any).status !== 'complete') {
      return { applied: false, plan: null };
    }

    const plan = session.metadata?.plan || '';
    const cycle = session.metadata?.billing_cycle || '';
    await this.applyPlan({
      tenantId,
      plan,
      cycle,
      status: 'active',
      customerId: typeof session.customer === 'string' ? session.customer : '',
      subscriptionId: typeof session.subscription === 'string' ? session.subscription : '',
    });
    return { applied: true, plan };
  }

  // ── Current tenant billing state (for the Facturation tab) ────────────────
  @Get()
  @UseGuards(AuthGuard)
  async getBilling(@Req() req: any) {
    const info: any = await firstValueFrom(
      this.authService.GetTenantBilling({ tenant_id: req.user.tenant_id }),
    );

    // Enrich with live Stripe details (card, next renewal, scheduled cancel)
    // when we have a subscription on file.
    let card: { brand: string; last4: string } | null = null;
    let currentPeriodEnd: number | null = null;
    let cancelAt: number | null = null;
    if (info?.stripe_subscription_id) {
      try {
        const sub = await this.stripe.subscriptions.retrieve(info.stripe_subscription_id, {
          expand: ['default_payment_method'],
        });
        currentPeriodEnd = periodEnd(sub);
        cancelAt = (sub as any).cancel_at ?? null;
        const pm: any = (sub as any).default_payment_method;
        if (pm?.card) card = { brand: pm.card.brand, last4: pm.card.last4 };
      } catch {
        /* subscription may have been deleted in Stripe — ignore */
      }
    }

    return {
      plan: info?.plan ?? 'free',
      billing_cycle: info?.billing_cycle || null,
      subscription_status: info?.subscription_status || null,
      card,
      current_period_end: currentPeriodEnd,
      cancel_at: cancelAt,
    };
  }

  // ── Plan usage + capabilities (drives UI gating + limit hints) ────────────
  @Get('usage')
  @UseGuards(AuthGuard)
  async getUsage(@Req() req: any) {
    const usage: any = await firstValueFrom(
      this.authService.GetTenantUsage({ tenant_id: req.user.tenant_id }),
    );
    const plan = usage?.plan ?? 'free';
    const limits = limitsFor(plan);
    return {
      plan,
      email_templates_created: Number(usage?.email_templates_created ?? 0),
      email_templates_limit: limits.emailTemplates,
      ai_interactions_used: Number(usage?.ai_interactions_used ?? 0),
      ai_interactions_limit: limits.aiInteractions,
      non_email_allowed: limits.nonEmailTemplates !== 0,
      can_invite_users: limits.canInviteUsers,
      can_create_api_keys: limits.canCreateApiKeys,
    };
  }

  // ── Consume one AI interaction (called by the AI chat route) ──────────────
  // Checks the plan's AI quota and, when the quota is finite, bumps the
  // lifetime counter. Returns 403 { code: 'ai_limit' } when the free tenant has
  // already used its single interaction. Unlimited plans are a no-op pass.
  @Post('ai/consume')
  @UseGuards(AuthGuard)
  async consumeAi(@Req() req: any) {
    const usage: any = await firstValueFrom(
      this.authService.GetTenantUsage({ tenant_id: req.user.tenant_id }),
    );
    const plan = usage?.plan ?? 'free';
    const limit = limitsFor(plan).aiInteractions;
    if (limit === null) {
      return { ok: true, remaining: null };
    }
    const used = Number(usage?.ai_interactions_used ?? 0);
    if (used >= limit) {
      throw new ForbiddenException({
        code: 'ai_limit',
        message:
          "Vous avez utilisé votre interaction gratuite avec l'assistant IA. Passez à un plan payant pour un usage illimité.",
      });
    }
    await firstValueFrom(
      this.authService.IncrementTenantUsage({
        tenant_id: req.user.tenant_id,
        kind: 'ai_interaction',
      }),
    );
    return { ok: true, remaining: Math.max(0, limit - used - 1) };
  }

  // ── Cancel the subscription (respects the annual 12-month commitment) ──────
  @Post('cancel')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async cancel(@Req() req: any) {
    const info: any = await firstValueFrom(
      this.authService.GetTenantBilling({ tenant_id: req.user.tenant_id }),
    );
    if (!info?.stripe_subscription_id) {
      throw new BadRequestException('No active subscription');
    }

    // Both cycles cancel the same way now: stop at the end of the current paid
    // period. For monthly that's the next month; for annual (a real yearly
    // charge, paid a full year in advance) that's the anniversary — so the
    // 12-month commitment is honoured automatically by the yearly interval, with
    // no need to compute a cancel_at date ourselves.
    const sub = await this.stripe.subscriptions.update(info.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    return { cancel_at: (sub as any).cancel_at ?? periodEnd(sub) ?? null };
  }

  // ── Reactivate: undo a scheduled cancellation on the current plan ─────────
  // Lets a tenant who cancelled (but is still within their paid period) resume
  // the SAME plan — clearing the "your plan ends on …" state. Switching to a
  // different plan is handled by createCheckout (which also clears the cancel).
  @Post('reactivate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async reactivate(@Req() req: any) {
    const info: any = await firstValueFrom(
      this.authService.GetTenantBilling({ tenant_id: req.user.tenant_id }),
    );
    if (!info?.stripe_subscription_id) {
      throw new BadRequestException('No active subscription');
    }
    const sub = await this.stripe.subscriptions.update(info.stripe_subscription_id, {
      cancel_at_period_end: false,
      cancel_at: null,
    });
    return { current_period_end: periodEnd(sub) };
  }

  // ── Replay historical payments into the CRM ───────────────────────────────
  // Payments collected BEFORE the CRM was wired up are missing on their side,
  // which skews their MRR and account seniority from day one. The chain is
  // replayable as-is: the CRM dedups on event_id (= our invoice id) and applies
  // no date bound, so re-POSTing an old invoice either records it or answers 202.
  //
  // Ordered oldest-first so seniority lands correctly, and throttled — the CRM
  // allows 1000 req/h, i.e. one every 3.6s. Keep `limit` modest (the request runs
  // synchronously: limit × delay_ms must stay under your proxy timeout) and just
  // run it again for the next page; re-running is harmless.
  @Post('crm/backfill')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('super_admin')
  async crmBackfill(
    @Body()
    body: { since?: string; limit?: number; delay_ms?: number; dry_run?: boolean },
  ) {
    if (!CRM.enabled) {
      throw new BadRequestException('CRM forwarding is disabled (CRM_FORWARD_ENABLED)');
    }
    const limit = Math.min(Math.max(Number(body?.limit) || 25, 1), 100);
    const rawDelay = Number(body?.delay_ms);
    const delayMs = Math.max(Number.isFinite(rawDelay) ? rawDelay : 4000, 0);
    const dryRun = body?.dry_run === true;

    let createdGte: number | undefined;
    if (body?.since) {
      const t = Date.parse(body.since);
      if (Number.isNaN(t)) throw new BadRequestException('`since` must be an ISO date');
      createdGte = Math.floor(t / 1000);
    }

    const page = await this.stripe.invoices.list({
      status: 'paid',
      limit,
      ...(createdGte ? { created: { gte: createdGte } } : {}),
    });
    // Stripe returns newest-first; replay chronologically.
    const invoices = [...page.data].reverse();

    const results: any[] = [];
    for (const inv of invoices) {
      const built = await this.buildInvoicePayload(inv, 'payment.succeeded');
      if (!built) {
        results.push({ invoice_id: inv.id, outcome: 'skipped', reason: 'no_tenant' });
        continue;
      }
      if (dryRun) {
        results.push({ invoice_id: inv.id, outcome: 'dry_run', payload: built.data });
        continue;
      }
      const res = await this.forwardToCrm('payment.succeeded', built.eventId, built.data);
      results.push({
        invoice_id: inv.id,
        // No "already recorded" outcome: the CRM answers 202 for a first send and
        // for a replay alike, so we can't tell them apart here. Replaying is
        // simply idempotent on their side — re-running this route is harmless.
        outcome: res.ok ? 'accepted' : 'failed',
        status: res.status ?? null,
        correlation_id: res.correlationId ?? null,
        reason: res.skipped || res.error || null,
      });
      if (delayMs) await sleep(delayMs);
    }

    const count = (o: string) => results.filter((r) => r.outcome === o).length;
    return {
      scanned: invoices.length,
      has_more: page.has_more,
      accepted: count('accepted'),
      skipped: count('skipped'),
      failed: count('failed'),
      dry_run: dryRun,
      results,
    };
  }

  // ── Stripe webhook — the source of truth for plan changes ─────────────────
  // NOTE: this route receives a RAW body (configured in main.ts) so the
  // signature can be verified. No AuthGuard — Stripe calls it, not a user.
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: any, @Headers('stripe-signature') signature: string) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(req.body, signature, secret);
    } catch (err: any) {
      throw new BadRequestException(`Webhook signature error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const tenantId = s.metadata?.tenant_id || (s.client_reference_id ?? '');
        if (tenantId) {
          await this.applyPlan({
            tenantId,
            plan: s.metadata?.plan || '',
            cycle: s.metadata?.billing_cycle || '',
            status: 'active',
            customerId: typeof s.customer === 'string' ? s.customer : '',
            subscriptionId: typeof s.subscription === 'string' ? s.subscription : '',
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.tenant_id || '';
        if (tenantId) {
          const priceId = sub.items.data[0]?.price?.id || '';
          const mapped = PRICE_TO_PLAN[priceId];
          const plan = mapped?.plan || sub.metadata?.plan || '';
          const cycle = mapped?.cycle || sub.metadata?.billing_cycle || '';

          // What we had on file BEFORE this event, so we can tell a real plan /
          // cycle change from the many other things that fire
          // subscription.updated (scheduled cancel, payment-method swap, …).
          // Only a real change is worth a CRM subscription.updated.
          let before: any = null;
          try {
            before = await firstValueFrom(
              this.authService.GetTenantBilling({ tenant_id: tenantId }),
            );
          } catch {
            /* unreachable — skip the change detection, still apply the plan */
          }

          await this.applyPlan({
            tenantId,
            plan,
            cycle,
            status: sub.status,
            customerId: typeof sub.customer === 'string' ? sub.customer : '',
            subscriptionId: sub.id,
          });

          const changed =
            before && plan && (before.plan !== plan || before.billing_cycle !== cycle);
          if (changed) {
            await this.forwardToCrm(
              'subscription.updated',
              event.id,
              await this.crmSubscriptionPayload(sub, tenantId, plan, cycle, sub.status),
            );
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.tenant_id || '';
        if (tenantId) {
          // Subscription fully ended → drop back to the free plan.
          await this.applyPlan({
            tenantId,
            plan: 'free',
            cycle: '',
            status: 'canceled',
            customerId: '',
            subscriptionId: '',
          });
          // Tell the CRM the subscription is gone.
          const priceId = sub.items.data[0]?.price?.id || '';
          const mapped = PRICE_TO_PLAN[priceId];
          await this.forwardToCrm(
            'subscription.canceled',
            event.id,
            await this.crmSubscriptionPayload(
              sub,
              tenantId,
              mapped?.plan || sub.metadata?.plan || '',
              mapped?.cycle || sub.metadata?.billing_cycle || '',
              'canceled',
            ),
          );
        }
        break;
      }
      // ── Payment lifecycle → CRM Gestion ─────────────────────────────────────
      // invoice.paid fires on the FIRST charge AND every monthly renewal — this
      // is the "each payment that happens" event. invoice.payment_failed fires
      // when a renewal charge fails. Both forward to the CRM; neither changes
      // our plan state (the subscription.* events already do that).
      case 'invoice.paid': {
        await this.forwardInvoiceToCrm(
          event.data.object as Stripe.Invoice,
          'payment.succeeded',
        );
        break;
      }
      case 'invoice.payment_failed': {
        await this.forwardInvoiceToCrm(
          event.data.object as Stripe.Invoice,
          'payment.failed',
        );
        break;
      }
      // A full or partial refund on a subscription invoice → payment.refunded.
      case 'charge.refunded': {
        await this.forwardRefundToCrm(event, event.data.object as Stripe.Charge);
        break;
      }
      default:
        break;
    }

    return { received: true };
  }

  private async applyPlan(args: {
    tenantId: string;
    plan: string;
    cycle: string;
    status: string;
    customerId: string;
    subscriptionId: string;
  }) {
    await firstValueFrom(
      this.authService.UpdateTenantPlan({
        tenant_id: args.tenantId,
        plan: args.plan,
        billing_cycle: args.cycle,
        subscription_status: args.status,
        stripe_customer_id: args.customerId,
        stripe_subscription_id: args.subscriptionId,
      }),
    );
  }

  // ── CRM Gestion forwarding ────────────────────────────────────────────────
  // Resolve the tenant (name + contact/billing details) AND its admin user for
  // the CRM payload. The tenant id is always known; the rest lives in
  // auth-service. Never throws — missing enrichment must not stop the payment
  // from being forwarded (we send what we have).
  private async crmParties(
    tenantId: string,
  ): Promise<{ tenant: any; admin: any }> {
    let tenant: any = { id: tenantId, name: '', phone: '', address: {} };
    let admin: any = null;

    try {
      const info: any = await firstValueFrom(
        this.authService.GetTenantBilling({ tenant_id: tenantId }),
      );
      tenant = {
        id: tenantId,
        name: info?.name || '',
        phone: info?.phone || '',
        address: {
          line: info?.address_line || '',
          postal_code: info?.postal_code || '',
          city: info?.city || '',
          country: info?.country || '',
        },
      };
    } catch {
      /* auth-service unreachable — send id-only, better than dropping the event */
    }

    try {
      const a: any = await firstValueFrom(
        this.authService.GetTenantAdmin({ tenant_id: tenantId }),
      );
      admin = {
        id: a?.id || '',
        first_name: a?.first_name || '',
        last_name: a?.last_name || '',
        email: a?.email || '',
      };
    } catch {
      /* no admin resolvable — omit rather than fail */
    }

    return { tenant, admin };
  }

  // Envelope for the subscription-level events (updated / canceled). There is no
  // invoice behind them, so the `payment` block carries plan + cycle + status and
  // nulls everywhere else — the CRM's DTO is strict, so keeping the SAME shape as
  // a payment event is what lets these ride the one agreed endpoint.
  //
  // NOTE: the CRM dev asked for a cancellation date + reason. The agreed schema
  // has no field for either, so nothing is invented here — `occurred_at` is the
  // cancellation time. Add canceled_at / cancel_reason only once he confirms the
  // exact names (an unknown field 400s the whole payload).
  private async crmSubscriptionPayload(
    sub: Stripe.Subscription,
    tenantId: string,
    plan: string,
    cycle: string,
    status: string,
  ): Promise<any> {
    const parties = await this.crmParties(tenantId);
    return {
      tenant: parties.tenant,
      admin: parties.admin,
      customer: {
        email: '',
        stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : '',
      },
      payment: {
        invoice_id: null,
        amount_ht: null,
        tva: null,
        amount_ttc: null,
        currency: sub.currency || null,
        plan,
        billing_cycle: cycle,
        status,
        subscription_status: sub.status,
        paid_at: null,
        next_payment_at: status === 'canceled' ? null : unixToIso(periodEnd(sub)),
        stripe_subscription_id: sub.id,
        hosted_invoice_url: null,
        invoice_pdf: null,
      },
    };
  }

  // Build the CRM payload for one Stripe invoice. Retrieves the subscription to
  // get our metadata (tenant_id), the plan/cycle (via price id) and the next
  // renewal date. Returns null when the invoice can't be attributed to a tenant.
  //
  // ⚠️ The field set here IS the contract agreed with the CRM dev — its DTO
  // rejects any unknown field with a 400. Don't add keys without coordinating.
  private async buildInvoicePayload(
    inv: Stripe.Invoice,
    eventType: 'payment.succeeded' | 'payment.failed',
  ): Promise<{ eventId: string; data: any } | null> {
    const subId = invoiceSubscriptionId(inv);
    if (!subId) return null; // not a subscription invoice — nothing to report

    let sub: Stripe.Subscription | null = null;
    try {
      sub = await this.stripe.subscriptions.retrieve(subId);
    } catch {
      /* subscription vanished — fall back to whatever the invoice carries */
    }

    const tenantId = sub?.metadata?.tenant_id || '';
    if (!tenantId) return null; // can't attribute the payment → skip

    const priceId = sub?.items?.data?.[0]?.price?.id || '';
    const mapped = PRICE_TO_PLAN[priceId];
    const i = inv as any;
    const parties = await this.crmParties(tenantId);

    return {
      // Dedup key on the CRM side. The invoice id is stable across Stripe webhook
      // re-deliveries AND across a historical backfill of the same invoice, so
      // both routes converge on the same record (replay ⇒ 202).
      eventId: inv.id || '',
      data: {
        tenant: parties.tenant,
        admin: parties.admin,
        customer: {
          email: i.customer_email || '',
          stripe_customer_id: typeof inv.customer === 'string' ? inv.customer : '',
        },
        payment: {
          invoice_id: inv.id,
          amount_ht: i.subtotal ?? null, // cents, pre-tax
          tva: invoiceTax(inv), // cents — total TVA (see helper: field moved across API versions)
          amount_ttc: (eventType === 'payment.succeeded' ? i.amount_paid : i.amount_due) ?? i.total ?? null,
          currency: inv.currency || null,
          plan: mapped?.plan || sub?.metadata?.plan || '',
          billing_cycle: mapped?.cycle || sub?.metadata?.billing_cycle || '',
          status: i.status || (eventType === 'payment.succeeded' ? 'paid' : 'failed'),
          subscription_status: sub?.status || null,
          paid_at: unixToIso(i.status_transitions?.paid_at ?? i.created),
          next_payment_at: sub ? unixToIso(periodEnd(sub)) : null,
          stripe_subscription_id: subId,
          hosted_invoice_url: i.hosted_invoice_url || null,
          invoice_pdf: i.invoice_pdf || null,
        },
      },
    };
  }

  private async forwardInvoiceToCrm(
    inv: Stripe.Invoice,
    eventType: 'payment.succeeded' | 'payment.failed',
  ): Promise<CrmResult> {
    if (!CRM.enabled) return { ok: false, skipped: 'disabled' };
    const built = await this.buildInvoicePayload(inv, eventType);
    if (!built) return { ok: false, skipped: 'no_tenant' };
    return this.forwardToCrm(eventType, built.eventId, built.data);
  }

  // A refund on a subscription invoice → payment.refunded. Reuses the exact same
  // payload shape (no new field names, so nothing to re-agree): invoice_id is the
  // ORIGINAL invoice, amount_ttc is the refunded amount in cents, status
  // 'refunded'. HT/TVA are only meaningful on a FULL refund — a partial refund
  // sends them null rather than inventing a split. `occurred_at` carries the
  // refund time (the schema has no refunded_at field).
  private async forwardRefundToCrm(
    event: Stripe.Event,
    ch: Stripe.Charge,
  ): Promise<CrmResult> {
    if (!CRM.enabled) return { ok: false, skipped: 'disabled' };

    const c = ch as any;
    const invoiceId = typeof c.invoice === 'string' ? c.invoice : c.invoice?.id || '';
    if (!invoiceId) return { ok: false, skipped: 'not_an_invoice_charge' }; // one-off charge

    let inv: Stripe.Invoice | null = null;
    try {
      inv = await this.stripe.invoices.retrieve(invoiceId);
    } catch {
      return { ok: false, skipped: 'invoice_not_found' };
    }

    const built = await this.buildInvoicePayload(inv, 'payment.succeeded');
    if (!built) return { ok: false, skipped: 'no_tenant' };

    const full = c.amount_refunded >= c.amount;
    const payment = built.data.payment;
    payment.status = 'refunded';
    payment.amount_ttc = c.amount_refunded ?? null;
    payment.amount_ht = full ? payment.amount_ht : null;
    payment.tva = full ? payment.tva : null;
    // A refund must NOT dedup against the original payment.succeeded, so the
    // event_id is the Stripe event id (unique per event, stable on re-delivery)
    // rather than the invoice id.
    return this.forwardToCrm('payment.refunded', event.id, built.data);
  }

  // POST a signed JSON payload to the CRM. Fire-and-forget: a CRM outage must
  // never make us return non-200 to Stripe (that would trigger Stripe retries
  // and could stall plan updates). Failures are logged; durable retry via an
  // outbox is the planned hardening step.
  private async forwardToCrm(
    eventType: string,
    eventId: string,
    data: { tenant: any; admin?: any; customer: any; payment: any },
  ): Promise<CrmResult> {
    if (!CRM.enabled) return { ok: false, skipped: 'disabled' };
    if (!CRM.url) {
      console.warn('[CRM] CRM_FORWARD_ENABLED=true but CRM_API_URL is empty — skipping');
      return { ok: false, skipped: 'no_url' };
    }
    // Never POST an event_type the CRM hasn't deployed — strict validation turns
    // it into a 400, which looks like a real failure in the logs.
    if (!CRM.events.includes(eventType)) {
      console.log(`[CRM] ${eventType} not in CRM_EVENTS — not sent (${eventId})`);
      return { ok: false, skipped: 'event_type_not_enabled' };
    }

    const payload: Record<string, any> = {
      event_id: eventId,
      event_type: eventType,
      occurred_at: new Date().toISOString(),
      ...data,
    };
    // The CRM's DTO validates nested objects: sending `admin: null` (auth-service
    // unreachable / no admin user) would 400 the whole payment. Drop the key
    // instead — losing the contact is better than losing the payment.
    if (!payload.admin) {
      delete payload.admin;
      console.warn(`[CRM] no admin resolved for ${eventType} ${eventId} — sending without it`);
    }
    const body = JSON.stringify(payload);

    // Auth header: OAuth2 bearer (real CRM) or static key (fake CRM).
    let authHeader: string;
    try {
      authHeader = crmUsesOauth()
        ? `Bearer ${await this.getCrmAccessToken()}`
        : `Bearer ${CRM.apiKey}`;
    } catch (err: any) {
      console.error(`[CRM] could not obtain access token (${eventType} ${eventId}):`, err?.message || err);
      return { ok: false, error: `token: ${err?.message || err}` };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    };
    // Only sign when a secret is configured (fake CRM verifies it).
    if (CRM.hmacSecret) {
      headers['X-Winaity-Signature'] = crypto
        .createHmac('sha256', CRM.hmacSecret)
        .update(body)
        .digest('hex');
    }

    try {
      const res = await fetch(CRM.url, { method: 'POST', headers, body });
      if (!res.ok) {
        const text = await res.text();
        console.error(
          `[CRM] forward failed (${eventType} ${eventId}): HTTP ${res.status} ${text}`,
        );
        return { ok: false, status: res.status, error: text.slice(0, 500) };
      }
      // 202 "queued for recording" is the normal success answer. The body carries
      // a correlation_id — log it: it's how you ask the CRM what became of this
      // payment, and the recording itself happens after this response.
      let correlationId: string | undefined;
      try {
        correlationId = JSON.parse(await res.text())?.correlation_id;
      } catch {
        /* non-JSON success body — nothing to correlate */
      }
      console.log(
        `[CRM] accepted ${eventType} ${eventId} → ${res.status}` +
          (correlationId ? ` correlation_id=${correlationId}` : ''),
      );
      return { ok: true, status: res.status, correlationId };
    } catch (err: any) {
      console.error(`[CRM] forward error (${eventType} ${eventId}):`, err?.message || err);
      return { ok: false, error: String(err?.message || err) };
    }
  }

  // OAuth2 client-credentials token for the real CRM, cached until ~60s before
  // it expires. Sends credentials both in the form body AND as HTTP Basic auth
  // — different OAuth2 servers expect one or the other; sending both is safe and
  // covers the common cases without needing to know which the CRM uses.
  private async getCrmAccessToken(): Promise<string> {
    const now = Date.now();
    if (crmToken && crmToken.expiresAt > now + 60_000) return crmToken.value;

    const form = new URLSearchParams({ grant_type: 'client_credentials' });
    form.set('client_id', CRM.clientId);
    form.set('client_secret', CRM.clientSecret);
    if (CRM.scope) form.set('scope', CRM.scope);

    const basic = Buffer.from(`${CRM.clientId}:${CRM.clientSecret}`).toString('base64');
    const res = await fetch(CRM.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
        Accept: 'application/json',
      },
      body: form.toString(),
    });
    if (!res.ok) {
      throw new Error(`token endpoint HTTP ${res.status} ${await res.text()}`);
    }
    const json: any = await res.json();
    const token = json.access_token;
    if (!token) throw new Error('token endpoint returned no access_token');
    const ttlMs = (Number(json.expires_in) || 3600) * 1000;
    crmToken = { value: token, expiresAt: now + ttlMs };
    return token;
  }
}
