export class SetTenantReturnUrlsCommand {
  constructor(
    public readonly tenantId: string,
    public readonly clientId: string,
    public readonly urls: string[],
  ) {}
}
