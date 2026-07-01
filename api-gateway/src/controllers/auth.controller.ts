import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Req,
  Res,
  Inject,
  OnModuleInit,
  UseGuards,
  HttpCode,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { Response } from "express";
import { AuthGuard } from "../guards/auth.guard";
import { Roles, RolesGuard } from "../guards/roles.guard";
import * as nodemailer from "nodemailer";

/**
 * AuthController — handles all /auth/* REST routes.
 *
 * Translates HTTP requests from the frontend into gRPC calls to the auth-service.
 * Public routes: register, login, accept-invite, logout (no token needed)
 * Protected routes: me, profile, invite, members (token required via AuthGuard)
 */
@Controller("auth")
export class AuthController implements OnModuleInit {
  private authService: any;
  private transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  // Inject the AUTH_SERVICE gRPC client
  constructor(@Inject("AUTH_SERVICE") private readonly client: ClientGrpc) {}

  // Get a reference to the AuthService gRPC methods when the module starts
  onModuleInit() {
    this.authService = this.client.getService("AuthService");
  }

  /**
   * POST /auth/register — PUBLIC
   * Creates a new organization (tenant) + first user (admin).
   * Sets JWT token as httpOnly cookie so the user is logged in immediately.
   */
  @Post("register")
  async register(@Body() body: any, @Res() res: Response) {
    // Translate REST body (camelCase) → gRPC request (snake_case)
    const result: any = await firstValueFrom(
      this.authService.Register({
        tenant_name: body.tenantName,
        email: body.email,
        password: body.password,
        first_name: body.firstName,
        last_name: body.lastName,
      }),
    );

    // Set JWT as httpOnly cookie — browser sends it automatically on every request
    // httpOnly: true → JavaScript can't read it (protects against XSS attacks)
    // sameSite: 'lax' → cookie not sent to other websites (protects against CSRF)
    res.cookie("token", result.token, {
      httpOnly: true,
      secure: false, // true in production (HTTPS)
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24h
    });

    return res.json({ user: result.user });
  }

  /**
   * POST /auth/login — PUBLIC
   * Verifies email + password, returns user info and sets JWT cookie.
   */
  @Post("login")
  async login(@Body() body: any, @Res() res: Response) {
    const result: any = await firstValueFrom(
      this.authService.Login({
        email: body.email,
        password: body.password,
      }),
    );

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({ user: result.user });
  }

  /**
   * POST /auth/logout — PUBLIC
   * Clears the JWT cookie — user is no longer authenticated.
   */
  @Post("logout")
  async logout(@Res() res: Response) {
    res.clearCookie("token");
    return res.json({ message: "Logged out" });
  }

  /**
   * GET /auth/me — PROTECTED (requires valid JWT)
   * Returns the full user profile + tenant name.
   * Used by frontend on page load to check if user is logged in.
   */
  @Get("me")
  @UseGuards(AuthGuard)
  async getMe(@Req() req: any) {
    if (req.user.role === "m2m") {
      return {
        user: {
          id: req.user.id,
          tenant_id: req.user.tenant_id,
          role: "m2m",
          is_machine: true,
        },
        tenant_name: "",
        is_machine: true,
      };
    }

    const result = await firstValueFrom(
      this.authService.GetMe({ token: req.token }),
    );
    return result;
  }

