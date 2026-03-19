/**
 * Duplicate Template Command
 */
export class DuplicateTemplateCommand {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly name?: string,
  ) {}
}
