export class InviteUserCommand {
  constructor(
    public readonly tenantId: string,
    public readonly email: string,
    public readonly role: string,
    public readonly invitedBy: string,
  ) {}
}
