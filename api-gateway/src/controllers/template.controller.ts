import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthGuard } from '../guards/auth.guard';

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
@UseGuards(AuthGuard) // Every route in this controller requires a valid JWT
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
    }));
    return result;
  }

  /**
   * GET /templates/:id — Get a single template by ID.
   * Only returns the template if it belongs to the user's organization.
   */
  @Get(':id')
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
  async delete(@Req() req: any, @Param('id') id: string) {
    const result = await firstValueFrom(this.commandService.DeleteTemplate({
      id,
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
    }));
    return result;
  }

  /**
   * POST /templates/:id/duplicate — Clone an existing template.
   * Creates a copy with a new name (e.g. "Invoice Template (copy)").
   */
  @Post(':id/duplicate')
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
  async render(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const result = await firstValueFrom(this.queryService.RenderTemplate({
      id,
      user_id: req.user.id,
      variables: body.variables || {},  // key-value pairs to replace in template
    }));
    return result;
  }
}
