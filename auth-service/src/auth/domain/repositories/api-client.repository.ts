export interface ApiClient {
  id: string;
  tenantId: string;
  clientId: string;
  clientSecretHash: string;
  scopes: string;
  label: string | null;
  expiresAt: Date | null;
  allowedReturnUrls: string | null;
  createdAt: Date;
}

export abstract class ApiClientRepository {
  abstract findByClientId(clientId: string): Promise<ApiClient | null>;
  abstract findByTenantId(tenantId: string): Promise<ApiClient[]>;
  abstract save(client: ApiClient): Promise<void>;
  abstract deleteById(id: string): Promise<void>;
  abstract updateAllowedReturnUrls(clientId: string, urls: string | null): Promise<void>;
}
