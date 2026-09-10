import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { UpdateTemplateCommand } from '../update-template.command.js';
import { TemplateRepository } from '../../../domain/repositories/template.repository.js';
import { Template } from '../../../domain/entities/template.aggregate.js';
import {
  NotFoundException,
  TemplateName,
  TemplateDescription,
  TemplateSubject,
  TemplateContent,
} from '@winaity/shared-kernel';
import { TemplateType, ChannelContent as ProtoChannelContent } from 'proto/generated/template_commands';

/**
 * Update Template Handler
 *
 * Handles updating an existing template.
 * Empty strings in proto mean "no change" for that field.
 */
@CommandHandler(UpdateTemplateCommand)
export class UpdateTemplateHandler implements ICommandHandler<UpdateTemplateCommand, Template> {
  private readonly logger = new Logger(UpdateTemplateHandler.name);

  constructor(
    @Inject('TEMPLATE_REPOSITORY')
    private readonly templateRepository: TemplateRepository,
  ) {}

  async execute(command: UpdateTemplateCommand): Promise<Template> {
    this.logger.debug(`Updating template: ${command.id}`);

    // Find existing template (scoped to tenant)
    const template = await this.templateRepository.findById(command.id, command.tenantId);

    if (!template) {
      throw new NotFoundException('Template', command.id);
    }

    // Create Value Objects only for provided fields (non-empty strings)
    // Proto convention: empty string = no change
    const name = command.name
      ? TemplateName.create(command.name)
      : undefined;

    // For description: empty string could mean "clear the description"
    // We need a way to distinguish "no change" from "set to null"
    // Convention: if provided (even empty), update it
    const description = command.description !== undefined
      ? (command.description ? TemplateDescription.create(command.description) : null)
      : undefined;

    // Same for subject
    const subject = command.subject !== undefined
      ? (command.subject ? TemplateSubject.create(command.subject) : null)
      : undefined;

    const content = command.content
      ? TemplateContent.create(command.content)
      : undefined;

    // Handle both string and number enum representations
    function channelToString(channel: TemplateType | string): string {
      if (typeof channel === 'string') {
        const strChannel = channel.toUpperCase();
        if (strChannel === 'EMAIL' || strChannel === '1') return 'email';
        if (strChannel === 'FACTURE' || strChannel === '2') return 'facture';
        if (strChannel === 'CONTRAT' || strChannel === '3') return 'contrat';
        if (strChannel === 'SMS' || strChannel === '4') return 'sms';
        if (strChannel === 'RCS' || strChannel === '5') return 'rcs';
        throw new Error(`Invalid template type: ${channel}. Expected EMAIL (1), FACTURE (2), CONTRAT (3), SMS (4), or RCS (5).`);
      }
      const channelMap: Record<number, string> = {
        [TemplateType.EMAIL]: 'email',
        [TemplateType.FACTURE]: 'facture',
        [TemplateType.CONTRAT]: 'contrat',
        [TemplateType.SMS]: 'sms',
        [TemplateType.RCS]: 'rcs',
      };
      const mappedChannel = channelMap[channel];
      if (!mappedChannel) {
        throw new Error(`Invalid template type: \${channel}. Expected EMAIL (1), FACTURE (2), CONTRAT (3), SMS (4), or RCS (5).`);
      }
      return mappedChannel;
    }
    
    const channels = command.channels.length > 0
      ? command.channels.map(channelToString)
      : undefined;
    const channelContents = command.channelContents.length > 0
      ? this.mapChannelContents(command.channelContents)
      : undefined;

    // Update template
    template.update(name, description, subject, content, channels as any, channelContents as any);

    // Save to repository
    await this.templateRepository.save(template);

    this.logger.log(`Template updated: ${template.getId().getValue()}`);

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
