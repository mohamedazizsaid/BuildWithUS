import { BuilderSessionMode } from '../../domain/repositories/builder-session.repository';

export class MintBuilderSessionCommand {
  constructor(
    public readonly clientId: string,
    public readonly clientSecret: string,
    public readonly mode: BuilderSessionMode,
    public readonly returnUrl: string,
    public readonly templateId: string | null,
    public readonly userRef: string | null,
  ) {}
}
