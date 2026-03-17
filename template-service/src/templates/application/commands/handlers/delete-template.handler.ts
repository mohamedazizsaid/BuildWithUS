import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { DeleteTemplateCommand } from '../delete-template.command.js';
import { TemplateRepository } from '../../../domain/repositories/template.repository.js';
import { NotFoundException } from '@winaity/shared-kernel';

/**
 * Delete Template Handler
 *
 * Handles soft deleting a template.
 */
@CommandHandler(DeleteTemplateCommand)
export class DeleteTemplateHandler implements ICommandHandler<DeleteTemplateCommand, void> {
  private readonly logger = new Logger(DeleteTemplateHandler.name);

  constructor(
    @Inject('TEMPLATE_REPOSITORY')
    private readonly templateRepository: TemplateRepository,
  ) {}

  async execute(command: DeleteTemplateCommand): Promise<void> {
    this.logger.debug(`Deleting template: ${command.id}`);

    // Find existing template (scoped to tenant)
    const template = await this.templateRepository.findById(command.id, command.tenantId);

    if (!template) {
      throw new NotFoundException('Template', command.id);
    }

    // Soft delete template
    template.delete();

    // Save to repository
    await this.templateRepository.save(template);

    this.logger.log(`Template deleted: ${command.id}`);
  }
}
