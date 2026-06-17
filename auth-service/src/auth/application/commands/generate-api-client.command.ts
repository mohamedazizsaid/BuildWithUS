export class GenerateApiClientCommand {
  constructor(
    public readonly tenantId: string,
    public readonly scopes: string,
    public readonly label: string | null = null,
  ) {}
}
