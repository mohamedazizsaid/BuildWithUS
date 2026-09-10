import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import Stripe = require("stripe");
import { AuthGuard } from "../guards/auth.guard";
import { Roles, RolesGuard } from "../guards/roles.guard";
import { AuthClientService } from "../services/auth-client.service";
import { TemplateClientService } from "../services/template-client.service";

// Period-end extractor (replicates billing.controller logic so this controller
// is self-contained). See billing.controller for why reading item-level first
// matters with newer Stripe API versions.
function periodEnd(sub: Stripe.Subscription): number | null {
  const s = sub as any;
  return (
    s?.items?.data?.[0]?.current_period_end ?? s?.current_period_end ?? null
  );
}

/**
 * SuperAdminController — cross-tenant administrative operations.
 *
 * Exposes /auth/admin/* routes consumed exclusively by the super-admin panel
 * (PlatformAdmin / Commandes / Users views). Protected by AuthGuard +
 * RolesGuard('super_admin') so only true platform operators can call them.
 */
@Controller("auth/admin")
@UseGuards(AuthGuard, RolesGuard)
@Roles("super_admin")
export class SuperAdminController {
  private readonly stripe: Stripe;
  private readonly stripeReady: boolean;

  constructor(
    private readonly authClient: AuthClientService,
    private readonly templateClient: TemplateClientService,
  ) {
    const key = process.env.STRIPE_SECRET_KEY || "";
    this.stripe = new Stripe(key || "sk_test_placeholder");
    this.stripeReady = Boolean(
      key && key.startsWith("sk_") && key !== "sk_test_placeholder",
    );
  }

  // ── Users (cross-tenant) ──────────────────────────────────────────────
  /** GET /auth/admin/users — every user across every tenant. */
  @Get("users")
  async listAllUsers() {
    return this.authClient.listAllUsers();
  }

  /** PATCH /auth/admin/users/:id/role — change a user's role. */
  @Patch("users/:id/role")
  async updateUserRole(
    @Param("id") id: string,
    @Body() body: { role?: string },
  ) {
    if (!body?.role) throw new BadRequestException("role is required");
    return this.authClient.adminUpdateUserRole({ user_id: id, role: body.role });
  }

  /** POST /auth/admin/users/:id/reset-password — set a new password. */
  @Post("users/:id/reset-password")
  async resetUserPassword(
    @Param("id") id: string,
    @Body() body: { password?: string },
  ) {
    if (!body?.password)
      throw new BadRequestException("password is required");
    return this.authClient.adminResetPassword({
      user_id: id,
      new_password: body.password,
    });
  }

  /** DELETE /auth/admin/users/:id — remove a user. */
  @Delete("users/:id")
  async deleteUser(@Param("id") id: string) {
    return this.authClient.adminDeleteUser(id);
  }

  // ── Tenants (cross-tenant) ────────────────────────────────────────────
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
    return this.authClient.adminSetTenantPlan(id, plan);
  }

  // ── Subscriptions / Commandes (cross-tenant) ──────────────────────────
  @Get("subscriptions")
  async listSubscriptions() {
    const tenantsRes: any = await this.authClient.listAllTenants();
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
  @Get("templates")
  async listAllTemplates() {
    const tenantsRes: any = await this.authClient.listAllTenants();
    const tenants: any[] = tenantsRes.tenants || [];

    const perTenant = await Promise.all(
      tenants.map(async (t) => {
        try {
          const res: any = await this.templateClient.listTemplates({
            tenant_id: t.id,
            page: 1,
            limit: 200,
          });
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
    return this.templateClient.deleteTemplate({
      id,
      user_id: req.user?.id || "",
      tenant_id: tenantId,
    });
  }
}
