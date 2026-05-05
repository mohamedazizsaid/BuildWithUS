import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeleteTenantVariableCommand } from '../delete-tenant-variable.command.js';
import { TenantVariablesOrmEntity } from '../../../infrastructure/persistence/entities/tenant-variables.orm-entity.js';

@CommandHandler(DeleteTenantVariableCommand)
export class DeleteTenantVariableHandler implements ICommandHandler<DeleteTenantVariableCommand> {
  constructor(
    @InjectRepository(TenantVariablesOrmEntity)
    private readonly repo: Repository<TenantVariablesOrmEntity>,
  ) {}

  async execute(command: DeleteTenantVariableCommand): Promise<{ success: boolean }> {
    await this.repo.delete({ tenantId: command.tenantId, name: command.name, isCustom: true });
    return { success: true };
  }
}
