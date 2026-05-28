export class RegisterDeveloperCommand {
  constructor(
    public readonly name: string,
    public readonly email: string,
  ) {}
}
