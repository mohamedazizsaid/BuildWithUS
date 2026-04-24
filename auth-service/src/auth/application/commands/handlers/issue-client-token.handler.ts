import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { IssueClientTokenCommand } from '../issue-client-token.command';
import { ApiClientRepository } from '../../../domain/repositories/api-client.repository';
import { JwtService } from '../../services/jwt.service';

@CommandHandler(IssueClientTokenCommand)
export class IssueClientTokenHandler implements ICommandHandler<IssueClientTokenCommand> {
  private readonly logger = new Logger(IssueClientTokenHandler.name);

  constructor(
    @Inject('API_CLIENT_REPOSITORY')
    private readonly apiClientRepository: ApiClientRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: IssueClientTokenCommand) {
    const client = await this.apiClientRepository.findByClientId(command.clientId);
    if (!client) {
      throw new Error('Invalid client credentials');
    }

    const secretValid = await argon2.verify(client.clientSecretHash, command.clientSecret);
    if (!secretValid) {
      throw new Error('Invalid client credentials');
    }

    if (client.expiresAt && client.expiresAt < new Date()) {
      throw new Error('API client has expired');
    }

    const scopes = client.scopes.split(' ').filter(Boolean);

    const accessToken = this.jwtService.signM2M({
      tenantId: client.tenantId,
      userId: command.userId,
      organisationId: command.organisationId,
      scopes,
    });

    this.logger.log(`Issued M2M token for client ${command.clientId}`);

    return { access_token: accessToken, token_type: 'Bearer', expires_in: 3600 };
  }
}
