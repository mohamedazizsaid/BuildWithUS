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
  Inject,
  OnModuleInit,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { Response } from "express";
import { AuthGuard } from "../guards/auth.guard";
import { Roles, RolesGuard } from "../guards/roles.guard";
import { PdfService } from "../services/pdf.service";
import { TemplateRendererService } from "../services/template-renderer.service";
import { Scopes, ScopesGuard } from "../guards/scopes.guard";
import nodemailer from "nodemailer";

/**
 * TemplateController — handles all /templates/* REST routes.
 *
 * ALL routes are protected by AuthGuard (user must be logged in).
 * user_id and tenant_id are ALWAYS injected from the JWT — the frontend never sends them.
 * This ensures templates are scoped per tenant (multi-tenancy).
 *
 * Uses two gRPC clients:
 * - TEMPLATE_COMMAND_SERVICE → write operations (create, update, delete, duplicate)
 * - TEMPLATE_QUERY_SERVICE   → read operations (list, get, render)
 */
@Controller("templates")
@UseGuards(AuthGuard, RolesGuard, ScopesGuard)
export class TemplateController implements OnModuleInit {
  private commandService: any; // gRPC client for write operations
  private queryService: any; // gRPC client for read operations

  constructor(
    @Inject("TEMPLATE_COMMAND_SERVICE")
    private readonly commandClient: ClientGrpc,
    @Inject("TEMPLATE_QUERY_SERVICE") private readonly queryClient: ClientGrpc,
    private readonly pdfService: PdfService,
    private readonly renderer: TemplateRendererService,
  ) {}

  // Get references to the gRPC services when the module starts
  onModuleInit() {
    this.commandService = this.commandClient.getService(
      "TemplateCommandService",
    );
    this.queryService = this.queryClient.getService("TemplateQueryService");
  }

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
   * Used by external tools (CRM, Winlead...) to know what data to send.
   *
   * Example response:
   * {
   *   "template_id": "abc-123",
   *   "template_name": "Contrat B2C",
   *   "required_variables": ["client_nom", "client_email", "montant_ttc", ...]
   * }
   */
  @Get(":id/schema")
  @Roles("admin", "editor", "viewer", "marketing")
  @Scopes("templates:read")
  async getSchema(@Param("id") id: string, @Req() req: any) {
    const result = (await firstValueFrom(
      this.queryService.GetTemplate({ id, tenant_id: req.user.tenant_id, external_org_ref: req.user.external_org_ref || "" }),
    )) as any;
    const variables = this.renderer.extractVariables(result.content ?? "");
    return {
      template_id: result.id,
      template_name: result.name,
      template_type: result.type,
      required_variables: variables,
    };
  }

  /**
   * POST /templates/:id/generate
   * Full generation pipeline: load template → inject variables → render HTML → PDF.
   * This is the endpoint external tools (CRM, Winlead...) call to generate a document.
   *
   * Request body:
   * { "variables": { "client_nom": "Jean Dupont", "montant_ttc": "3000" } }
   *
   * Returns: PDF binary (application/pdf)
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
    const result = (await firstValueFrom(
      this.queryService.GetTemplate({ id, tenant_id: req.user.tenant_id, external_org_ref: req.user.external_org_ref || "" }),
    )) as any;


    const variables = body.variables ?? {};
    const template = result.template;

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
   * Frontend sends: { name, description, type, subject, content }
   * Gateway adds: user_id and tenant_id from JWT (req.user)
   */
  @Post()
  @Roles("admin", "editor", "marketing")
  @Scopes("templates:write")
  async create(@Req() req: any, @Body() body: any) {
    // Predefined gallery entries (is_predefined_override) can only be created by
    // the marketing team (or an admin). Regular editors create normal templates.
    if (body.isPredefinedOverride && !["marketing", "admin"].includes(req.user.role)) {
      throw new ForbiddenException(
        "Only marketing members can create predefined templates",
      );
    }
    const result = await firstValueFrom(
      this.commandService.CreateTemplate({
        user_id: req.user.id, // from JWT — who is creating
        tenant_id: req.user.tenant_id, // from JWT — which tenant (= which tool)
        external_org_ref: req.user.external_org_ref || "", // which org inside that tool (integration/M2M only)
        name: body.name,
        description: body.description,
        type: body.type, // 1=EMAIL, 2=FACTURE, 3=CONTRAT
        subject: body.subject,
        content: body.content, // MJML or HTML content
        channel_contents: body.channelContents || [],
        channels: body.channels || [],
        is_predefined_override: !!body.isPredefinedOverride,
        predefined_template_id: body.predefinedTemplateId || '',
      }),
    );
    return result;
  }

