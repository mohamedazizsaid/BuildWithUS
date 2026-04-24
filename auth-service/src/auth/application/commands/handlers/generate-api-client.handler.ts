import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { GenerateApiClientCommand } from '../generate-api-client.command';
import { ApiClientRepository } from '../../../domain/repositories/api-client.repository';
import { TenantRepository } from '../../../domain/repositories/tenant.repository';

@CommandHandler(GenerateApiClientCommand)
export class GenerateApiClientHandler implements ICommandHandler<GenerateApiClientCommand> {
  private readonly logger = new Logger(GenerateApiClientHandler.name);

  constructor(
    @Inject('API_CLIENT_REPOSITORY')
    private readonly apiClientRepository: ApiClientRepository,
    @Inject('TENANT_REPOSITORY')
    private readonly tenantRepository: TenantRepository,
  ) {}

  async execute(command: GenerateApiClientCommand) {
    const tenant = await this.tenantRepository.findById(command.tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${command.tenantId} not found`);
    }

    const clientId = crypto.randomUUID();
    const clientSecret = crypto.randomBytes(32).toString('base64url');
    const clientSecretHash = await argon2.hash(clientSecret);

    await this.apiClientRepository.save({
      id: crypto.randomUUID(),
      tenantId: command.tenantId,
      clientId,
      clientSecretHash,
      scopes: command.scopes,
      expiresAt: null,
      createdAt: new Date(),
    });

    this.logger.log(`Generated API client ${clientId} for tenant ${command.tenantId}`);

    return { client_id: clientId, client_secret: clientSecret };
  }
}