  /**
   * PUT /auth/profile — PROTECTED
   * Updates the user's first name and last name.
   */
  @Put("profile")
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req: any, @Body() body: any) {
    const result = await firstValueFrom(
      this.authService.UpdateProfile({
        token: req.token,
        first_name: body.firstName,
        last_name: body.lastName,
      }),
    );
    return result;
  }

  /**
   * PUT /auth/first-log — PROTECTED
   * Marks the first-run onboarding tour as seen for the current user. Idempotent.
   */
  @Put("first-log")
  @UseGuards(AuthGuard)
  async markFirstLog(@Req() req: any) {
    const result = await firstValueFrom(
      this.authService.MarkFirstLog({ token: req.token }),
    );
    return result;
  }

  /**
   * POST /auth/invite — PROTECTED (admin only in practice)
   * Sends an invite to a new user. Returns a token-based invite link (expires in 15min).
   * tenant_id and invited_by are extracted from the JWT — frontend doesn't send them.
   */
  @Post("invite")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  async inviteUser(@Req() req: any, @Body() body: any) {
    const result: any = await firstValueFrom(
      this.authService.InviteUser({
        tenant_id: req.user.tenant_id,
        email: body.email,
        role: body.role || "editor",
        invited_by: req.user.id,
      }),
    );

    // Send invite email via Gmail. Use the public frontend URL in prod, falling
    // back to localhost only in dev. FRONTEND_PUBLIC_URL wins if set; otherwise
    // use the first origin from FRONTEND_ORIGIN (already set to the prod URL).
    const frontendUrl = (
      process.env.FRONTEND_PUBLIC_URL ||
      (process.env.FRONTEND_ORIGIN || "").split(",")[0].trim() ||
      "http://localhost:3001"
    ).replace(/\/+$/, "");
    const inviteLink = `${frontendUrl}/invite?token=${result.invite.token}`;
    console.log("Sending invite email to:", body.email);
    try {
      const emailResult = await this.transporter.sendMail({
        from: `Winaity <${process.env.GMAIL_USER}>`,
        to: body.email,
        subject: "You've been invited to join an organization on Winaity",
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #0f172a; border-radius: 8px; padding: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <span style="color: white; font-weight: bold; font-size: 18px;">W</span>
            </div>
            <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 8px;">You're invited!</h1>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
              You've been invited to join an organization on Winaity as <strong>${body.role || "editor"}</strong>.
            </p>
            <a href="${inviteLink}" style="display: inline-block; margin-top: 24px; padding: 12px 32px; background: #0f172a; color: white; text-decoration: none; border-radius: 50px; font-weight: 500; font-size: 14px;">
              Join Organization
            </a>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
              This link expires in 15 minutes. If you didn't expect this invite, you can safely ignore it.
            </p>
          </div>
        `,
      });
      console.log("Email sent:", emailResult.messageId);
    } catch (emailError) {
      console.error("Failed to send invite email:", emailError);
    }

    return result;
  }

  /**
   * POST /auth/accept-invite — PUBLIC
   * Invited user creates their account using the invite token.
   * The token contains: tenantId, email, role (set by the admin who invited them).
   * Sets JWT cookie so the user is logged in immediately after joining.
   */
  @Post("accept-invite")
  async acceptInvite(@Body() body: any, @Res() res: Response) {
    const result: any = await firstValueFrom(
      this.authService.AcceptInvite({
        token: body.token, // invite token from the link
        password: body.password,
        first_name: body.firstName,
        last_name: body.lastName,
      }),
    );

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({ user: result.user });
  }

  /**
   * POST /auth/forgot-password — PUBLIC
   * Sends a password reset link (expires in 15min) to the given email.
   * Always returns a generic success — we never reveal whether the account
   * exists. The auth-service only returns a token when a user is found, and
   * we only send the email in that case.
   */
  @Post("forgot-password")
  @HttpCode(200)
  async forgotPassword(@Body() body: any) {
    const email = (body.email || "").trim();
    const result: any = await firstValueFrom(
      this.authService.RequestPasswordReset({ email }),
    );

    if (result?.email_exists && result?.token) {
      // Use the public frontend URL in prod, falling back to localhost in dev.
      // FRONTEND_PUBLIC_URL wins if set; otherwise the first FRONTEND_ORIGIN.
      const frontendUrl = (
        process.env.FRONTEND_PUBLIC_URL ||
        (process.env.FRONTEND_ORIGIN || "").split(",")[0].trim() ||
        "http://localhost:3001"
      ).replace(/\/+$/, "");
      const resetLink = `${frontendUrl}/reset-password?token=${result.token}`;
      console.log("Sending password reset email to:", result.email);
      try {
        const emailResult = await this.transporter.sendMail({
          from: `Winaity <${process.env.GMAIL_USER}>`,
          to: result.email,
          subject: "Reset your Winaity password",
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: #0f172a; border-radius: 8px; padding: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                <span style="color: white; font-weight: bold; font-size: 18px;">W</span>
              </div>
              <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 8px;">Reset your password</h1>
              <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
                ${result.first_name ? `Hi ${result.first_name},<br/>` : ""}
                We received a request to reset your Winaity password. Click the button below to choose a new one.
              </p>
              <a href="${resetLink}" style="display: inline-block; margin-top: 24px; padding: 12px 32px; background: #0f172a; color: white; text-decoration: none; border-radius: 50px; font-weight: 500; font-size: 14px;">
                Reset password
              </a>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
                This link expires in 15 minutes. If you didn't request a password reset, you can safely ignore this email.
              </p>
            </div>
          `,
        });
        console.log("Reset email sent:", emailResult.messageId);
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
      }
    }

    // Generic response regardless of whether the account exists.
    return {
      message:
        "If an account exists for that email, a password reset link has been sent.",
    };
  }

  /**
   * POST /auth/reset-password — PUBLIC
   * Sets a new password using the reset token from the email link.
   */
  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(@Body() body: any) {
    const result: any = await firstValueFrom(
      this.authService.ResetPassword({
        token: body.token,
        password: body.password,
      }),
    );
    return result;
  }

  /**
   * GET /auth/members — PROTECTED
   * Lists all users in the same organization (tenant).
   * Used by admin to see who's in their team.
   */
  @Get("members")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  async listMembers(@Req() req: any) {
    const result = await firstValueFrom(
      this.authService.ListMembers({ token: req.token }),
    );
    return result;
  }

  // ── Super Admin endpoints (prefix: /auth) ────────────────────────────────

  @Get("admin/tenants")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("super_admin")
  async listAllTenants() {
    return firstValueFrom(this.authService.ListAllTenants({}));
  }

  @Get("admin/tenants/:tenantId/api-clients")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("super_admin")
  async listApiClients(@Param("tenantId") tenantId: string) {
    return firstValueFrom(this.authService.ListApiClients({ tenant_id: tenantId }));
  }

  @Post("admin/tenants/:tenantId/api-clients")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("super_admin")
  async generateApiClientForTenant(
    @Param("tenantId") tenantId: string,
    @Body() body: { scopes?: string },
  ) {
    return firstValueFrom(
      this.authService.GenerateApiClient({
        tenant_id: tenantId,
        scopes: body.scopes || "templates:read templates:write",
      }),
    );
  }

  @Delete("admin/api-clients/:id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("super_admin")
  async revokeApiClient(@Param("id") id: string) {
    return firstValueFrom(this.authService.RevokeApiClient({ id }));
  }
}