  /**
   * GET /templates — List all templates for the user's organization.
   * Supports pagination (?page=1&limit=10), filtering (?type=email),
   * searching (?search=invoice), and sorting (?sortBy=name&ascending=true).
   * Templates are filtered by tenant_id — users only see their org's templates.
   */
  @Get()
  @Scopes("templates:read")
  async list(@Req() req: any, @Query() query: any) {
    const result = await firstValueFrom(
      this.queryService.ListTemplates({
        user_id: req.user.id,
        tenant_id: req.user.tenant_id,
        external_org_ref: req.user.external_org_ref || "", // integration/M2M: only this org's templates; human: empty → all tenant templates
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
      }),
    );
    return result;
  }

  /**
   * GET /templates/:id — Get a single template by ID.
   * Only returns the template if it belongs to the user's organization.
   */
  @Get(":id")
  @Scopes("templates:read")
  async get(@Req() req: any, @Param("id") id: string) {
    const result = await firstValueFrom(
      this.queryService.GetTemplate({
        id, // template ID from URL
        user_id: req.user.id,
        tenant_id: req.user.tenant_id,
        external_org_ref: req.user.external_org_ref || "",
      }),
    );
    return result;
  }

  /**
   * PUT /templates/:id — Update an existing template.
   * Frontend sends the fields to update (name, content, subject, etc.)
   */
  @Put(":id")
  @Roles("admin", "editor", "marketing")
  @Scopes("templates:write")
  async update(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    const result = await firstValueFrom(
      this.commandService.UpdateTemplate({
        id,
        user_id: req.user.id,
        tenant_id: req.user.tenant_id,
        name: body.name,
        description: body.description,
        subject: body.subject,
        content: body.content,
        channel_contents: body.channelContents || [],
        channels: body.channels || [],
      }),
    );
    return result;
  }

  /**
   * DELETE /templates/:id — Soft delete a template.
   * Sets deleted_at timestamp — template is hidden but not destroyed.
   */
  @Delete(":id")
  @Roles("admin", "editor", "marketing")
  @Scopes("templates:write")
  async delete(@Req() req: any, @Param("id") id: string) {
    const result = await firstValueFrom(
      this.commandService.DeleteTemplate({
        id,
        user_id: req.user.id,
        tenant_id: req.user.tenant_id,
      }),
    );
    return result;
  }

  /**
   * PUT /templates/:id/favorite — Mark / unmark a template as favorite.
   * Body: { isFavorite: true | false }
   */
  @Put(":id/favorite")
  @Roles("admin", "editor", "marketing")
  @Scopes("templates:write")
  async toggleFavorite(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const result = await firstValueFrom(
      this.commandService.ToggleFavorite({
        id,
        user_id: req.user.id,
        tenant_id: req.user.tenant_id,
        is_favorite: Boolean(body.isFavorite),
      }),
    );
    return result;
  }

  /**
   * POST /templates/:id/duplicate — Clone an existing template.
   * Creates a copy with a new name (e.g. "Invoice Template (copy)").
   */
  @Post(":id/duplicate")
  @Roles("admin", "editor", "marketing")
  @Scopes("templates:write")
  async duplicate(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    const result = await firstValueFrom(
      this.commandService.DuplicateTemplate({
        id, // ID of template to clone
        user_id: req.user.id,
        tenant_id: req.user.tenant_id,
        name: body.name, // new name for the copy
      }),
    );
    return result;
  }

