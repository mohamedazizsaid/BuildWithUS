import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  HttpCode,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { Response } from "express";
import { AuthGuard } from "../guards/auth.guard";
import { Roles, RolesGuard } from "../guards/roles.guard";
import { limitsFor } from "../plan-limits";
import { AuthClientService } from "../services/auth-client.service";
import * as nodemailer from "nodemailer";

/**
 * AuthController — handles all /auth/* REST routes via AuthClientService (HTTP/REST).
 */
@Controller("auth")
export class AuthController {
  private transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  constructor(private readonly authClient: AuthClientService) {}

  /**
   * POST /auth/register — PUBLIC
   */
  @Post("register")
  async register(@Body() body: any, @Res() res: Response) {
    const result = await this.authClient.register({
      tenant_name: body.tenantName || body.tenant_name,
      email: body.email,
      password: body.password,
      first_name: body.firstName || body.first_name,
      last_name: body.lastName || body.last_name,
      phone: body.phone,
      address_line: body.addressLine || body.address_line,
      postal_code: body.postalCode || body.postal_code,
      city: body.city,
      country: body.country,
    });

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({ user: result.user, token: result.token });
  }

  /**
   * POST /auth/login — PUBLIC
   */
  @Post("login")
  async login(@Body() body: any, @Res() res: Response) {
    const result = await this.authClient.login({
      email: body.email,
      password: body.password,
    });

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({ user: result.user, token: result.token });
  }