@Controller()
export class OAuthController implements OnModuleInit {
  private authService: any;

  constructor(@Inject("AUTH_SERVICE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.authService = this.client.getService("AuthService");
  }

  @Post("oauth/token")
  @HttpCode(200)
  async issueToken(@Body() body: any) {
    // M2M tokens are scoped to a single org of the calling tool. The org id rides
    // in custom_champ.external_org_ref (or organisation_id for backwards-compat)
    // and is baked into the token so /templates is auto-filtered to that org.
    const externalOrgRef =
      body?.custom_champ?.external_org_ref ||
      body?.external_org_ref ||
      body?.organisation_id;
    if (!externalOrgRef) {
      throw new BadRequestException(
        "custom_champ.external_org_ref is required to scope the token to an organization",
      );
    }
    return firstValueFrom(
      this.authService.IssueClientToken({
        client_id: body.client_id,
        client_secret: body.client_secret,
        user_id: body.user_id || "",
        organisation_id: externalOrgRef,
      }),
    );
  }

  @Post("oauth/register")
  @HttpCode(201)
  async registerApiClient(@Body() body: any) {
    return firstValueFrom(
      this.authService.RegisterApiClient({
        app_name: body.app_name,
        contact_email: body.contact_email || "",
        scopes: body.scopes || "",
      }),
    );
  }
}

@Controller()
export class DevelopersController implements OnModuleInit {
  private authService: any;

