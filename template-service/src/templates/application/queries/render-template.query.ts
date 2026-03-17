import type { RenderTemplateRequest } from 'proto/generated/template_queries';

/**
 * Render Template Query
 *
 * Query to render a template with variable substitution.
 * Implements the proto interface for type safety.
 */
export class RenderTemplateQuery implements RenderTemplateRequest {
  constructor(
    public readonly id: string,
    public readonly variables: { [key: string]: string } = {},
    public readonly userId: string = '',
  ) {}
}
