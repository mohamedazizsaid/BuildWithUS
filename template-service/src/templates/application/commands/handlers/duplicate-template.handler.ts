import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { DuplicateTemplateCommand } from '../duplicate-template.command.js';
import { TemplateRepository } from '../../../domain/repositories/template.repository.js';
import { Template } from '../../../domain/entities/template.aggregate.js';
import {
  TemplateName,
  TemplateDescription,
  CampaignType,
  TemplateSubject,
  TemplateContent,
} from '@winaity/shared-kernel';

@CommandHandler(DuplicateTemplateCommand)
export class DuplicateTemplateHandler implements ICommandHandler<DuplicateTemplateCommand, Template> {
  private readonly logger = new Logger(DuplicateTemplateHandler.name);

  constructor(
    @Inject('TEMPLATE_REPOSITORY')
    private readonly templateRepository: TemplateRepository,
  ) {}

  async execute(command: DuplicateTemplateCommand): Promise<Template> {
    this.logger.debug(`Duplicating template: ${command.id}`);

    const original = await this.templateRepository.findById(command.id, command.tenantId);
    if (!original) {
      throw new Error('Template not found');
    }

    const primitives = original.toPrimitives();
    const newName = command.name || `${primitives.name} (Copy)`;

    const template = Template.create(
      command.tenantId,
      TemplateName.create(newName),
      primitives.description ? TemplateDescription.create(primitives.description) : null,
      CampaignType.fromString(primitives.type),
      primitives.subject ? TemplateSubject.create(primitives.subject) : null,
      TemplateContent.create(primitives.content),
      primitives.channels,
      primitives.channelContents,
      primitives.variants,
    );

    await this.templateRepository.save(template);

    this.logger.log(`Template duplicated: ${template.getId().getValue()}`);

    return template;
  }
}
