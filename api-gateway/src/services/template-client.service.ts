import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';

function getTemplateUrl(): string {
  let url = process.env.TEMPLATE_SERVICE_URL || 'http://localhost:3002';
  url = url.trim();
  // Handle legacy gRPC port in env if not updated yet
  if (url.includes('50054') || url.includes('50056')) {
    url = url.replace('50054', '3002').replace('50056', '3002');
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  return url.replace(/\/+$/, '');
}

@Injectable()
export class TemplateClientService {
  private readonly logger = new Logger(TemplateClientService.name);

  private async request<T = any>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const baseUrl = getTemplateUrl();
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
      this.logger.error(`Failed to reach template-service at ${url}: ${err.message}`);
      throw new HttpException(
        'Service des templates indisponible',
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

  // ── Commands ──────────────────────────────────────────────────────────────

  async createTemplate(data: any): Promise<any> {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTemplate(data: any): Promise<any> {
    return this.request(`/templates/${encodeURIComponent(data.id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTemplate(data: { id: string; user_id?: string; tenant_id?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (data.user_id) params.set('user_id', data.user_id);
    if (data.tenant_id) params.set('tenant_id', data.tenant_id);
    const qs = params.toString() ? `?${params.toString()}` : '';

    return this.request(`/templates/${encodeURIComponent(data.id)}${qs}`, {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  }

  async duplicateTemplate(data: any): Promise<any> {
    return this.request(`/templates/${encodeURIComponent(data.id)}/duplicate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async toggleFavorite(data: any): Promise<any> {
    return this.request(`/templates/${encodeURIComponent(data.id)}/favorite`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateTenantVariables(data: any): Promise<any> {
    return this.request('/templates/settings/custom-variables', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addTenantVariable(data: any): Promise<any> {
    return this.request('/templates/settings/custom-variables', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTenantVariable(data: { tenant_id: string; name: string }): Promise<any> {
    const qs = `?tenant_id=${encodeURIComponent(data.tenant_id)}`;
    return this.request(`/templates/settings/custom-variables/${encodeURIComponent(data.name)}${qs}`, {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async listTemplates(query: any): Promise<any> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/templates${qs}`, {
      method: 'GET',
    });
  }

  async getTemplate(query: { id: string; user_id?: string; tenant_id?: string; external_org_ref?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (query.user_id) params.set('user_id', query.user_id);
    if (query.tenant_id) params.set('tenant_id', query.tenant_id);
    if (query.external_org_ref) params.set('external_org_ref', query.external_org_ref);
    const qs = params.toString() ? `?${params.toString()}` : '';

    return this.request(`/templates/${encodeURIComponent(query.id)}${qs}`, {
      method: 'GET',
    });
  }

  async getPopularTemplates(query: any): Promise<any> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/templates/popular${qs}`, {
      method: 'GET',
    });
  }

  async renderTemplate(data: any): Promise<any> {
    return this.request(`/templates/${encodeURIComponent(data.id)}/render`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTenantVariables(query: { tenant_id: string }): Promise<any> {
    const qs = `?tenant_id=${encodeURIComponent(query.tenant_id)}`;
    return this.request(`/templates/settings/custom-variables${qs}`, {
      method: 'GET',
    });
  }
}
