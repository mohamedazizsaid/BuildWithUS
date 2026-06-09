import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ListTemplatesQuery } from '../list-templates.query.js';
import { TemplateRepository } from '../../../domain/repositories/template.repository.js';
import type { ListTemplatesResponse, PaginationInfo } from 'proto/generated/template_queries';
import { TemplateGrpcMapper } from '../../../infrastructure/grpc/template.grpc-mapper.js';

/**
 * List Templates Handler
 *
 * Handles listing templates with filters and pagination.
 */
@QueryHandler(ListTemplatesQuery)
export class ListTemplatesHandler implements IQueryHandler<ListTemplatesQuery, ListTemplatesResponse> {
  private readonly logger = new Logger(ListTemplatesHandler.name);

  constructor(
    @Inject('TEMPLATE_REPOSITORY')
    private readonly templateRepository: TemplateRepository,
  ) {}

  async execute(query: ListTemplatesQuery): Promise<ListTemplatesResponse> {
    this.logger.debug('Listing templates');

    const { templates, total } = await this.templateRepository.findAll({
      tenantId: query.tenantId || undefined,
      externalOrgRef: query.externalOrgRef || undefined,
      type: query.type ? query.type.toLowerCase() : undefined,
      search: query.search || undefined,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      ascending: query.ascending,
      favoritesOnly: query.favoritesOnly || false,
      excludePredefinedOverrides: query.excludePredefinedOverrides || false,
      predefinedOverridesOnly: query.predefinedOverridesOnly || false,
    });

    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const totalPages = Math.ceil(total / limit);

    const pagination: PaginationInfo = {
      total,
      page,
      limit,
      totalPages: totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };

    return {
      templates: templates.map((t) => TemplateGrpcMapper.toDto(t)),
      pagination,
    };
  }
}
