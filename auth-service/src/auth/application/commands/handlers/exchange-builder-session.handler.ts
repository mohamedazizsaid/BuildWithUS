import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { ExchangeBuilderSessionCommand } from '../exchange-builder-session.command';
import { BuilderSessionRepository } from '../../../domain/repositories/builder-session.repository';
import { JwtService } from '../../services/jwt.service';

@CommandHandler(ExchangeBuilderSessionCommand)
export class ExchangeBuilderSessionHandler
  implements ICommandHandler<ExchangeBuilderSessionCommand>
{
  private readonly logger = new Logger(ExchangeBuilderSessionHandler.name);

  constructor(
    @Inject('BUILDER_SESSION_REPOSITORY')
    private readonly builderSessionRepository: BuilderSessionRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: ExchangeBuilderSessionCommand) {
    if (!command.token) {
      throw new UnauthorizedException('token is required');
    }

    const session = await this.builderSessionRepository.findByToken(command.token);
    if (!session) {
      throw new UnauthorizedException('Invalid or unknown session token');
    }

    const now = new Date();
    if (session.usedAt) {
      throw new UnauthorizedException('Session token already used');
    }
    if (session.expiresAt < now) {
      throw new UnauthorizedException('Session token expired');
    }

    await this.builderSessionRepository.markUsed(command.token, now);

    const remainingMs = session.expiresAt.getTime() - now.getTime();
    const ttlSeconds = Math.max(60, Math.floor(remainingMs / 1000));

    const accessToken = this.jwtService.signIntegrationSession(
      {
        tenantId: session.tenantId,
        clientId: session.clientId,
        mode: session.mode,
        templateId: session.templateId,
        returnUrl: session.returnUrl,
        userRef: session.userRef,
      },
      ttlSeconds,
    );

    this.logger.log(`Exchanged builder session for tenant ${session.tenantId}`);

    return {
      access_token: accessToken,
      expires_in: ttlSeconds,
      mode: session.mode,
      template_id: session.templateId ?? '',
      return_url: session.returnUrl,
    };
  }
}
