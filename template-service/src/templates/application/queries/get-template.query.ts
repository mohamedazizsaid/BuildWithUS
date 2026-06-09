import type { GetTemplateRequest } from 'proto/generated/template_queries';

/**
 * Get Template Query
 *
 * Query to retrieve a single template by ID.
 * Implements the proto interface for type safety.
 */
export class GetTemplateQuery implements GetTemplateRequest {
  constructor(
    public readonly id: string,
    public readonly userId: string = '',
    public readonly tenantId: string = '',
    public readonly externalOrgRef: string | null = null,
  ) {}
}
