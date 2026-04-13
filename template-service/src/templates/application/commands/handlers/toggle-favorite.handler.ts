import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { NotFoundException } from '@winaity/shared-kernel';
import { ToggleFavoriteCommand } from '../toggle-favorite.command.js';
import { TemplateRepository } from '../../../domain/repositories/template.repository.js';
import { Template } from '../../../domain/entities/template.aggregate.js';

/**
 * Toggle Favorite Handler
 *
 * Sets the isFavorite flag on a template (scoped to tenant).
 */
@CommandHandler(ToggleFavoriteCommand)
export class ToggleFavoriteHandler implements ICommandHandler<ToggleFavoriteCommand, Template> {
  private readonly logger = new Logger(ToggleFavoriteHandler.name);

  constructor(
    @Inject('TEMPLATE_REPOSITORY')
    private readonly templateRepository: TemplateRepository,
  ) {}

  async execute(command: ToggleFavoriteCommand): Promise<Template> {
    const template = await this.templateRepository.findById(command.id, command.tenantId);

    if (!template) {
      throw new NotFoundException('Template', command.id);
    }

    template.setFavorite(command.isFavorite);
    await this.templateRepository.save(template);

    this.logger.log(
      `Template ${command.id} favorite set to ${command.isFavorite}`,
    );

    return template;
  }
}
