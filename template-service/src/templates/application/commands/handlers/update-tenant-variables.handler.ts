import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateTenantVariablesCommand } from '../update-tenant-variables.command.js';
import { TenantVariablesOrmEntity } from '../../../infrastructure/persistence/entities/tenant-variables.orm-entity.js';

@CommandHandler(UpdateTenantVariablesCommand)
export class UpdateTenantVariablesHandler implements ICommandHandler<UpdateTenantVariablesCommand> {
  constructor(
    @InjectRepository(TenantVariablesOrmEntity)
    private readonly repo: Repository<TenantVariablesOrmEntity>,
  ) {}

  async execute(command: UpdateTenantVariablesCommand): Promise<{ customVariablesJson: string }> {
    if (!command.tenantId) return { customVariablesJson: '{}' };
    // Delete all existing custom vars for this tenant
    await this.repo.delete({ tenantId: command.tenantId, isCustom: true });

    // Insert new custom vars
    const customs: Partial<TenantVariablesOrmEntity>[] = [];
    for (const [category, names] of Object.entries(command.customVariables)) {
      for (const name of names) {
        customs.push({ tenantId: command.tenantId, category, name, isCustom: true });
      }
    }
    if (customs.length > 0) await this.repo.save(customs);

    // Return all vars (predefined + new custom)
    const allRows = await this.repo.find({ where: { tenantId: command.tenantId } });
    const grouped: Record<string, string[]> = {};
    for (const row of allRows) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push(row.name);
    }

    return { customVariablesJson: JSON.stringify(grouped) };
  }
}
