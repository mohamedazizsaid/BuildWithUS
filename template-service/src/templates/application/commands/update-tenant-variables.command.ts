export class UpdateTenantVariablesCommand {
  constructor(
    public readonly tenantId: string,
    public readonly customVariables: Record<string, string[]>,
  ) {}
}
