import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';

function getAuthUrl(): string {
  let url = process.env.AUTH_SERVICE_URL || 'http://localhost:3003';
  url = url.trim();
  // Handle legacy gRPC port in env if not updated yet
  if (url.includes('50055')) {
    url = url.replace('50055', '3003');
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  return url.replace(/\/+$/, '');
}

@Injectable()
export class AuthClientService {
  private readonly logger = new Logger(AuthClientService.name);

  private async request<T = any>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const baseUrl = getAuthUrl();
    const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    let res: globalThis.Response;
    try {
      res = await fetch(url, {
        ...options,
        headers,
      });
    } catch (err: any) {
      this.logger.error(`Failed to reach auth-service at ${url}: ${err.message}`);
      throw new HttpException(
        'Service d\'authentification indisponible',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const message =
        (typeof data === 'object' && data !== null ? data.message : data) ||
        res.statusText ||
        'Downstream error';
      throw new HttpException(message, res.status);
    }

    return data as T;
  }

  // ── Authentication & Users ────────────────────────────────────────────────

  async validateToken(token: string): Promise<any> {
    return this.request('/auth/validate-token', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async register(data: any): Promise<any> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: any): Promise<any> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(userId: string): Promise<any> {
    return this.request(`/auth/me?user_id=${encodeURIComponent(userId)}`, {
      method: 'GET',
    });
  }

  async updateProfile(data: any): Promise<any> {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async markFirstLog(userId: string): Promise<any> {
    return this.request('/auth/first-log', {
      method: 'PUT',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async inviteUser(data: any): Promise<any> {
    return this.request('/auth/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async acceptInvite(data: any): Promise<any> {
    return this.request('/auth/accept-invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async requestPasswordReset(email: string): Promise<any> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<any> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  async listMembers(tenantId: string): Promise<any> {
    return this.request(`/auth/members?tenant_id=${encodeURIComponent(tenantId)}`, {
      method: 'GET',
    });
  }

  // ── Tenant Usage & Billing ────────────────────────────────────────────────

  async getTenantBilling(tenantId: string): Promise<any> {
    return this.request(`/auth/admin/tenants/${encodeURIComponent(tenantId)}/billing`, {
      method: 'GET',
    });
  }

  async getTenantUsage(tenantId: string): Promise<any> {
    return this.request(`/auth/tenants/${encodeURIComponent(tenantId)}/usage`, {
      method: 'GET',
    });
  }

  async incrementTenantUsage(tenantId: string, kind: string): Promise<any> {
    return this.request(`/auth/tenants/${encodeURIComponent(tenantId)}/usage/increment`, {
      method: 'POST',
      body: JSON.stringify({ kind }),
    });
  }

  async updateTenantPlan(data: any): Promise<any> {
    const tenantId = data.tenant_id || data.tenantId;
    return this.request(`/auth/admin/tenants/${encodeURIComponent(tenantId)}/plan`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async adminSetTenantPlan(tenantId: string, plan: string): Promise<any> {
    return this.request(`/auth/admin/tenants/${encodeURIComponent(tenantId)}/plan`, {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  }

  async getTenantAdmin(tenantId: string): Promise<any> {
    return this.request(`/auth/admin/tenants/${encodeURIComponent(tenantId)}/admin-user`, {
      method: 'GET',
    });
  }

  // ── Super Admin ───────────────────────────────────────────────────────────

  async listAllUsers(): Promise<any> {
    return this.request('/auth/admin/users', {
      method: 'GET',
    });
  }

  async adminUpdateUserRole(data: { user_id: string; role: string }): Promise<any> {
    return this.request(`/auth/admin/users/${encodeURIComponent(data.user_id)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role: data.role }),
    });
  }

  async adminResetPassword(data: { user_id: string; new_password: string }): Promise<any> {
    return this.request(`/auth/admin/users/${encodeURIComponent(data.user_id)}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminDeleteUser(userId: string): Promise<any> {
    return this.request(`/auth/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  }

  async listAllTenants(): Promise<any> {
    return this.request('/auth/admin/tenants', {
      method: 'GET',
    });
  }

  // ── Api Clients & OAuth & Builder Sessions ────────────────────────────────

  async listApiClients(tenantId: string): Promise<any> {
    return this.request('/integrations/api-keys', {
      method: 'GET',
      headers: { 'x-tenant-id': tenantId },
    });
  }

  async generateApiClient(data: any): Promise<any> {
    return this.request('/integrations/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async revokeApiClient(id: string): Promise<any> {
    return this.request(`/integrations/api-keys/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async setTenantReturnUrls(data: any): Promise<any> {
    return this.request('/integrations/return-urls', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async issueClientToken(data: any): Promise<any> {
    return this.request('/oauth/token', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async registerApiClient(data: any): Promise<any> {
    return this.request('/oauth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAllowedReturnUrls(data: any): Promise<any> {
    return this.request('/developers/return-urls', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async mintBuilderSession(data: any): Promise<any> {
    return this.request('/api/builder-sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async exchangeBuilderSession(token: string): Promise<any> {
    return this.request('/s/exchange', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }
}
