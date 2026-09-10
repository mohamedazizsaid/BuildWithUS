import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  HealthCheckQuery,
  GetTemplateQuery,
  ListTemplatesQuery,
  GetPopularTemplatesQuery,
  RenderTemplateQuery,
} from '../../application/queries/index.js';
import { GetTenantVariablesQuery } from '../../application/queries/get-tenant-variables.query.js';
import { Template } from '../../domain/entities/template.aggregate.js';
import { TemplateHttpMapper } from './template.http-mapper.js';

/**
 * Template Queries HTTP/REST Controller
 *
 * Handles read operations for templates via HTTP REST.
 */
@Controller()
export class TemplatesQueriesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  /**
   * GET /health — Health check endpoint
   */
  @Get('health')
  async healthCheck() {
    return { status: 'ok', service: 'template-service' };
  }

  /**
   * GET /templates/settings/custom-variables — Get tenant custom variables
   */
  @Get('templates/settings/custom-variables')
  async getTenantVariables(@Query('tenant_id') tenantId?: string) {
    const query = new GetTenantVariablesQuery(tenantId || '');
    return this.queryBus.execute(query);
  }

  /**
   * GET /templates/popular — Get most used templates
   */
  @Get('templates/popular')
  async getPopularTemplates(
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('user_id') userId?: string,
  ) {
    const query = new GetPopularTemplatesQuery(
      parseInt(limit || '5', 10),
      type,
      userId,
    );
    return this.queryBus.execute(query);
  }

  /**
   * GET /templates — List templates with filtering and pagination
   */
  @Get('templates')
  async listTemplates(@Query() req: any) {
    const query = new ListTemplatesQuery(
      parseInt(req.page || '1', 10),
      parseInt(req.limit || '10', 10),
      req.type,
      req.sort_by || req.sortBy || 'updatedAt',
      req.ascending === 'true' || req.ascending === true,
      req.search,
      req.user_id || req.userId,
      req.tenant_id || req.tenantId || '',
      req.favorites_only === 'true' || req.favoritesOnly === 'true' || req.favorites_only === true,
      req.exclude_predefined_overrides === 'true' || req.excludePredefinedOverrides === 'true' || req.exclude_predefined_overrides === true,
      req.predefined_overrides_only === 'true' || req.predefinedOverridesOnly === 'true' || req.predefined_overrides_only === true,
      req.external_org_ref || req.externalOrgRef || null,
    );

    return this.queryBus.execute(query);
  }

  /**
   * GET /templates/:id — Get a single template by ID
   */
  @Get('templates/:id')
  async getTemplate(@Param('id') id: string, @Query() req: any) {
    const query = new GetTemplateQuery(
      id,
      req.user_id || req.userId || '',
      req.tenant_id || req.tenantId || '',
      req.external_org_ref || req.externalOrgRef || null,
    );
    const template = await this.queryBus.execute<GetTemplateQuery, Template>(query);

    return {
      template: TemplateHttpMapper.toDto(template),
    };
  }

  /**
   * POST /templates/:id/render — Render a template with variable substitution
   */
  @Post('templates/:id/render')
  @HttpCode(HttpStatus.OK)
  async renderTemplate(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const query = new RenderTemplateQuery(
      id,
      body.variables || {},
      body.user_id || body.userId,
    );
    return this.queryBus.execute(query);
  }
}
