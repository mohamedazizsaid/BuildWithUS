import { Controller, UseFilters } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GrpcExceptionFilter } from '@winaity/shared-kernel';
import {
  TemplateQueryServiceController,
  TemplateQueryServiceControllerMethods,
  GetTemplateRequest,
  TemplateResponse,
  ListTemplatesRequest,
  ListTemplatesResponse,
  GetPopularTemplatesRequest,
  GetPopularTemplatesResponse,
  RenderTemplateRequest,
  RenderTemplateResponse,
} from 'proto/generated/template_queries';
import { HealthCheckRequest, HealthCheckResponse } from 'proto/generated/common';
import {
  HealthCheckQuery,
  GetTemplateQuery,
  ListTemplatesQuery,
  GetPopularTemplatesQuery,
  RenderTemplateQuery,
} from '../../application/queries/index.js';
import { Template } from '../../domain/entities/template.aggregate.js';
import { TemplateGrpcMapper } from './template.grpc-mapper.js';

/**
 * Template Queries gRPC Controller
 *
 * Handles all read operations for templates via gRPC.
 * Uses @UseFilters(GrpcExceptionFilter) for centralized error handling.
 */
@Controller()
@UseFilters(GrpcExceptionFilter)
@TemplateQueryServiceControllerMethods()
export class TemplatesQueriesGrpcController implements TemplateQueryServiceController {
  constructor(private readonly queryBus: QueryBus) {}

  /**
   * Health check endpoint
   */
  async healthCheck(_request: HealthCheckRequest): Promise<HealthCheckResponse> {
    const query = new HealthCheckQuery();
    return this.queryBus.execute<HealthCheckQuery, HealthCheckResponse>(query);
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(request: GetTemplateRequest): Promise<TemplateResponse> {
    const query = new GetTemplateQuery(request.id, request.userId, request.tenantId || '');
    const template = await this.queryBus.execute<GetTemplateQuery, Template>(query);

    return {
      template: TemplateGrpcMapper.toDto(template),
    };
  }

  /**
   * List templates with filtering and pagination
   */
  async listTemplates(request: ListTemplatesRequest): Promise<ListTemplatesResponse> {
    const query = new ListTemplatesQuery(
      request.page,
      request.limit,
      request.type,
      request.sortBy,
      request.ascending,
      request.search,
      request.userId,
      request.tenantId || '',
    );

    return this.queryBus.execute<ListTemplatesQuery, ListTemplatesResponse>(query);
  }

  /**
   * Get most used templates (for "Popular Templates" section)
   */
  async getPopularTemplates(request: GetPopularTemplatesRequest): Promise<GetPopularTemplatesResponse> {
    const query = new GetPopularTemplatesQuery(request.limit, request.type, request.userId);
    return this.queryBus.execute<GetPopularTemplatesQuery, GetPopularTemplatesResponse>(query);
  }

  /**
   * Render a template with variable substitution
   */
  async renderTemplate(request: RenderTemplateRequest): Promise<RenderTemplateResponse> {
    const query = new RenderTemplateQuery(request.id, request.variables, request.userId);
    return this.queryBus.execute<RenderTemplateQuery, RenderTemplateResponse>(query);
  }
}
