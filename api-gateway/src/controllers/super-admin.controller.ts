import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Inject,
  OnModuleInit,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
// CommonJS import form (same as billing.controller): this project's tsconfig has
// allowSyntheticDefaultImports but NOT esModuleInterop, so `import Stripe from
// 'stripe'` crashes at runtime. `import = require` matches stripe's `export =`.
import Stripe = require("stripe");
import { AuthGuard } from "../guards/auth.guard";
import { Roles, RolesGuard } from "../guards/roles.guard";

// Current-period end (next renewal date, unix seconds). Mirrors billing.controller:
// as of Stripe API 2025-03-31.basil (SDK v18+), `current_period_end` moved from the
// Subscription onto each subscription ITEM. Read the item first, fall back to the
// legacy top-level field for older API versions.
function periodEnd(sub: Stripe.Subscription): number | null {
  const s = sub as any;
  return s?.items?.data?.[0]?.current_period_end ?? s?.current_period_end ?? null;
}

/**
 * SuperAdminController — cross-tenant admin panel routes (prefix: /auth/admin).
 *
 * Every route is restricted to the `super_admin` role. Unlike the rest of the
 * gateway (which scopes everything to req.user.tenant_id from the JWT), these
 * routes deliberately operate ACROSS tenants — that is the whole point of the
 * super-admin dashboard.
 *
 * Tenant + API-key admin routes still live in AuthController; this controller
 * adds the user-management and cross-tenant template routes.
 */
@Controller("auth/admin")
@UseGuards(AuthGuard, RolesGuard)
@Roles("super_admin")
export class SuperAdminController implements OnModuleInit {
  private authService: any;
  private templateQueryService: any;
  private templateCommandService: any;
  private readonly stripe: Stripe;
  // Whether a real Stripe secret key is configured. When false we still return
  // the tenant/subscription rows (from our DB), just without the live Stripe
  // enrichment — no crash, the "Commandes" view degrades gracefully.
  private readonly stripeReady: boolean;

  constructor(
    @Inject("AUTH_SERVICE") private readonly authClient: ClientGrpc,
    @Inject("TEMPLATE_QUERY_SERVICE") private readonly queryClient: ClientGrpc,
    @Inject("TEMPLATE_COMMAND_SERVICE")
    private readonly commandClient: ClientGrpc,
  ) {
    const key = process.env.STRIPE_SECRET_KEY || "";
    this.stripe = new Stripe(key);
    this.stripeReady = key.startsWith("sk_");
  }

  onModuleInit() {
    this.authService = this.authClient.getService("AuthService");
    this.templateQueryService =
      this.queryClient.getService("TemplateQueryService");
    this.templateCommandService =
      this.commandClient.getService("TemplateCommandService");
  }

  // ── Users (cross-tenant) ──────────────────────────────────────────────
  /** GET /auth/admin/users — every user across every tenant. */
  @Get("users")
  async listAllUsers() {
    return firstValueFrom(this.authService.ListAllUsers({}));
  }

  /** PATCH /auth/admin/users/:id/role — change a user's role. */
  @Patch("users/:id/role")
  async updateUserRole(
    @Param("id") id: string,
    @Body() body: { role?: string },
  ) {
    if (!body?.role) throw new BadRequestException("role is required");
    return firstValueFrom(
      this.authService.AdminUpdateUserRole({ user_id: id, role: body.role }),
    );
  }

  /** POST /auth/admin/users/:id/reset-password — set a new password. */
  @Post("users/:id/reset-password")
  async resetUserPassword(
    @Param("id") id: string,
    @Body() body: { password?: string },
  ) {
    if (!body?.password)
      throw new BadRequestException("password is required");
    return firstValueFrom(
      this.authService.AdminResetPassword({
        user_id: id,
        new_password: body.password,
      }),
    );
  }

  /** DELETE /auth/admin/users/:id — remove a user. */
  @Delete("users/:id")
  async deleteUser(@Param("id") id: string) {
    return firstValueFrom(this.authService.AdminDeleteUser({ user_id: id }));
  }

  // ── Tenants (cross-tenant) ────────────────────────────────────────────
  /**
   * PATCH /auth/admin/tenants/:id/plan — assign a plan to any tenant.
   *
   * Direct plan override (no Stripe). This is how we grant the non-purchasable
   * `internal` plan to our own company's tenants, or manually adjust a plan.
   */
  private static readonly ASSIGNABLE_PLANS = ["free", "pro", "pro_org", "internal"];

