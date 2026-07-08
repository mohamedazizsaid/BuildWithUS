import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tenant } from "../../../domain/entities/tenant.aggregate";
import { TenantRepository } from "../../../domain/repositories/tenant.repository";
import { TenantOrmEntity } from "../entities/tenant.orm-entity";

@Injectable()
export class TenantRepositoryImpl extends TenantRepository {

    constructor(
        @InjectRepository(TenantOrmEntity)
        private readonly repo: Repository<TenantOrmEntity>,
    ) {
        super()
    }

    async findById(id: string): Promise<Tenant | null> {
        const entity = await this.repo.findOne({where: { id}});
        return entity ? this.toAggregate(entity) : null;
    }

    async findByName(name: string): Promise<Tenant | null> {
        const entity = await this.repo.findOne({ where: { name}});
        return entity ? this.toAggregate(entity) : null;
    }


    async save(tenant: Tenant): Promise<void>{
        const primitives = tenant.toPrimitives();
        await this.repo.save(primitives);
    }

    async delete(id: string): Promise<void>{
        await this.repo.delete(id);
    }

    async findAll(): Promise<Tenant[]> {
        const entities = await this.repo.find({ order: { createdAt: 'DESC' } });
        return entities.map((e) => this.toAggregate(e));
    }

    private toAggregate(entity: TenantOrmEntity): Tenant {
        return Tenant.reconstitute(
            entity.id,
            entity.name,
            entity.plan,
            entity.createdAt,
            entity.updatedAt,
            entity.billingCycle ?? null,
            entity.subscriptionStatus ?? null,
            entity.stripeCustomerId ?? null,
            entity.stripeSubscriptionId ?? null,
            entity.emailTemplatesCreated ?? 0,
            entity.aiInteractionsUsed ?? 0,
        );
    }
}