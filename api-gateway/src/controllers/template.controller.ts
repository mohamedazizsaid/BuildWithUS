import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { Response } from "express";
import { AuthGuard } from "../guards/auth.guard";
import { Roles, RolesGuard } from "../guards/roles.guard";
import { PdfService } from "../services/pdf.service";
import { TemplateRendererService } from "../services/template-renderer.service";
import { Scopes, ScopesGuard } from "../guards/scopes.guard";
import { limitsFor, isEmailType } from "../plan-limits";
import { TemplateClientService } from "../services/template-client.service";
import { AuthClientService } from "../services/auth-client.service";
import nodemailer from "nodemailer";

/**
 * TemplateController — handles all /templates/* REST routes via HTTP clients.
 *
 * ALL routes are protected by AuthGuard (user must be logged in).
 * user_id and tenant_id are ALWAYS injected from the JWT — the frontend never sends them.
 * This ensures templates are scoped per tenant (multi-tenancy).
 */
@Controller("templates")
@UseGuards(AuthGuard, RolesGuard, ScopesGuard)
export class TemplateController {
  constructor(
    private readonly templateClient: TemplateClientService,
    private readonly authClient: AuthClientService,
    private readonly pdfService: PdfService,
    private readonly renderer: TemplateRendererService,
  ) {}

  /**
   * POST /templates/render-pdf
   * Receives rendered HTML, returns a proper A4 PDF binary via Playwright.
   */
  @Post("render-pdf")
  @Roles("admin", "editor", "viewer", "marketing")
  async renderPdf(
    @Body() body: { html: string; name?: string },
    @Res() res: Response,
  ) {
    const pdf = await this.pdfService.generatePdf(
      body.html,
      body.name ?? "document",
    );
    const filename = encodeURIComponent(
      (body.name ?? "document").replaceAll(/\s+/g, "_"),
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.pdf"`,
    );
    res.setHeader("Content-Length", pdf.length);
    res.send(pdf);
  }

  /**
   * GET /templates/:id/schema
   * Returns the list of required {{variables}} for a given template.
   */
  @Get(":id/schema")
  @Roles("admin", "editor", "viewer", "marketing")
  @Scopes("templates:read")
  async getSchema(@Param("id") id: string, @Req() req: any) {
    const result: any = await this.templateClient.getTemplate({
      id,
      tenant_id: req.user.tenant_id,
      external_org_ref: req.user.external_org_ref || "",
    });
    const template = result?.template ?? result;
    const variables = this.renderer.extractVariables(template.content ?? "");
    return {
      template_id: template.id,
      template_name: template.name,
      template_type: template.type,
      required_variables: variables,
    };
  }

  /**
   * POST /templates/:id/generate
   * Full generation pipeline: load template → inject variables → render HTML → PDF.
   */
  @Post(":id/generate")
  @Roles("admin", "editor", "viewer", "marketing")
  @Scopes("templates:read")
  async generateDocument(
    @Param("id") id: string,
    @Req() req: any,
    @Body() body: { variables?: Record<string, string> },
    @Res() res: Response,
  ) {
    const result: any = await this.templateClient.getTemplate({
      id,
      tenant_id: req.user.tenant_id,
      external_org_ref: req.user.external_org_ref || "",
    });

    const variables = body.variables ?? {};
    const template = result?.template ?? result;

    const html = this.renderer.renderContractToHtml(template.content, variables);
    const pdf = await this.pdfService.generatePdf(html, template.name);

    const filename = encodeURIComponent(
      template.name.replaceAll(/\s+/g, "_"),
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.pdf"`,
    );
    res.setHeader("Content-Length", pdf.length);
    res.send(pdf);
  }

