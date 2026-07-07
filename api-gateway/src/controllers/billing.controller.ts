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
import { AuthGuard } from '../guards/auth.guard';
import { Roles, RolesGuard } from '../guards/roles.guard';

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

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: req.user.email || undefined,
      client_reference_id: tenantId,
      // metadata on the session (for checkout.session.completed) AND on the
      // subscription (for later subscription.updated/deleted events).
      metadata: meta,
      subscription_data: { metadata: meta },
      success_url: `${frontendUrl()}/dashboard?upgraded=1`,
      cancel_url: `${frontendUrl()}/pricing?canceled=1`,
      allow_promotion_codes: true,
    });

    return { url: session.url };
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

    // Monthly → stop at the end of the current period. Annual → also
    // cancel_at_period_end; the subscription bills monthly until the 12-month
    // commitment is served, so Stripe keeps charging until then. (Full
    // commitment scheduling can be tightened later with subscription schedules.)
    const sub = await this.stripe.subscriptions.update(info.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    return { cancel_at: (sub as any).cancel_at ?? (sub as any).current_period_end ?? null };
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
