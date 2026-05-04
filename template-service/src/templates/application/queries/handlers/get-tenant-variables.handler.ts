import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetTenantVariablesQuery } from '../get-tenant-variables.query.js';
import { TenantVariablesOrmEntity } from '../../../infrastructure/persistence/entities/tenant-variables.orm-entity.js';
import { PREDEFINED_VARIABLES } from '../../services/predefined-variables.js';

@QueryHandler(GetTenantVariablesQuery)
export class GetTenantVariablesHandler implements IQueryHandler<GetTenantVariablesQuery> {
  constructor(
    @InjectRepository(TenantVariablesOrmEntity)
    private readonly repo: Repository<TenantVariablesOrmEntity>,
  ) {}

  async execute(query: GetTenantVariablesQuery): Promise<{ customVariablesJson: string }> {
    console.log('[GetTenantVariables] tenantId received:', JSON.stringify(query.tenantId));
    if (!query.tenantId) return { custom_variables_json: '{}' } as any;
    let rows = await this.repo.find({ where: { tenantId: query.tenantId } });
    console.log('[GetTenantVariables] rows found:', rows.length);

    if (rows.length === 0 && query.tenantId) {
      const seeds = PREDEFINED_VARIABLES.map((v) => ({
        tenantId: query.tenantId,
        category: v.category,
        name: v.name,
        isCustom: false,
      }));
      rows = await this.repo.save(seeds);
    }

    const grouped: Record<string, string[]> = {};
    for (const row of rows) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push(row.name);
    }

    return { custom_variables_json: JSON.stringify(grouped) } as any;
  }
}
