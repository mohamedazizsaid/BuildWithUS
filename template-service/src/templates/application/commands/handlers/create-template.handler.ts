import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CreateTemplateCommand } from '../create-template.command.js';
import { TemplateRepository } from '../../../domain/repositories/template.repository.js';
import { Template } from '../../../domain/entities/template.aggregate.js';
import {
  TemplateName,
  TemplateDescription,
  CampaignType,
  TemplateSubject,
  TemplateContent,
} from '@winaity/shared-kernel';
import { TemplateType, ChannelContent as ProtoChannelContent } from 'proto/generated/template_commands';

/**
 * Convert TemplateType enum to lowercase string for CampaignType value object
 * TemplateType enum: 1 = EMAIL, 2 = FACTURE, 3 = CONTRAT
 * CampaignType expects: 'email', 'facture', 'contrat'
 */
function templateTypeToString(type: TemplateType | string): string {
  // Handle string representation (gRPC may send enum as string)
  if (typeof type === 'string') {
    const strType = type.toUpperCase();
    if (strType === 'EMAIL') return 'email';
    if (strType === 'FACTURE') return 'facture';
    if (strType === 'CONTRAT') return 'contrat';
    throw new Error(`Invalid template type: \${type}. Expected EMAIL (1), FACTURE (2), or CONTRAT (3).`);
  }
  
  // Handle number representation (enum value)
  switch (type) {
    case TemplateType.EMAIL:
      return 'email';
    case TemplateType.FACTURE:
      return 'facture';
    case TemplateType.CONTRAT:
      return 'contrat';
    default:
      throw new Error(`Invalid template type: \${type}. Expected EMAIL (1), FACTURE (2), or CONTRAT (3).`);
  }
}

/**
 * Create Template Handler
 *
 * Handles the creation of a new template.
 */
@CommandHandler(CreateTemplateCommand)
export class CreateTemplateHandler implements ICommandHandler<CreateTemplateCommand, Template> {
  private readonly logger = new Logger(CreateTemplateHandler.name);

  constructor(
    @Inject('TEMPLATE_REPOSITORY')
    private readonly templateRepository: TemplateRepository,
  ) {}

  async execute(command: CreateTemplateCommand): Promise<Template> {
    this.logger.debug(`Creating template: ${command.name}`);

    // Create Value Objects
    // Proto uses empty string for null, convert here
    const name = TemplateName.create(command.name);
    const description = command.description
      ? TemplateDescription.create(command.description)
      : null;
      
    // Convert TemplateType enum to string for CampaignType value object
    const type = CampaignType.create(templateTypeToString(command.type));
    const subject = command.subject
      ? TemplateSubject.create(command.subject)
      : null;
    const content = TemplateContent.create(command.content);

    // Helper to convert channel enum to string (handles both string and number)
    function channelEnumToString(channel: TemplateType | string): string {
      if (typeof channel === 'string') {
        const strChannel = channel.toUpperCase();
        if (strChannel === 'EMAIL') return 'email';
        if (strChannel === 'FACTURE') return 'facture';
        if (strChannel === 'CONTRAT') return 'contrat';
        throw new Error(`Invalid channel type: \${channel}`);
      }
      const channelMap: Record<number, string> = {
        [TemplateType.EMAIL]: 'email',
        [TemplateType.FACTURE]: 'facture',
        [TemplateType.CONTRAT]: 'contrat',
      };
      const mapped = channelMap[channel];
      if (!mapped) {
        throw new Error(`Invalid channel type: \${channel}`);
      }
      return mapped;
    }
    
    const channels = command.channels.length > 0
      ? command.channels.map(channelEnumToString)
      : undefined;
    const channelContents = command.channelContents.length > 0
      ? this.mapChannelContents(command.channelContents)
      : undefined;

    const template = Template.create(
      command.tenantId,
      name,
      description,
      type,
      subject,
      content,
      channels as any,
      channelContents as any,
      undefined,
      command.isPredefinedOverride || false,
      command.predefinedTemplateId || null,
      command.externalOrgRef || null,
    );

    // Save to repository
    await this.templateRepository.save(template);

    this.logger.log(`Template created: ${template.getId().getValue()}`);

    return template;
  }

  private mapChannelContents(contents: ProtoChannelContent[]): Record<string, any> {
    return contents.reduce((acc, content) => {
      if (!content.channel) {
        return acc;
      }
      acc[content.channel] = {
        channel: content.channel,
        subject: content.subject || undefined,
        body: content.body || '',
        mediaUrl: content.mediaUrl || undefined,
        format: content.format || undefined,
      };
      return acc;
    }, {} as Record<string, any>);
  }

}
