import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { User, UserRole } from '../../../domain/entities/user.aggregate';
import { UserOrmEntity } from '../entities/user.orm-entity';

@Injectable()
export class UserRepositoryImpl extends UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toAggregate(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repo.findOne({ where: { email: email.toLowerCase() } });
    return entity ? this.toAggregate(entity) : null;
  }

  async findByTenantId(tenantId: string): Promise<User[]> {
    const entities = await this.repo.find({ where: { tenantId } });
    return entities.map((e) => this.toAggregate(e));
  }

  async save(user: User): Promise<void> {
    const primitives = user.toPrimitives();
    await this.repo.save(primitives);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toAggregate(entity: UserOrmEntity): User {
    return User.reconstitute(
      entity.id,
      entity.tenantId,
      entity.email,
      entity.password,
      entity.firstName,
      entity.lastName,
      entity.role as UserRole,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
