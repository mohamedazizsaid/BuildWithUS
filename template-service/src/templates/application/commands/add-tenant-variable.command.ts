export class AddTenantVariableCommand {
  constructor(
    public readonly tenantId: string,
    public readonly category: string,
    public readonly name: string,
  ) {}
}
