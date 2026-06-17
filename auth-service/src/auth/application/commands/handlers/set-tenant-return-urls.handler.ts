import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SetTenantReturnUrlsCommand } from '../set-tenant-return-urls.command';
import { ApiClientRepository } from '../../../domain/repositories/api-client.repository';

/**
 * Dashboard counterpart to UpdateAllowedReturnUrls. The logged-in admin doesn't
 * hold the client_secret (shown once at creation), so this authorizes by tenant
 * ownership of the client instead of by secret. The gateway supplies tenantId
 * from the JWT — never from the request body.
 */
@CommandHandler(SetTenantReturnUrlsCommand)
export class SetTenantReturnUrlsHandler
  implements ICommandHandler<SetTenantReturnUrlsCommand>
{
  private readonly logger = new Logger(SetTenantReturnUrlsHandler.name);

  constructor(
    @Inject('API_CLIENT_REPOSITORY')
    private readonly apiClientRepository: ApiClientRepository,
  ) {}

  async execute(command: SetTenantReturnUrlsCommand) {
    const client = await this.apiClientRepository.findByClientId(command.clientId);
    if (!client) throw new NotFoundException('API client not found');
    if (client.tenantId !== command.tenantId) {
      throw new ForbiddenException('This API client does not belong to your organization');
    }

    const cleaned = command.urls
      .map((u) => (typeof u === 'string' ? u.trim() : ''))
      .filter(Boolean);

    for (const u of cleaned) {
      try {
        const parsed = new URL(u);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error('protocol must be http or https');
        }
      } catch {
        throw new Error(`Invalid URL: ${u}`);
      }
    }

    const stored = cleaned.length > 0 ? cleaned.join(',') : null;
    await this.apiClientRepository.updateAllowedReturnUrls(command.clientId, stored);

    this.logger.log(
      `Tenant ${command.tenantId} updated allowed_return_urls for client ${command.clientId} (${cleaned.length} URLs)`,
    );

    return { client_id: command.clientId, allowed_return_urls: cleaned };
  }
}