  /**
   * GET /templates/:id/render — Compile a template to ready-to-use HTML.
   *
   * Built for integrating tools: pass the template_id you received in the
   * builder callback (with your M2M Bearer token) to get back email-client-safe
   * HTML you can display or send from your own platform — exactly the same HTML
   * the builder dashboard previews.
   *
   * Email templates are stored as MJML; this compiles them via the official MJML
   * engine and returns plain HTML. (No variable substitution for now.)
   *
   * Response:
   * {
   *   "id":      "tpl_123",
   *   "name":    "Relance facture",
   *   "type":    "email",
   *   "subject": "Votre relance",
   *   "html":    "<!doctype html>…"   // ready to render / send
   * }
   *
   * Scoping: the template is fetched with the tenant_id + external_org_ref from
   * the token, so an organization can only render its own templates (404 otherwise).
   */
  @Get(":id/render")
  @Scopes("templates:read")
  async render(@Req() req: any, @Param("id") id: string) {
    const result = (await firstValueFrom(
      this.queryService.GetTemplate({
        id,
        user_id: req.user.id,
        tenant_id: req.user.tenant_id,
        external_org_ref: req.user.external_org_ref || "",
      }),
    )) as any;

    // GetTemplate wraps the payload in a `template` field (TemplateResponse).
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
   * POST /templates/:id/render-sms
   * Render an SMS template to its final text with variables injected.
   * Mirrors GET /templates/:id/render (same auth + tenant scoping) but, since
   * SMS is text-only, it accepts a variables map and returns plain text plus
   * GSM-7/UCS-2 encoding and segment count.
   *
   * This is the endpoint external tools (CRM, Winlead...) call to get a
   * ready-to-send SMS body.
   *
   * Request body:
   * { "variables": { "firstName": "Jean", "code": "4821" } }
   *
   * Example response:
   * {
   *   "id": "abc-123",
   *   "name": "Code de connexion",
   *   "type": "sms",
   *   "text": "Bonjour Jean, votre code est 4821",
   *   "encoding": "GSM-7",
   *   "characters": 33,
   *   "segments": 1,
   *   "variables_used": ["firstName", "code"]
   * }
   *
   * Scoping: fetched with the tenant_id + external_org_ref from the token, so an
   * organization can only render its own templates (404 otherwise).
   */
  @Post(":id/render-sms")
  @Scopes("templates:read")
  async renderSms(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { variables?: Record<string, string> },
  ) {
    const result = (await firstValueFrom(
      this.queryService.GetTemplate({
        id,
        user_id: req.user.id,
        tenant_id: req.user.tenant_id,
        external_org_ref: req.user.external_org_ref || "",
      }),
    )) as any;

    // GetTemplate wraps the payload in a `template` field (TemplateResponse).
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

  // proto-loader returns the enum name (e.g. "EMAIL"); expose a friendly lowercase
  // type. Falls back to a lowercased value for forward-compat.
  private normalizeTemplateType(type: unknown): string {
    const map: Record<string, string> = {
      EMAIL: "email",
      FACTURE: "facture",
      CONTRAT: "contrat",
      SMS: "sms",
      "1": "email",
      "2": "facture",
      "3": "contrat",
      "4": "sms",
    };
    return map[String(type)] ?? String(type ?? "").toLowerCase();
  }

  @Get("settings/custom-variables")
  @Roles("admin", "editor", "viewer", "super_admin", "marketing")
  async getCustomVariables(@Req() req: any) {
    const result: any = await firstValueFrom(
      this.queryService.GetTenantVariables({ tenant_id: req.user.tenant_id }),
    );
    const json = result?.custom_variables_json || result?.customVariablesJson || '{}';
    const namesJson = result?.custom_names_json || result?.customNamesJson || '[]';
    try {
      return { variables: JSON.parse(json), customNames: JSON.parse(namesJson) };
    } catch {
      return { variables: {}, customNames: [] };
    }
  }

  @Post("settings/custom-variables")
  @Roles("admin", "editor", "super_admin", "marketing")
  async addCustomVariable(@Req() req: any, @Body() body: { category: string; name: string }) {
    await firstValueFrom(
      this.commandService.AddTenantVariable({
        tenant_id: req.user.tenant_id,
        category: body.category,
        name: body.name,
      }),
    );
    return { success: true };
  }

  @Delete("settings/custom-variables/:name")
  @Roles("admin", "editor", "super_admin", "marketing")
  async deleteCustomVariable(@Req() req: any, @Param("name") name: string) {
    await firstValueFrom(
      this.commandService.DeleteTenantVariable({
        tenant_id: req.user.tenant_id,
        name,
      }),
    );
    return { success: true };
  }

  /**
   * POST /templates/test-email — Send a test email with MJML content via MailHog.
   * Does NOT require a saved template — sends raw MJML/HTML content directly.
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
  const subject = body.subject || "Test — Winaity Template Builder";
  const html = body.content || "<p>No content</p>";

  try {
    await transporter.sendMail({
      from: `"Winaity" <test@winaity.com>`,
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
