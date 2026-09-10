import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TemplateRepository, TemplateFilterOptions } from '../../../domain/repositories/template.repository.js';
import { Template } from '../../../domain/entities/template.aggregate.js';
import { TemplateOrmEntity } from '../entities/template.orm-entity.js';

/**
 * Template Repository Implementation
 *
 * TypeORM implementation of the TemplateRepository interface.
 * Handles all persistence operations for Template aggregates.
 */
@Injectable()
export class TemplateRepositoryImpl extends TemplateRepository {
  private readonly logger = new Logger(TemplateRepositoryImpl.name);

  constructor(
    @InjectRepository(TemplateOrmEntity)
    private readonly repository: Repository<TemplateOrmEntity>,
  ) {
    super();
  }

  /**
   * Find a template by ID
   */
  async findById(id: string, tenantId?: string, externalOrgRef?: string | null): Promise<Template | null> {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    if (externalOrgRef) where.externalOrgRef = externalOrgRef;
    const entity = await this.repository.findOne({ where });

    if (!entity) {
      return null;
    }

    return this.toAggregate(entity);
  }

  /**
   * Find all templates with optional filters
   */
  async findAll(options?: TemplateFilterOptions): Promise<{ templates: Template[]; total: number }> {
    const queryBuilder = this.repository.createQueryBuilder('template')
      .where('template.deleted_at IS NULL');

    // Apply filters
    if (options?.tenantId && options.tenantId.trim()) {
      queryBuilder.andWhere('template.tenant_id = :tenantId', { tenantId: options.tenantId.trim() });
    }

    if (options?.externalOrgRef && options.externalOrgRef.trim()) {
      queryBuilder.andWhere('template.external_org_ref = :externalOrgRef', { externalOrgRef: options.externalOrgRef.trim() });
    }

    if (options?.type && options.type.trim()) {
      queryBuilder.andWhere('LOWER(template.type) = :type', { type: options.type.toLowerCase().trim() });
    }

    if (options?.search && options.search.trim()) {
      queryBuilder.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        { search: `%${options.search.trim()}%` },
      );
    }

    if (options?.favoritesOnly) {
      queryBuilder.andWhere('template.is_favorite = true');
    }

    if (options?.excludePredefinedOverrides) {
      queryBuilder.andWhere('(template.is_predefined_override = false OR template.is_predefined_override IS NULL)');
    }

    if (options?.predefinedOverridesOnly) {
      queryBuilder.andWhere('template.is_predefined_override = true');
    }

    // Apply sorting — primary by sortBy, secondary by createdAt
    const sortColumnMap: Record<string, string> = {
      updatedAt: 'template.updated_at',
      updated_at: 'template.updated_at',
      createdAt: 'template.created_at',
      created_at: 'template.created_at',
      name: 'template.name',
      usageCount: 'template.usage_count',
      usage_count: 'template.usage_count',
    };
    const sortColumn = sortColumnMap[options?.sortBy || 'updatedAt'] || 'template.updated_at';
    const sortOrder = options?.ascending ? 'ASC' : 'DESC';
    queryBuilder
      .orderBy(sortColumn, sortOrder)
      .addOrderBy('template.created_at', sortOrder);

    // Apply pagination
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [entities, total] = await queryBuilder.getManyAndCount();

    const templates = entities.map((entity) => this.toAggregate(entity));

    return { templates, total };
  }

  /**
   * Find templates by type
   */
  async findByType(type: string): Promise<Template[]> {
    const entities = await this.repository.find({
      where: {
        type,
        deletedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return entities.map((entity) => this.toAggregate(entity));
  }

  /**
   * Save a template (create or update)
   */
  async save(template: Template): Promise<void> {
    const primitives = template.toPrimitives();

    const entity: Partial<TemplateOrmEntity> = {
      id: primitives.id,
      tenantId: primitives.tenantId,
      name: primitives.name,
      description: primitives.description || null,
      type: primitives.type,
      channels: primitives.channels || null,
      channelContents: primitives.channelContents || null,
      subject: primitives.subject || null,
      content: primitives.content,
      variables: primitives.variables || [],
      variants: primitives.variants || {},
      version: primitives.version,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
      deletedAt: primitives.deletedAt || null,
      isFavorite: primitives.isFavorite ?? false,
      isPredefinedOverride: primitives.isPredefinedOverride ?? false,
      predefinedTemplateId: primitives.predefinedTemplateId ?? null,
      externalOrgRef: primitives.externalOrgRef ?? null,
    };

    await this.repository.save(entity);

    this.logger.debug(`Template saved: ${primitives.id}`);
  }

  /**
   * Delete a template (soft delete)
   */
  async delete(id: string): Promise<void> {
    await this.repository.update(id, {
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    this.logger.debug(`Template soft deleted: ${id}`);
  }

  /**
   * Check if a template exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        id,
        deletedAt: IsNull(),
      },
    });

    return count > 0;
  }

  /**
   * Count templates with optional filters
   */
  async count(options?: { type?: string }): Promise<number> {
    const where: any = {
      deletedAt: IsNull(),
    };

    if (options?.type) {
      where.type = options.type;
    }

    return this.repository.count({ where });
  }

  /**
   * Find most popular templates (sorted by usage_count DESC)
   * Returns ORM entities directly for query optimization
   */
  async findPopular(limit: number = 3, type?: string): Promise<TemplateOrmEntity[]> {
    const queryBuilder = this.repository.createQueryBuilder('template')
      .where('template.deleted_at IS NULL');

    if (type) {
      queryBuilder.andWhere('LOWER(template.type) = :type', { type: type.toLowerCase() });
    }

    queryBuilder
      .orderBy('template.usage_count', 'DESC')
      .addOrderBy('template.created_at', 'DESC') // Secondary sort for templates with same usage count
      .take(Math.min(limit, 10)); // Max 10 templates

    return queryBuilder.getMany();
  }

  /**
   * Increment usage count for a template
   */
  async incrementUsageCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'usageCount', 1);
    this.logger.debug(`Template usage count incremented: ${id}`);
  }

  /**
   * Convert ORM entity to aggregate
   */
  private toAggregate(entity: TemplateOrmEntity): Template {
    return Template.reconstitute(
      entity.id,
      entity.tenantId,
      entity.name,
      entity.description || null,
      entity.type,
      entity.subject || null,
      entity.content,
      entity.variables || [],
      entity.channels || null,
      entity.channelContents || null,
      entity.variants || null,
      entity.createdAt,
      entity.updatedAt,
      entity.deletedAt || undefined,
      entity.version,
      entity.isFavorite ?? false,
      entity.isPredefinedOverride ?? false,
      entity.predefinedTemplateId ?? null,
      entity.externalOrgRef ?? null,
    );
  }
}
