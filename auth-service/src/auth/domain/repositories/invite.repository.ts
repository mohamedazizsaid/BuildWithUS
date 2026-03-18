import { Invite } from '../entities/invite.aggregate';

export abstract class InviteRepository {
  abstract save(invite: Invite): Promise<void>;
  abstract findById(id: string): Promise<Invite | null>;
  abstract findByEmail(email: string): Promise<Invite | null>;
  abstract findByTenantId(tenantId: string): Promise<Invite[]>;
  abstract delete(id: string): Promise<void>;
}
