import type { GetPopularTemplatesRequest } from 'proto/generated/template_queries';

/**
 * Get Popular Templates Query
 *
 * Query to retrieve most used templates.
 * Implements the proto interface for type safety.
 */
export class GetPopularTemplatesQuery implements GetPopularTemplatesRequest {
  constructor(
    public readonly limit: number = 3,
    public readonly type: string = '',
    public readonly userId: string = '',
  ) {}
}
