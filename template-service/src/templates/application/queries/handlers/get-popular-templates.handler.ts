import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetPopularTemplatesQuery } from '../get-popular-templates.query.js';
import { TemplateHttpMapper } from '../../../infrastructure/http/template.http-mapper.js';
import { TemplateOrmEntity } from '../../../infrastructure/persistence/entities/template.orm-entity.js';

/**
 * Get Popular Templates Handler
 *
 * Handles retrieving the most used templates.
 * Uses ORM entities directly for query optimization (usageCount is not part of domain).
 */
@QueryHandler(GetPopularTemplatesQuery)
export class GetPopularTemplatesHandler implements IQueryHandler<GetPopularTemplatesQuery, any> {
  private readonly logger = new Logger(GetPopularTemplatesHandler.name);

  constructor(
    @InjectRepository(TemplateOrmEntity)
    private readonly repository: Repository<TemplateOrmEntity>,
  ) {}

  async execute(query: GetPopularTemplatesQuery): Promise<any> {
    this.logger.debug(`Getting popular templates (limit: ${query.limit}, type: ${query.type || 'all'})`);

    const queryBuilder = this.repository.createQueryBuilder('template')
      .where('template.deletedAt IS NULL');

    if (query.type) {
      queryBuilder.andWhere('template.type = :type', { type: query.type.toLowerCase() });
    }

    queryBuilder
      .orderBy('template.usageCount', 'DESC')
      .addOrderBy('template.createdAt', 'DESC') // Secondary sort for templates with same usage count
      .take(Math.min(query.limit || 3, 10)); // Max 10 templates

    const entities = await queryBuilder.getMany();

    return {
      templates: entities.map((entity) => TemplateHttpMapper.fromOrmEntity(entity)),
    };
  }
}
