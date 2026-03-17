export class RegisterCommand {
  constructor(
    public readonly tenantName: string,
    public readonly email: string,
    public readonly password: string,
    public readonly firstName: string,
    public readonly lastName: string,
  ) {}
}
