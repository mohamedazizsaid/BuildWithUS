import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { MintBuilderSessionCommand } from '../mint-builder-session.command';
import { ApiClientRepository } from '../../../domain/repositories/api-client.repository';
import { BuilderSessionRepository } from '../../../domain/repositories/builder-session.repository';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const VALID_MODES = new Set(['new', 'edit', 'list']);

@CommandHandler(MintBuilderSessionCommand)
export class MintBuilderSessionHandler implements ICommandHandler<MintBuilderSessionCommand> {
  private readonly logger = new Logger(MintBuilderSessionHandler.name);

  constructor(
    @Inject('API_CLIENT_REPOSITORY')
    private readonly apiClientRepository: ApiClientRepository,
    @Inject('BUILDER_SESSION_REPOSITORY')
    private readonly builderSessionRepository: BuilderSessionRepository,
  ) {}

  async execute(command: MintBuilderSessionCommand) {
    if (!VALID_MODES.has(command.mode)) {
      throw new Error(`Invalid mode: ${command.mode}`);
    }
    if (!command.returnUrl) {
      throw new Error('return_url is required');
    }

    const client = await this.apiClientRepository.findByClientId(command.clientId);
    if (!client) throw new UnauthorizedException('Invalid client credentials');

    const secretValid = await argon2.verify(client.clientSecretHash, command.clientSecret);
    if (!secretValid) throw new UnauthorizedException('Invalid client credentials');

    if (client.expiresAt && client.expiresAt < new Date()) {
      throw new UnauthorizedException('API client has expired');
    }

    const allowed = (client.allowedReturnUrls ?? '')
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    if (allowed.length === 0) {
      throw new ForbiddenException(
        'No allowed return URLs configured for this client. Add one via /developers/return-urls.',
      );
    }
    if (!allowed.includes(command.returnUrl)) {
      throw new ForbiddenException(`return_url not in allowlist: ${command.returnUrl}`);
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    await this.builderSessionRepository.save({
      id: crypto.randomUUID(),
      token,
      tenantId: client.tenantId,
      clientId: client.clientId,
      mode: command.mode,
      templateId: command.templateId,
      returnUrl: command.returnUrl,
      userRef: command.userRef,
      expiresAt,
      usedAt: null,
      createdAt: now,
    });

    this.logger.log(`Builder session minted for client ${command.clientId} mode=${command.mode}`);

    return {
      token,
      expires_at: expiresAt.toISOString(),
    };
  }
}
