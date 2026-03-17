import type {
  CreateTemplateRequest,
  TemplateType,
  ChannelContent,
} from 'proto/generated/template_commands';

/**
 * Create Template Command
 *
 * Command for creating a new template.
 * Implements the proto interface for type safety.
 */
export class CreateTemplateCommand implements CreateTemplateRequest {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly description: string = '',
    public readonly type: TemplateType,
    public readonly subject: string = '',
    public readonly content: string,
    public readonly channelContents: ChannelContent[] = [],
    public readonly channels: TemplateType[] = [],
  ) {}
}
