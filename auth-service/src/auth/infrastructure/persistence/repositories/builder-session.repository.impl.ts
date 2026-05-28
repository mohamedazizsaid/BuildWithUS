import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BuilderSession,
  BuilderSessionMode,
  BuilderSessionRepository,
} from '../../../domain/repositories/builder-session.repository';
import { BuilderSessionOrmEntity } from '../entities/builder-session.orm-entity';

@Injectable()
export class BuilderSessionRepositoryImpl extends BuilderSessionRepository {
  constructor(
    @InjectRepository(BuilderSessionOrmEntity)
    private readonly repo: Repository<BuilderSessionOrmEntity>,
  ) {
    super();
  }

  async save(session: BuilderSession): Promise<void> {
    await this.repo.save({
      id: session.id,
      token: session.token,
      tenantId: session.tenantId,
      clientId: session.clientId,
      mode: session.mode,
      templateId: session.templateId,
      returnUrl: session.returnUrl,
      userRef: session.userRef,
      expiresAt: session.expiresAt,
      usedAt: session.usedAt,
      createdAt: session.createdAt,
    });
  }

  async findByToken(token: string): Promise<BuilderSession | null> {
    const entity = await this.repo.findOne({ where: { token } });
    if (!entity) return null;
    return {
      id: entity.id,
      token: entity.token,
      tenantId: entity.tenantId,
      clientId: entity.clientId,
      mode: entity.mode as BuilderSessionMode,
      templateId: entity.templateId,
      returnUrl: entity.returnUrl,
      userRef: entity.userRef,
      expiresAt: entity.expiresAt,
      usedAt: entity.usedAt,
      createdAt: entity.createdAt,
    };
  }

  async markUsed(token: string, usedAt: Date): Promise<void> {
    await this.repo.update({ token }, { usedAt });
  }
}
