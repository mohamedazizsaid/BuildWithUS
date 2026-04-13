import type { ListTemplatesRequest } from 'proto/generated/template_queries';

/**
 * List Templates Query
 *
 * Query to list templates with filters and pagination.
 * Implements the proto interface for type safety.
 */
export class ListTemplatesQuery implements ListTemplatesRequest {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly type: string = '',
    public readonly sortBy: string = 'createdAt',
    public readonly ascending: boolean = false,
    public readonly search: string = '',
    public readonly userId: string = '',
    public readonly tenantId: string = '',
    public readonly favoritesOnly: boolean = false,
  ) {}
}
