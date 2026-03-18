import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InviteRepository } from '../../../domain/repositories/invite.repository';
import { Invite, InviteStatus } from '../../../domain/entities/invite.aggregate';
import { InviteOrmEntity } from '../entities/invite.orm-entity';

@Injectable()
export class InviteRepositoryImpl extends InviteRepository {
  constructor(
    @InjectRepository(InviteOrmEntity)
    private readonly repo: Repository<InviteOrmEntity>,
  ) {
    super();
  }

  async save(invite: Invite): Promise<void> {
    const primitives = invite.toPrimitives();
    const entity = this.repo.create({
      id: primitives.id,
      tenantId: primitives.tenantId,
      email: primitives.email,
      role: primitives.role,
      invitedBy: primitives.invitedBy,
      status: primitives.status,
      createdAt: primitives.createdAt,
    });
    await this.repo.save(entity);
  }

  async findById(id: string): Promise<Invite | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toAggregate(entity) : null;
  }

  async findByEmail(email: string): Promise<Invite | null> {
    const entity = await this.repo.findOne({
      where: { email: email.toLowerCase(), status: 'pending' },
    });
    return entity ? this.toAggregate(entity) : null;
  }

  async findByTenantId(tenantId: string): Promise<Invite[]> {
    const entities = await this.repo.find({ where: { tenantId } });
    return entities.map((e) => this.toAggregate(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toAggregate(entity: InviteOrmEntity): Invite {
    return Invite.reconstitute(
      entity.id,
      entity.tenantId,
      entity.email,
      entity.role,
      entity.invitedBy,
      entity.status as InviteStatus,
      entity.createdAt,
    );
  }
}
