import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthGuard } from '../guards/auth.guard';
import { Roles, RolesGuard } from '../guards/roles.guard';
import { Scopes, ScopesGuard } from '../guards/scopes.guard';

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
@Controller('templates')
@UseGuards(AuthGuard, RolesGuard, ScopesGuard)
export class TemplateController implements OnModuleInit {
  private commandService: any; // gRPC client for write operations
  private queryService: any;   // gRPC client for read operations

  constructor(
    @Inject('TEMPLATE_COMMAND_SERVICE') private readonly commandClient: ClientGrpc,
    @Inject('TEMPLATE_QUERY_SERVICE') private readonly queryClient: ClientGrpc,
  ) {}

  // Get references to the gRPC services when the module starts
  onModuleInit() {
    this.commandService = this.commandClient.getService('TemplateCommandService');
    this.queryService = this.queryClient.getService('TemplateQueryService');
  }

  /**
   * POST /templates — Create a new template.
   * Frontend sends: { name, description, type, subject, content }
   * Gateway adds: user_id and tenant_id from JWT (req.user)
   */
  @Post()
  @Roles('admin', 'editor')
  @Scopes('templates:write')
  async create(@Req() req: any, @Body() body: any) {
    const result = await firstValueFrom(this.commandService.CreateTemplate({
      user_id: req.user.id,           // from JWT — who is creating
      tenant_id: req.user.tenant_id,  // from JWT — which organization
      name: body.name,
      description: body.description,
      type: body.type,                // 1=EMAIL, 2=FACTURE, 3=CONTRAT
      subject: body.subject,
      content: body.content,          // MJML or HTML content
      channel_contents: body.channelContents || [],
      channels: body.channels || [],
    }));
    return result;
  }

  /**
   * GET /templates — List all templates for the user's organization.
   * Supports pagination (?page=1&limit=10), filtering (?type=email),
   * searching (?search=invoice), and sorting (?sortBy=name&ascending=true).
   * Templates are filtered by tenant_id — users only see their org's templates.
   */
  @Get()
  @Scopes('templates:read')
  async list(@Req() req: any, @Query() query: any) {
    const result = await firstValueFrom(this.queryService.ListTemplates({
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10,
      type: query.type || '',
      search: query.search || '',
      sort_by: query.sortBy || '',
      ascending: query.ascending === 'true',
      favorites_only: query.favoritesOnly === 'true' || query.favorites_only === 'true',
    }));
    return result;
  }

  /**
   * GET /templates/:id — Get a single template by ID.
   * Only returns the template if it belongs to the user's organization.
   */
  @Get(':id')
  @Scopes('templates:read')
  async get(@Req() req: any, @Param('id') id: string) {
    const result = await firstValueFrom(this.queryService.GetTemplate({
      id,                              // template ID from URL
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
    }));
    return result;
  }

  /**
   * PUT /templates/:id — Update an existing template.
   * Frontend sends the fields to update (name, content, subject, etc.)
   */
  @Put(':id')
  @Roles('admin', 'editor')
  @Scopes('templates:write')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const result = await firstValueFrom(this.commandService.UpdateTemplate({
      id,
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      name: body.name,
      description: body.description,
      subject: body.subject,
      content: body.content,
      channel_contents: body.channelContents || [],
      channels: body.channels || [],
    }));
    return result;
  }

  /**
   * DELETE /templates/:id — Soft delete a template.
   * Sets deleted_at timestamp — template is hidden but not destroyed.
   */
  @Delete(':id')
  @Roles('admin', 'editor')
  @Scopes('templates:write')
  async delete(@Req() req: any, @Param('id') id: string) {
    const result = await firstValueFrom(this.commandService.DeleteTemplate({
      id,
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
    }));
    return result;
  }

  /**
   * PUT /templates/:id/favorite — Mark / unmark a template as favorite.
   * Body: { isFavorite: true | false }
   */
  @Put(':id/favorite')
  @Roles('admin', 'editor')
  @Scopes('templates:write')
  async toggleFavorite(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const result = await firstValueFrom(this.commandService.ToggleFavorite({
      id,
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      is_favorite: Boolean(body.isFavorite),
    }));
    return result;
  }

  /**
   * POST /templates/:id/duplicate — Clone an existing template.
   * Creates a copy with a new name (e.g. "Invoice Template (copy)").
   */
  @Post(':id/duplicate')
  @Roles('admin', 'editor')
  @Scopes('templates:write')
  async duplicate(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const result = await firstValueFrom(this.commandService.DuplicateTemplate({
      id,                              // ID of template to clone
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      name: body.name,                 // new name for the copy
    }));
    return result;
  }

  /**
   * POST /templates/:id/render — Fill in template variables with real values.
   * Takes: { variables: { "first_name": "Ahmed", "company": "Winaity" } }
   * Returns: rendered HTML with variables replaced.
   *
   * Template: "Hello {{first_name}} from {{company}}"
   * Rendered: "Hello Ahmed from Winaity"
   */
  @Post(':id/render')
  @Scopes('templates:read')
  async render(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const result = await firstValueFrom(this.queryService.RenderTemplate({
      id,
      user_id: req.user.id,
      variables: body.variables || {},
    }));
    return result;
  }

  /**
   * POST /templates/test-email — Send a test email with MJML content via MailHog.
   * Does NOT require a saved template — sends raw MJML/HTML content directly.
   */
  @Post('test-email')
  @Roles('admin', 'editor')
  async sendTestEmail(@Req() req: any, @Body() body: any) {
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
      host: process.env.MAILHOG_HOST || 'localhost',
      port: parseInt(process.env.MAILHOG_PORT || '1025'),
      ignoreTLS: true,
    });

    const to = body.to || req.user.email;
    const subject = body.subject || 'Test — Winaity Template Builder';
    const html = body.content || '<p>No content</p>';

    try {
      await transporter.sendMail({
        from: `"Winaity" <test@winaity.com>`,
        to,
        subject,
        html,
      });
      return { success: true, message: `E-mail de test envoyé à ${to}` };
    } catch (error) {
      console.error('Test email failed:', error);
      return { success: false, message: "Échec de l'envoi" };
    }
  }
}
