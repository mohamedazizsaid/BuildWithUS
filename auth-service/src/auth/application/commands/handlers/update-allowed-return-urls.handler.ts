import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UpdateAllowedReturnUrlsCommand } from '../update-allowed-return-urls.command';
import { ApiClientRepository } from '../../../domain/repositories/api-client.repository';

@CommandHandler(UpdateAllowedReturnUrlsCommand)
export class UpdateAllowedReturnUrlsHandler
  implements ICommandHandler<UpdateAllowedReturnUrlsCommand>
{
  private readonly logger = new Logger(UpdateAllowedReturnUrlsHandler.name);

  constructor(
    @Inject('API_CLIENT_REPOSITORY')
    private readonly apiClientRepository: ApiClientRepository,
  ) {}

  async execute(command: UpdateAllowedReturnUrlsCommand) {
    const client = await this.apiClientRepository.findByClientId(command.clientId);
    if (!client) throw new UnauthorizedException('Invalid client credentials');

    const secretValid = await argon2.verify(client.clientSecretHash, command.clientSecret);
    if (!secretValid) throw new UnauthorizedException('Invalid client credentials');

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
      `Updated allowed_return_urls for client ${command.clientId} (${cleaned.length} URLs)`,
    );

    return { client_id: command.clientId, allowed_return_urls: cleaned };
  }
}
