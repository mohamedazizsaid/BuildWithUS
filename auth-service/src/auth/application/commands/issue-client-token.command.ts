export class IssueClientTokenCommand {
  constructor(
    public readonly clientId: string,
    public readonly clientSecret: string,
    public readonly userId?: string,
    public readonly organisationId?: string,
  ) {}
}
