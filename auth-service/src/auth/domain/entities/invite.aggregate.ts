import { v4 as uuid } from 'uuid';

export type InviteStatus = 'pending' | 'accepted' | 'expired';

export class Invite {
  private constructor(
    private id: string,
    private tenantId: string,
    private email: string,
    private role: string,
    private invitedBy: string,
    private status: InviteStatus,
    private createdAt: Date,
  ) {}

  public static create(
    tenantId: string,
    email: string,
    role: string,
    invitedBy: string,
  ): Invite {
    if (!email || email.trim().length === 0) {
      throw new Error('Email is required');
    }
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    return new Invite(
      uuid(),
      tenantId,
      email.toLowerCase().trim(),
      role || 'editor',
      invitedBy,
      'pending',
      new Date(),
    );
  }

  public static reconstitute(
    id: string,
    tenantId: string,
    email: string,
    role: string,
    invitedBy: string,
    status: InviteStatus,
    createdAt: Date,
  ): Invite {
    return new Invite(id, tenantId, email, role, invitedBy, status, createdAt);
  }

  public accept(): void {
    if (this.status !== 'pending') {
      throw new Error('Invite is no longer pending');
    }
    this.status = 'accepted';
  }

  public toPrimitives() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      email: this.email,
      role: this.role,
      invitedBy: this.invitedBy,
      status: this.status,
      createdAt: this.createdAt,
    };
  }

  public getId(): string { return this.id; }
  public getTenantId(): string { return this.tenantId; }
  public getEmail(): string { return this.email; }
  public getRole(): string { return this.role; }
  public getInvitedBy(): string { return this.invitedBy; }
  public getStatus(): InviteStatus { return this.status; }
}
