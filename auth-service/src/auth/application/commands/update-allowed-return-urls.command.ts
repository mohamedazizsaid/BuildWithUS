export class UpdateAllowedReturnUrlsCommand {
  constructor(
    public readonly clientId: string,
    public readonly clientSecret: string,
    public readonly urls: string[],
  ) {}
}
