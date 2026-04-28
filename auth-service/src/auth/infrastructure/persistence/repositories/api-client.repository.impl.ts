import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiClient, ApiClientRepository } from '../../../domain/repositories/api-client.repository';
import { ApiClientOrmEntity } from '../entities/api-client.orm-entity';

@Injectable()
export class ApiClientRepositoryImpl extends ApiClientRepository {
  constructor(
    @InjectRepository(ApiClientOrmEntity)
    private readonly repo: Repository<ApiClientOrmEntity>,
  ) {
    super();
  }

  async findByClientId(clientId: string): Promise<ApiClient | null> {
    const entity = await this.repo.findOne({ where: { clientId } });
    if (!entity) return null;
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      clientId: entity.clientId,
      clientSecretHash: entity.clientSecretHash,
      scopes: entity.scopes,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
    };
  }

  async findByTenantId(tenantId: string): Promise<ApiClient[]> {
    const entities = await this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
    return entities.map((e) => ({
      id: e.id,
      tenantId: e.tenantId,
      clientId: e.clientId,
      clientSecretHash: e.clientSecretHash,
      scopes: e.scopes,
      expiresAt: e.expiresAt,
      createdAt: e.createdAt,
    }));
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async save(client: ApiClient): Promise<void> {
    await this.repo.save({
      id: client.id,
      tenantId: client.tenantId,
      clientId: client.clientId,
      clientSecretHash: client.clientSecretHash,
      scopes: client.scopes,
      expiresAt: client.expiresAt,
      createdAt: client.createdAt,
    });
  }
}