  constructor(@Inject("AUTH_SERVICE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.authService = this.client.getService("AuthService");
  }

  // NOTE: the old anonymous `POST /developers/register` route was removed.
  // It minted a brand-new orphan tenant per call (no owning account), which
  // caused integrations to silently lose their templates when a key was
  // regenerated. Keys are now issued only from inside a logged-in tenant
  // account via the tenant-scoped /integrations/* routes below.

  @Post("developers/return-urls")
  @HttpCode(200)
  async updateReturnUrls(@Body() body: any) {
    return firstValueFrom(
      this.authService.UpdateAllowedReturnUrls({
        client_id: body.client_id,
        client_secret: body.client_secret,
        urls: Array.isArray(body.urls) ? body.urls : [],
      }),
    );
  }

  @Post("api/builder-sessions")
  @HttpCode(201)
  async mintSession(@Body() body: any) {
    // The integrating tool tells us which of ITS organizations this session is
    // for, via a generic custom_champ object carrying a reserved external_org_ref
    // key (top-level external_org_ref also accepted as a convenience). This is the
    // isolation key stored on every template created in the session — required so
    // one tool's orgs never share a template pool.
    const externalOrgRef =
      body?.custom_champ?.external_org_ref || body?.external_org_ref;
    if (!externalOrgRef) {
      throw new BadRequestException(
        "custom_champ.external_org_ref is required to scope the session to an organization",
      );
    }
    const result: any = await firstValueFrom(
      this.authService.MintBuilderSession({
        client_id: body.client_id,
        client_secret: body.client_secret,
        mode: body.mode || "new",
        return_url: body.return_url,
        template_id: body.template_id || "",
        user_ref: externalOrgRef,
      }),
    );
    const frontend = process.env.FRONTEND_PUBLIC_URL || "http://localhost:3001";
    return {
      url: `${frontend}/s/${result.token}`,
      expires_at: result.expires_at,
    };
  }

  @Post("s/exchange")
  @HttpCode(200)
  async exchangeSession(@Body() body: any) {
    return firstValueFrom(
      this.authService.ExchangeBuilderSession({ token: body.token }),
    );
  }
}

/**
 * IntegrationsController — tenant self-service API keys (prefix: /integrations).
 *
 * Every route is behind the dashboard JWT and restricted to admins. The tenant
 * is always taken from the token (req.user.tenant_id), never the request body —
 * this is what replaces the old anonymous /developers/register flow and keeps a
 * key bound to a real, owning account.
 */
@Controller("integrations")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class IntegrationsController implements OnModuleInit {
  // Only these scopes can ever be granted through the dashboard. Whatever the
  // client sends is ignored — the set is fixed server-side.
  private static readonly ALLOWED_SCOPES = "templates:read templates:write";

  private authService: any;

  constructor(@Inject("AUTH_SERVICE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.authService = this.client.getService("AuthService");
  }

  /** Confirms a client_id belongs to the caller's tenant. Returns the tenant's
   *  clients so callers can reuse the list without a second round-trip. */
  private async assertOwnership(tenantId: string, clientId: string) {
    const data: any = await firstValueFrom(
      this.authService.ListApiClients({ tenant_id: tenantId }),
    );
    const clients = data.clients || [];
    const owned = clients.find(
      (c: any) => c.id === clientId || c.client_id === clientId,
    );
    if (!owned) {
      throw new NotFoundException("API key not found for your organization");
    }
    return { clients, owned };
  }

  @Get("api-keys")
  async listKeys(@Req() req: any) {
    return firstValueFrom(
      this.authService.ListApiClients({ tenant_id: req.user.tenant_id }),
    );
  }

  @Post("api-keys")
  @HttpCode(201)
  async createKey(@Req() req: any, @Body() body: { label?: string }) {
    return firstValueFrom(
      this.authService.GenerateApiClient({
        tenant_id: req.user.tenant_id,
        scopes: IntegrationsController.ALLOWED_SCOPES,
        label: (body?.label || "").trim(),
      }),
    );
  }

  @Delete("api-keys/:id")
  async revokeKey(@Req() req: any, @Param("id") id: string) {
    await this.assertOwnership(req.user.tenant_id, id);
    return firstValueFrom(this.authService.RevokeApiClient({ id }));
  }

  @Put("return-urls")
  @HttpCode(200)
  async setReturnUrls(
    @Req() req: any,
    @Body() body: { client_id?: string; urls?: string[] },
  ) {
    if (!body?.client_id) {
      throw new BadRequestException("client_id is required");
    }
    // Ownership is also re-checked in the handler, but failing fast here gives a
    // clean 404 before we touch the command bus.
    await this.assertOwnership(req.user.tenant_id, body.client_id);
    return firstValueFrom(
      this.authService.SetTenantReturnUrls({
        tenant_id: req.user.tenant_id,
        client_id: body.client_id,
        urls: Array.isArray(body.urls) ? body.urls : [],
      }),
    );
  }
}
