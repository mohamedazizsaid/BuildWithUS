import { User } from "../entities/user.aggregate";

export abstract class UserRepository {
    abstract save(user: User): Promise<void>;
    abstract findByEmail(email: string): Promise<User | null>;
    abstract findById(id: string): Promise<User | null>;
    abstract delete(id: string): Promise<void>;
    abstract findByTenantId(tenantId: string): Promise<User[]>;
    abstract findAll(): Promise<User[]>;
}