  /**
   * POST /templates — Create a new template.
   */
  @Post()
  @Roles("admin", "editor", "marketing")
  @Scopes("templates:write")
  async create(@Req() req: any, @Body() body: any) {
    if (body.isPredefinedOverride && !["marketing", "admin"].includes(req.user.role)) {
      throw new ForbiddenException(
        "Only marketing members can create predefined templates",
      );
    }

    const email = isEmailType(body.type);
    if (!body.isPredefinedOverride) {
      const usage = await this.authClient.getTenantUsage(req.user.tenant_id);
      const limits = limitsFor(usage?.plan);
      if (email) {
        const created = Number(usage?.email_templates_created ?? 0);
        if (limits.emailTemplates !== null && created >= limits.emailTemplates) {
          throw new ForbiddenException({
            code: "plan_limit",
            limit: "email_templates",
            message:
              "Vous avez atteint la limite de votre plan (1 template email). Passez à un plan payant pour créer plus de templates.",
          });
        }
      } else if (limits.nonEmailTemplates === 0) {
        throw new ForbiddenException({
          code: "plan_limit",
          limit: "non_email_templates",
          message:
            "Le plan gratuit ne permet que la création d'emails. Passez à un plan payant pour créer des factures, contrats, SMS et RCS.",
        });
      }
    }

    const result = await this.templateClient.createTemplate({
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      external_org_ref: req.user.external_org_ref || "",
      name: body.name,
      description: body.description,
      type: body.type,
      subject: body.subject,
      content: body.content,
      channel_contents: body.channelContents || [],
      channels: body.channels || [],
      is_predefined_override: !!body.isPredefinedOverride,
      predefined_template_id: body.predefinedTemplateId || "",
    });

    if (email && !body.isPredefinedOverride) {
      try {
        await this.authClient.incrementTenantUsage(req.user.tenant_id, "email_template");
      } catch {
        /* usage counter is best-effort — don't block a successful create */
      }
    }

    return result;
  }

  /**
   * GET /templates — List all templates for the user's organization.
   */
  @Get()
  @Scopes("templates:read")
  async list(@Req() req: any, @Query() query: any) {
    const result = await this.templateClient.listTemplates({
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      external_org_ref: req.user.external_org_ref || "",
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10,
      type: query.type || "",
      search: query.search || "",
      sort_by: query.sortBy || "",
      ascending: query.ascending === "true",
      favorites_only:
        query.favoritesOnly === "true" || query.favorites_only === "true",
      exclude_predefined_overrides:
        query.excludePredefinedOverrides === "true" || query.exclude_predefined_overrides === "true",
      predefined_overrides_only:
        query.predefinedOverridesOnly === "true" || query.predefined_overrides_only === "true",
    });

    if (result && Array.isArray(result.templates)) {
      result.templates = result.templates.map((t: any) => ({
        ...t,
        type: this.normalizeTemplateType(t.type),
        is_favorite: Boolean(t.is_favorite ?? t.isFavorite),
        is_predefined_override: Boolean(t.is_predefined_override ?? t.isPredefinedOverride),
        created_at: t.created_at || (t.createdAt ? new Date(typeof t.createdAt === 'number' && t.createdAt < 1e11 ? t.createdAt * 1000 : t.createdAt).toISOString() : ''),
        updated_at: t.updated_at || (t.updatedAt ? new Date(typeof t.updatedAt === 'number' && t.updatedAt < 1e11 ? t.updatedAt * 1000 : t.updatedAt).toISOString() : ''),
      }));
    }

    return result;
  }

  /**
   * GET /templates/:id — Get a single template by ID.
   */
  @Get(":id")
  @Scopes("templates:read")
  async get(@Req() req: any, @Param("id") id: string) {
    const result = await this.templateClient.getTemplate({
      id,
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      external_org_ref: req.user.external_org_ref || "",
    });

    const tmpl = result?.template ?? result;
    if (tmpl && typeof tmpl === 'object') {
      tmpl.type = this.normalizeTemplateType(tmpl.type);
      tmpl.is_favorite = Boolean(tmpl.is_favorite ?? tmpl.isFavorite);
      tmpl.is_predefined_override = Boolean(tmpl.is_predefined_override ?? tmpl.isPredefinedOverride);
      tmpl.created_at = tmpl.created_at || (tmpl.createdAt ? new Date(typeof tmpl.createdAt === 'number' && tmpl.createdAt < 1e11 ? tmpl.createdAt * 1000 : tmpl.createdAt).toISOString() : '');
      tmpl.updated_at = tmpl.updated_at || (tmpl.updatedAt ? new Date(typeof tmpl.updatedAt === 'number' && tmpl.updatedAt < 1e11 ? tmpl.updatedAt * 1000 : tmpl.updatedAt).toISOString() : '');
    }

    return result;
  }

  /**
   * PUT /templates/:id — Update an existing template.
   */
  @Put(":id")
  @Roles("admin", "editor", "marketing")
  @Scopes("templates:write")
  async update(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    return this.templateClient.updateTemplate({
      id,
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      name: body.name,
      description: body.description,
      subject: body.subject,
      content: body.content,
      channel_contents: body.channelContents || [],
      channels: body.channels || [],
    });
  }

  /**
   * DELETE /templates/:id — Soft delete a template.
   */
  @Delete(":id")
  @Roles("admin", "editor", "marketing")
  @Scopes("templates:write")
  async delete(@Req() req: any, @Param("id") id: string) {
    return this.templateClient.deleteTemplate({
      id,
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
    });
  }