  /**
   * POST /auth/logout — PUBLIC
   */
  @Post("logout")
  async logout(@Res() res: Response) {
    const isProd = process.env.NODE_ENV === "production";
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
    });
    return res.json({ message: "Logged out" });
  }

  /**
   * GET /auth/me — PROTECTED
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

    return this.authClient.getMe(req.user.id);
  }

  /**
   * PUT /auth/profile — PROTECTED
   */
  @Put("profile")
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req: any, @Body() body: any) {
    return this.authClient.updateProfile({
      user_id: req.user.id,
      token: req.token,
      first_name: body.firstName || body.first_name,
      last_name: body.lastName || body.last_name,
    });
  }

  /**
   * PUT /auth/first-log — PROTECTED
   */
  @Put("first-log")
  @UseGuards(AuthGuard)
  async markFirstLog(@Req() req: any) {
    return this.authClient.markFirstLog(req.user.id);
  }

  /**
   * POST /auth/invite — PROTECTED
   */
  @Post("invite")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  async inviteUser(@Req() req: any, @Body() body: any) {
    const usage = await this.authClient.getTenantUsage(req.user.tenant_id);
    if (!limitsFor(usage?.plan).canInviteUsers) {
      throw new ForbiddenException({
        code: "plan_limit",
        limit: "invite_users",
        message:
          "L'invitation d'utilisateurs est réservée au plan Pro Organisation. Passez à ce plan pour ajouter des membres à votre organisation.",
      });
    }

    const result = await this.authClient.inviteUser({
      tenant_id: req.user.tenant_id,
      email: body.email,
      role: body.role || "editor",
      invited_by: req.user.id,
    });

    const frontendUrl = (
      process.env.FRONTEND_PUBLIC_URL ||
      (process.env.FRONTEND_ORIGIN || "").split(",")[0].trim() ||
      "http://localhost:3001"
    ).replace(/\/+$/, "");
    const inviteLink = `${frontendUrl}/invite?token=${result.invite.token}`;

    try {
      await this.transporter.sendMail({
        from: `"Build withUs" <${process.env.GMAIL_USER}>`,
        to: body.email,
        subject: "Invitation à rejoindre Build withUs",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Vous avez été invité sur Build withUs</h2>
            <p>Bonjour,</p>
            <p>Vous avez été invité à rejoindre l'espace de travail sur Build withUs avec le rôle <strong>${body.role || "editor"}</strong>.</p>
            <p>Cliquez sur le lien ci-dessous pour accepter l'invitation et créer votre mot de passe (valable 15 minutes) :</p>
            <p style="margin: 30px 0;">
              <a href="${inviteLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                Accepter l'invitation
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">Ou copiez ce lien : ${inviteLink}</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send invite email:", emailError);
    }

    return { success: true, message: "Invitation envoyée", invite: result.invite };
  }

  /**
   * POST /auth/accept-invite — PUBLIC
   */
  @Post("accept-invite")
  async acceptInvite(@Body() body: any, @Res() res: Response) {
    const result = await this.authClient.acceptInvite({
      token: body.token,
      password: body.password,
      first_name: body.firstName || body.first_name,
      last_name: body.lastName || body.last_name,
    });

    if (result?.token) {
      const isProd = process.env.NODE_ENV === "production";
      res.cookie("token", result.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    return res.json(result);
  }

  /**
   * POST /auth/forgot-password — PUBLIC
   */
  @Post("forgot-password")
  async forgotPassword(@Body() body: any) {
    const result = await this.authClient.requestPasswordReset(body.email);

    if (result?.token) {
      const frontendUrl = (
        process.env.FRONTEND_PUBLIC_URL ||
        (process.env.FRONTEND_ORIGIN || "").split(",")[0].trim() ||
        "http://localhost:3001"
      ).replace(/\/+$/, "");
      const resetLink = `${frontendUrl}/reset-password?token=${result.token}`;

      try {
        await this.transporter.sendMail({
          from: `"Build withUs" <${process.env.GMAIL_USER}>`,
          to: body.email,
          subject: "Réinitialisation de votre mot de passe — Build withUs",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Réinitialisation de mot de passe</h2>
              <p>Bonjour,</p>
              <p>Une demande de réinitialisation de mot de passe a été effectuée pour votre compte.</p>
              <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe (valable 1 heure) :</p>
              <p style="margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                  Réinitialiser mon mot de passe
                </a>
              </p>
              <p style="color: #666; font-size: 14px;">Ou copiez ce lien : ${resetLink}</p>
              <p style="color: #999; font-size: 12px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
            </div>
          `,
        });
      } catch (err) {
        console.error("Failed to send reset password email:", err);
      }
    }

    return { message: "Si cet email existe, un lien a été envoyé" };
  }

  /**
   * POST /auth/reset-password — PUBLIC
   */
  @Post("reset-password")
  async resetPassword(@Body() body: any) {
    return this.authClient.resetPassword(body.token, body.password);
  }

  /**
   * GET /auth/members — PROTECTED
   */
  @Get("members")
  @UseGuards(AuthGuard)
  async listMembers(@Req() req: any) {
    return this.authClient.listMembers(req.user.tenant_id);
  }

  /**
   * GET /auth/admin/tenants — PROTECTED (super_admin)
   */
  @Get("admin/tenants")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("super_admin")
  async listAllTenants() {
    return this.authClient.listAllTenants();
  }

  /**
   * PATCH /auth/admin/tenants/:id/plan — PROTECTED (super_admin)
   */
  @Patch("admin/tenants/:id/plan")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("super_admin")
  async updateTenantPlan(@Param("id") id: string, @Body() body: any) {
    return this.authClient.updateTenantPlan({
      tenant_id: id,
      plan: body.plan,
      billing_cycle: body.billing_cycle,
      subscription_status: body.subscription_status,
      stripe_customer_id: body.stripe_customer_id,
      stripe_subscription_id: body.stripe_subscription_id,
    });
  }

  /**
   * GET /auth/admin/tenants/:tenantId/api-clients — PROTECTED (super_admin)
   */
  @Get("admin/tenants/:tenantId/api-clients")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("super_admin")
  async listApiClients(@Param("tenantId") tenantId: string) {
    return this.authClient.listApiClients(tenantId);
  }

  /**
   * POST /auth/admin/tenants/:tenantId/api-clients — PROTECTED (super_admin)
   */
  @Post("admin/tenants/:tenantId/api-clients")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("super_admin")
  async generateApiClientForTenant(
    @Param("tenantId") tenantId: string,
    @Body() body: { scopes?: string },
  ) {
    return this.authClient.generateApiClient({
      tenant_id: tenantId,
      scopes: body.scopes || "templates:read templates:write",
    });
  }

  /**
   * DELETE /auth/admin/api-clients/:id — PROTECTED (super_admin)
   */
  @Delete("admin/api-clients/:id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("super_admin")
  async revokeApiClient(@Param("id") id: string) {
    return this.authClient.revokeApiClient(id);
  }
}

@Controller()
export class OAuthController {
  constructor(private readonly authClient: AuthClientService) {}

  @Post("oauth/token")
  @HttpCode(200)
  async issueToken(@Body() body: any) {
    const externalOrgRef =
      body?.custom_champ?.external_org_ref ||
      body?.external_org_ref ||
      body?.organisation_id;
    if (!externalOrgRef) {
      throw new BadRequestException(
        "custom_champ.external_org_ref is required to scope the token to an organization",
      );
    }
    return this.authClient.issueClientToken({
      client_id: body.client_id,
      client_secret: body.client_secret,
      user_id: body.user_id || "",
      organisation_id: externalOrgRef,
    });
  }

  @Post("oauth/register")
  @HttpCode(201)
  async registerApiClient(@Body() body: any) {
    return this.authClient.registerApiClient({
      app_name: body.app_name,
      contact_email: body.contact_email || "",
      scopes: body.scopes || "",
    });
  }
}

@Controller()
export class DevelopersController {
  constructor(private readonly authClient: AuthClientService) {}

  @Post("developers/return-urls")
  @HttpCode(200)
  async updateReturnUrls(@Body() body: any) {
    return this.authClient.updateAllowedReturnUrls({
      client_id: body.client_id,
      client_secret: body.client_secret,
      urls: Array.isArray(body.urls) ? body.urls : [],
    });
  }

  @Post("api/builder-sessions")
  @HttpCode(201)
  async mintSession(@Body() body: any) {
    const externalOrgRef =
      body?.custom_champ?.external_org_ref || body?.external_org_ref;
    if (!externalOrgRef) {
      throw new BadRequestException(
        "custom_champ.external_org_ref is required to scope the session to an organization",
      );
    }
    const result = await this.authClient.mintBuilderSession({
      client_id: body.client_id,
      client_secret: body.client_secret,
      mode: body.mode || "new",
      return_url: body.return_url,
      template_id: body.template_id || "",
      external_org_ref: externalOrgRef,
    });
    const frontend = process.env.FRONTEND_PUBLIC_URL || "http://localhost:3001";
    return {
      url: `${frontend}/s/${result.token}`,
      expires_at: result.expires_at,
    };
  }

  @Post("s/exchange")
  @HttpCode(200)
  async exchangeSession(@Body() body: any) {
    return this.authClient.exchangeBuilderSession(body.token);
  }
}

@Controller("integrations")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class IntegrationsController {
  private static readonly ALLOWED_SCOPES = "templates:read templates:write";

  constructor(private readonly authClient: AuthClientService) {}

  private async assertOwnership(tenantId: string, clientId: string) {
    const data = await this.authClient.listApiClients(tenantId);
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
    return this.authClient.listApiClients(req.user.tenant_id);
  }

  @Post("api-keys")
  @HttpCode(201)
  async createKey(@Req() req: any, @Body() body: { label?: string }) {
    const usage = await this.authClient.getTenantUsage(req.user.tenant_id);
    if (!limitsFor(usage?.plan).canCreateApiKeys) {
      throw new ForbiddenException({
        code: "plan_limit",
        limit: "api_keys",
        message:
          "La création de clés d'intégration API est réservée au plan Pro Organisation. Passez à ce plan pour connecter vos outils externes.",
      });
    }
    return this.authClient.generateApiClient({
      tenant_id: req.user.tenant_id,
      scopes: IntegrationsController.ALLOWED_SCOPES,
      label: (body?.label || "").trim(),
    });
  }

  @Delete("api-keys/:id")
  async revokeKey(@Req() req: any, @Param("id") id: string) {
    await this.assertOwnership(req.user.tenant_id, id);
    return this.authClient.revokeApiClient(id);
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
    await this.assertOwnership(req.user.tenant_id, body.client_id);
    return this.authClient.setTenantReturnUrls({
      tenant_id: req.user.tenant_id,
      client_id: body.client_id,
      urls: Array.isArray(body.urls) ? body.urls : [],
    });
  }
}