  @Patch("tenants/:id/plan")
  async setTenantPlan(
    @Param("id") id: string,
    @Body() body: { plan?: string },
  ) {
    const plan = (body?.plan || "").trim();
    if (!SuperAdminController.ASSIGNABLE_PLANS.includes(plan)) {
      throw new BadRequestException(
        `plan must be one of: ${SuperAdminController.ASSIGNABLE_PLANS.join(", ")}`,
      );
    }
    return firstValueFrom(
      this.authService.AdminSetTenantPlan({ tenant_id: id, plan }),
    );
  }

  // ── Subscriptions / Commandes (cross-tenant) ──────────────────────────
  /**
   * GET /auth/admin/subscriptions — one row per tenant for the super-admin
   * "Commandes" view: the plan + billing state we store, enriched with LIVE
   * Stripe data (next payment date, amount, real status) for tenants that hold
   * a `stripe_subscription_id`.
   *
   * Amounts come back as the price `unit_amount` in cents, and are HT (pre-tax) —
   * the TVA is applied via a Stripe Tax Rate at checkout, not baked into the
   * price. The frontend adds the 20% for the TTC display.
   *
   * Live Stripe calls are best-effort per tenant: a deleted/unreadable
   * subscription just yields `live: null` instead of failing the whole request.
   */
  @Get("subscriptions")
  async listSubscriptions() {
    const tenantsRes: any = await firstValueFrom(
      this.authService.ListAllTenants({}),
    );
    const tenants: any[] = tenantsRes.tenants || [];

    const rows = await Promise.all(
      tenants.map(async (t) => {
        const base = {
          tenant_id: t.id,
          tenant_name: t.name,
          plan: t.plan,
          billing_cycle: t.billing_cycle || null,
          subscription_status: t.subscription_status || null,
          stripe_customer_id: t.stripe_customer_id || null,
          stripe_subscription_id: t.stripe_subscription_id || null,
          created_at: t.created_at || null,
          live: null as null | {
            status: string | null;
            current_period_end: number | null;
            cancel_at_period_end: boolean;
            amount: number | null;
            currency: string;
            interval: string | null;
          },
        };

        if (t.stripe_subscription_id && this.stripeReady) {
          try {
            const sub = await this.stripe.subscriptions.retrieve(
              t.stripe_subscription_id,
              { expand: ["items.data.price"] },
            );
            const s = sub as any;
            const price = s?.items?.data?.[0]?.price;
            base.live = {
              status: s?.status ?? null,
              current_period_end: periodEnd(sub),
              cancel_at_period_end: !!s?.cancel_at_period_end,
              amount: price?.unit_amount ?? null,
              currency: price?.currency ?? "eur",
              interval: price?.recurring?.interval ?? null,
            };
          } catch {
            /* subscription gone / unreadable in Stripe — leave live = null */
          }
        }

        return base;
      }),
    );

    return { subscriptions: rows };
  }

  // ── Templates (cross-tenant) ──────────────────────────────────────────
  /**
   * GET /auth/admin/templates — every template across every tenant.
   *
   * ListTemplates is tenant-scoped, so we fan out one call per tenant and tag
   * each template with its owning tenant id + name. Tenant counts are small
   * (one per integrating tool / org), so this stays cheap.
   */
  @Get("templates")
  async listAllTemplates() {
    const tenantsRes: any = await firstValueFrom(
      this.authService.ListAllTenants({}),
    );
    const tenants: any[] = tenantsRes.tenants || [];

    const perTenant = await Promise.all(
      tenants.map(async (t) => {
        try {
          const res: any = await firstValueFrom(
            this.templateQueryService.ListTemplates({
              tenant_id: t.id,
              page: 1,
              limit: 200,
            }),
          );
          return (res.templates || []).map((tpl: any) => ({
            ...tpl,
            tenant_id: t.id,
            tenant_name: t.name,
          }));
        } catch {
          return [];
        }
      }),
    );

    return { templates: perTenant.flat() };
  }

  /** DELETE /auth/admin/tenants/:tenantId/templates/:id — delete any template. */
  @Delete("tenants/:tenantId/templates/:id")
  async deleteTemplate(
    @Req() req: any,
    @Param("tenantId") tenantId: string,
    @Param("id") id: string,
  ) {
    return firstValueFrom(
      this.templateCommandService.DeleteTemplate({
        id,
        user_id: req.user?.id || "",
        tenant_id: tenantId,
      }),
    );
  }
}