  /**
   * PUT /templates/:id/favorite — Mark / unmark a template as favorite.
   */
  @Put(":id/favorite")
  @Roles("admin", "editor", "marketing")
  @Scopes("templates:write")
  async toggleFavorite(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.templateClient.toggleFavorite({
      id,
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      is_favorite: Boolean(body.isFavorite),
    });
  }

  /**
   * POST /templates/:id/duplicate — Clone an existing template.
   */
  @Post(":id/duplicate")
  @Roles("admin", "editor", "marketing")
  @Scopes("templates:write")
  async duplicate(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    return this.templateClient.duplicateTemplate({
      id,
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      name: body.name,
    });
  }

  /**
   * GET /templates/:id/render — Compile a template to ready-to-use HTML.
   */
  @Get(":id/render")
  @Scopes("templates:read")
  async render(@Req() req: any, @Param("id") id: string) {
    const result: any = await this.templateClient.getTemplate({
      id,
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      external_org_ref: req.user.external_org_ref || "",
    });

    const template = result?.template ?? result;
    const content: string = template.content ?? "";
    const html = await this.renderer.renderEmailHtml(content);

    return {
      id: template.id,
      name: template.name,
      type: this.normalizeTemplateType(template.type),
      subject: template.subject ?? "",
      html,
    };
  }

  /**
   * POST /templates/:id/render-sms — Render SMS text with variables.
   */
  @Post(":id/render-sms")
  @Scopes("templates:read")
  async renderSms(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { variables?: Record<string, string> },
  ) {
    const result: any = await this.templateClient.getTemplate({
      id,
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      external_org_ref: req.user.external_org_ref || "",
    });

    const template = result?.template ?? result;
    const content: string = template.content ?? "";
    const sms = this.renderer.renderSms(content, body.variables ?? {});

    return {
      id: template.id,
      name: template.name,
      type: this.normalizeTemplateType(template.type),
      text: sms.text,
      encoding: sms.encoding,
      characters: sms.characters,
      segments: sms.segments,
      variables_used: sms.variablesUsed,
    };
  }

  private normalizeTemplateType(type: unknown): string {
    const map: Record<string, string> = {
      EMAIL: "email",
      FACTURE: "facture",
      CONTRAT: "contrat",
      SMS: "sms",
      RCS: "rcs",
      "1": "email",
      "2": "facture",
      "3": "contrat",
      "4": "sms",
      "5": "rcs",
    };
    return map[String(type)] ?? String(type ?? "").toLowerCase();
  }

  @Get("settings/custom-variables")
  @Roles("admin", "editor", "viewer", "super_admin", "marketing")
  async getCustomVariables(@Req() req: any) {
    const result: any = await this.templateClient.getTenantVariables({
      tenant_id: req.user.tenant_id,
    });
    const json = result?.custom_variables_json || result?.customVariablesJson || "{}";
    const namesJson = result?.custom_names_json || result?.customNamesJson || "[]";
    try {
      return { variables: JSON.parse(json), customNames: JSON.parse(namesJson) };
    } catch {
      return { variables: {}, customNames: [] };
    }
  }

  @Post("settings/custom-variables")
  @Roles("admin", "editor", "super_admin", "marketing")
  async addCustomVariable(@Req() req: any, @Body() body: { category: string; name: string }) {
    await this.templateClient.addTenantVariable({
      tenant_id: req.user.tenant_id,
      category: body.category,
      name: body.name,
    });
    return { success: true };
  }

  @Delete("settings/custom-variables/:name")
  @Roles("admin", "editor", "super_admin", "marketing")
  async deleteCustomVariable(@Req() req: any, @Param("name") name: string) {
    await this.templateClient.deleteTenantVariable({
      tenant_id: req.user.tenant_id,
      name,
    });
    return { success: true };
  }

  /**
   * POST /templates/test-email — Send a test email with MJML content via MailHog.
   */
  @Post("test-email")
  @Roles("admin", "editor")
  async sendTestEmail(@Req() req: any, @Body() body: any) {
    const transporter = nodemailer.createTransport({
      host: process.env.MAILHOG_HOST || "localhost",
      port: parseInt(process.env.MAILHOG_PORT || "1025"),
      ignoreTLS: true,
    });

    const to = body.to || req.user.email;
    const subject = body.subject || "Test — Build withUs Template Builder";
    const html = body.content || "<p>No content</p>";

    try {
      await transporter.sendMail({
        from: `"Build withUs" <test@buildwithus.com>`,
        to,
        subject,
        html,
      });

      return { success: true, message: `E-mail de test envoyé à ${to}` };
    } catch (error) {
      console.error("Test email failed:", error);
      return { success: false, message: "Échec de l'envoi" };
    }
  }
}
