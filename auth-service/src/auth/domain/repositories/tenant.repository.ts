import { Tenant } from "../entities/tenant.aggregate";

export abstract class TenantRepository {
    abstract findById(id: string): Promise<Tenant | null>;
    abstract save(tenant: Tenant): Promise<void>;
    abstract findByName(name: string): Promise<Tenant | null>;
    abstract delete(id: string): Promise<void>;
    abstract findAll(): Promise<Tenant[]>;
}