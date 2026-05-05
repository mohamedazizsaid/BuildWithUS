export class DeleteTenantVariableCommand {
  constructor(
    public readonly tenantId: string,
    public readonly name: string,
  ) {}
}
