export interface ApiClient {
  id: string;
  tenantId: string;
  clientId: string;
  clientSecretHash: string;
  scopes: string;
  expiresAt: Date | null;
  createdAt: Date;
}

export abstract class ApiClientRepository {
  abstract findByClientId(clientId: string): Promise<ApiClient | null>;
  abstract save(client: ApiClient): Promise<void>;
}
