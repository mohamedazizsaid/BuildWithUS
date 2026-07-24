export class RegisterCommand {
  constructor(
    public readonly tenantName: string,
    public readonly email: string,
    public readonly password: string,
    public readonly firstName: string,
    public readonly lastName: string,
    // Company contact/billing details (forwarded to the CRM).
    public readonly phone: string | null = null,
    public readonly addressLine: string | null = null,
    public readonly postalCode: string | null = null,
    public readonly city: string | null = null,
    public readonly country: string | null = null,
  ) {}
}
