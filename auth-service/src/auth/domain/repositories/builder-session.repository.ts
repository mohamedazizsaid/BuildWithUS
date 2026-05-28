export type BuilderSessionMode = 'new' | 'edit' | 'list';

export interface BuilderSession {
  id: string;
  token: string;
  tenantId: string;
  clientId: string;
  mode: BuilderSessionMode;
  templateId: string | null;
  returnUrl: string;
  userRef: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export abstract class BuilderSessionRepository {
  abstract save(session: BuilderSession): Promise<void>;
  abstract findByToken(token: string): Promise<BuilderSession | null>;
  abstract markUsed(token: string, usedAt: Date): Promise<void>;
}
