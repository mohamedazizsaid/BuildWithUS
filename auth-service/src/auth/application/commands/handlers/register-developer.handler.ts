import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { RegisterDeveloperCommand } from '../register-developer.command';
import { ApiClientRepository } from '../../../domain/repositories/api-client.repository';
import { TenantRepository } from '../../../domain/repositories/tenant.repository';
import { Tenant } from '../../../domain/entities/tenant.aggregate';

@CommandHandler(RegisterDeveloperCommand)
export class RegisterDeveloperHandler implements ICommandHandler<RegisterDeveloperCommand> {
  private readonly logger = new Logger(RegisterDeveloperHandler.name);

  constructor(
    @Inject('TENANT_REPOSITORY')
    private readonly tenantRepository: TenantRepository,
    @Inject('API_CLIENT_REPOSITORY')
    private readonly apiClientRepository: ApiClientRepository,
  ) {}

  async execute(command: RegisterDeveloperCommand) {
    if (!command.name?.trim()) {
      throw new Error('name is required');
    }
    if (!command.email?.trim()) {
      throw new Error('email is required');
    }

    const tenant = Tenant.create(command.name.trim());
    await this.tenantRepository.save(tenant);

    const clientId = crypto.randomUUID();
    const clientSecret = crypto.randomBytes(32).toString('base64url');
    const clientSecretHash = await argon2.hash(clientSecret);

    const scopes = 'templates:read templates:write';

    await this.apiClientRepository.save({
      id: crypto.randomUUID(),
      tenantId: tenant.getId(),
      clientId,
      clientSecretHash,
      scopes,
      label: null,
      expiresAt: null,
      allowedReturnUrls: null,
      createdAt: new Date(),
    });

    this.logger.log(
      `Developer registered: tenant=${tenant.getId()} client=${clientId} email=${command.email}`,
    );

    return {
      tenant_id: tenant.getId(),
      client_id: clientId,
      client_secret: clientSecret,
      scopes,
    };
  }
}
