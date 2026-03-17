import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetTemplateQuery } from '../get-template.query.js';
import { TemplateRepository } from '../../../domain/repositories/template.repository.js';
import { Template } from '../../../domain/entities/template.aggregate.js';
import { NotFoundException } from '@winaity/shared-kernel';

/**
 * Get Template Handler
 *
 * Handles retrieving a single template by ID.
 */
@QueryHandler(GetTemplateQuery)
export class GetTemplateHandler implements IQueryHandler<GetTemplateQuery, Template> {
  private readonly logger = new Logger(GetTemplateHandler.name);

  constructor(
    @Inject('TEMPLATE_REPOSITORY')
    private readonly templateRepository: TemplateRepository,
  ) {}

  async execute(query: GetTemplateQuery): Promise<Template> {
    this.logger.debug(`Getting template: ${query.id}`);

    const template = await this.templateRepository.findById(query.id, query.tenantId);

    if (!template) {
      throw new NotFoundException('Template', query.id);
    }

    return template;
  }
}
