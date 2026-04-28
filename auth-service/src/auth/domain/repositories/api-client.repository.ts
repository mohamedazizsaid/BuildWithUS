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
  abstract findByTenantId(tenantId: string): Promise<ApiClient[]>;
  abstract save(client: ApiClient): Promise<void>;
  abstract deleteById(id: string): Promise<void>;
}
