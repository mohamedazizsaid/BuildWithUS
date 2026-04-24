import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { RegisterApiClientCommand } from '../register-api-client.command';
import { ApiClientRepository } from '../../../domain/repositories/api-client.repository';
import { TenantRepository } from '../../../domain/repositories/tenant.repository';
import { Tenant } from '../../../domain/entities/tenant.aggregate';

@CommandHandler(RegisterApiClientCommand)
export class RegisterApiClientHandler implements ICommandHandler<RegisterApiClientCommand> {
  private readonly logger = new Logger(RegisterApiClientHandler.name);

  constructor(
    @Inject('TENANT_REPOSITORY')
    private readonly tenantRepository: TenantRepository,
    @Inject('API_CLIENT_REPOSITORY')
    private readonly apiClientRepository: ApiClientRepository,
  ) {}

  async execute(command: RegisterApiClientCommand) {
    const tenant = Tenant.create(command.appName);
    await this.tenantRepository.save(tenant);
    this.logger.log(`Tenant created for ${command.appName}: ${tenant.getId()}`);

    const clientId = crypto.randomUUID();
    const clientSecret = crypto.randomBytes(32).toString('base64url');
    const clientSecretHash = await argon2.hash(clientSecret);

    const defaultScopes = command.scopes || 'templates:read templates:write';

    await this.apiClientRepository.save({
      id: crypto.randomUUID(),
      tenantId: tenant.getId(),
      clientId,
      clientSecretHash,
      scopes: defaultScopes,
      expiresAt: null,
      createdAt: new Date(),
    });

    this.logger.log(`API client registered: ${clientId} for tenant ${tenant.getId()}`);

    return {
      tenant_id: tenant.getId(),
      client_id: clientId,
      client_secret: clientSecret,
      scopes: defaultScopes,
    };
  }
}
