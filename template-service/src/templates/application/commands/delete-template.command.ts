import type { DeleteTemplateRequest } from 'proto/generated/template_commands';

/**
 * Delete Template Command
 *
 * Command for soft deleting a template.
 * Implements the proto interface for type safety.
 */
export class DeleteTemplateCommand implements DeleteTemplateRequest {
  constructor(public readonly id: string, public readonly userId: string, public readonly tenantId: string) {}
}
