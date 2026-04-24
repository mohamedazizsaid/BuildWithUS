export class RegisterApiClientCommand {
  constructor(
    public readonly appName: string,
    public readonly contactEmail: string,
    public readonly scopes: string,
  ) {}
}
