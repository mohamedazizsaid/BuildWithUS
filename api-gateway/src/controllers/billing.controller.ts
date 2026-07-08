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
import { ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';
import { Roles, RolesGuard } from '../guards/roles.guard';
import { limitsFor } from '../plan-limits';

// ── Stripe price IDs (TEST mode) — must stay in sync with frontend/lib/plans.ts.
// All four are month-interval recurring prices. "annual" = cheaper monthly rate
// with a 12-month commitment (enforced on cancel), NOT a yearly lump charge.
const PRICE_IDS: Record<string, Record<string, string>> = {
  pro: {
    monthly: 'price_1TqZNu3SDTmZuxcVRdoiNXbh', // 25€/mois — flexible
    annual: 'price_1TqYDA3SDTmZuxcVMG7DwZn7', // 20€/mois — 12-mo commitment
  },
  pro_org: {
    monthly: 'price_1TqZNu3SDTmZuxcVAAtZ6hJc', // 55€/mois — flexible
    annual: 'price_1TqYLc3SDTmZuxcVF4VRSK10', // 50€/mois — 12-mo commitment
  },
};

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
              items: itemId ? [{ id: itemId, price: priceId }] : undefined,
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

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: req.user.email || undefined,
      client_reference_id: tenantId,
      // metadata on the session (for checkout.session.completed) AND on the
      // subscription (for later subscription.updated/deleted events).
      metadata: meta,
      subscription_data: { metadata: meta },
      // session_id lets the dashboard confirm + apply the plan on return, so
      // the upgrade lands even if the webhook is delayed / not running (dev).
      success_url: `${frontendUrl()}/dashboard?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl()}/pricing?canceled=1`,
      allow_promotion_codes: true,
    });

    return { url: session.url };
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
        currentPeriodEnd = (sub as any).current_period_end ?? null;
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

    // Annual = a 12-month commitment billed monthly. Cancelling must honour the
    // full term: the subscription keeps billing monthly until the 12th month,
    // then stops. We schedule cancel_at at (subscription start + 12 months).
    // Monthly = flexible → just stop at the end of the current paid period.
    if (info.billing_cycle === 'annual') {
      const current = await this.stripe.subscriptions.retrieve(
        info.stripe_subscription_id,
      );
      const startUnix =
        (current as any).start_date ?? (current as any).created ?? null;
      if (startUnix) {
        const end = new Date(startUnix * 1000);
        end.setMonth(end.getMonth() + 12);
        const commitmentEnd = Math.floor(end.getTime() / 1000);
        const nowUnix = Math.floor(Date.now() / 1000);
        if (commitmentEnd > nowUnix) {
          const sub = await this.stripe.subscriptions.update(
            info.stripe_subscription_id,
            { cancel_at: commitmentEnd },
          );
          return { cancel_at: (sub as any).cancel_at ?? commitmentEnd };
        }
      }
      // Commitment already served (or start unknown) → cancel at period end.
    }

    const sub = await this.stripe.subscriptions.update(info.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    return { cancel_at: (sub as any).cancel_at ?? (sub as any).current_period_end ?? null };
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
    return { current_period_end: (sub as any).current_period_end ?? null };
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
          await this.applyPlan({
            tenantId,
            plan: mapped?.plan || sub.metadata?.plan || '',
            cycle: mapped?.cycle || sub.metadata?.billing_cycle || '',
            status: sub.status,
            customerId: typeof sub.customer === 'string' ? sub.customer : '',
            subscriptionId: sub.id,
          });
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
        }
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
}
