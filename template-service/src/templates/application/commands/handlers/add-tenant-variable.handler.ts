import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddTenantVariableCommand } from '../add-tenant-variable.command.js';
import { TenantVariablesOrmEntity } from '../../../infrastructure/persistence/entities/tenant-variables.orm-entity.js';

@CommandHandler(AddTenantVariableCommand)
export class AddTenantVariableHandler implements ICommandHandler<AddTenantVariableCommand> {
  constructor(
    @InjectRepository(TenantVariablesOrmEntity)
    private readonly repo: Repository<TenantVariablesOrmEntity>,
  ) {}

  async execute(command: AddTenantVariableCommand): Promise<{ success: boolean }> {
    if (!command.tenantId || !command.name) {
      throw new Error(`Missing fields: tenantId="${command.tenantId}" name="${command.name}"`);
    }
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(TenantVariablesOrmEntity)
      .values({ tenantId: command.tenantId, category: command.category, name: command.name, isCustom: true })
      .orIgnore()
      .execute();
    return { success: true };
  }
}
