import type {
  UpdateTemplateRequest,
  TemplateType,
  ChannelContent,
} from 'proto/generated/template_commands';

/**
 * Update Template Command
 *
 * Command for updating an existing template.
 * Implements the proto interface for type safety.
 * Empty strings indicate "no change" for optional fields.
 */
export class UpdateTemplateCommand implements UpdateTemplateRequest {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly name: string = '',
    public readonly description: string = '',
    public readonly subject: string = '',
    public readonly content: string = '',
    public readonly channelContents: ChannelContent[] = [],
    public readonly channels: TemplateType[] = [],
  ) {}
}
