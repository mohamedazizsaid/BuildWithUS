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
import { AuthGuard } from "../guards/auth.guard";
import { Roles, RolesGuard } from "../guards/roles.guard";

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

  constructor(
    @Inject("AUTH_SERVICE") private readonly authClient: ClientGrpc,
    @Inject("TEMPLATE_QUERY_SERVICE") private readonly queryClient: ClientGrpc,
    @Inject("TEMPLATE_COMMAND_SERVICE")
    private readonly commandClient: ClientGrpc,
  ) {}

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
