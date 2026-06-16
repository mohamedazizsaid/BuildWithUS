import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { RenderTemplateQuery } from '../render-template.query.js';
import { TemplateRepository } from '../../../domain/repositories/template.repository.js';
import { NotFoundException } from '@winaity/shared-kernel';
import type { RenderTemplateResponse } from 'proto/generated/template_queries';
import { TemplateRendererService } from '../../services/template-renderer.service.js';

/**
 * Render Template Handler
 *
 * Handles rendering a template with variable substitution.
 */
@QueryHandler(RenderTemplateQuery)
export class RenderTemplateHandler implements IQueryHandler<RenderTemplateQuery, RenderTemplateResponse> {
  private readonly logger = new Logger(RenderTemplateHandler.name);

  constructor(
    @Inject('TEMPLATE_REPOSITORY')
    private readonly templateRepository: TemplateRepository,
    private readonly renderer: TemplateRendererService,
  ) {}

  async execute(query: RenderTemplateQuery): Promise<RenderTemplateResponse> {
    this.logger.debug(`Rendering template: ${query.id}`);

    const template = await this.templateRepository.findById(query.id);

    if (!template) {
      throw new NotFoundException('Template', query.id);
    }

    const channel = template.getType().getValue() as 'email' | 'facture' | 'contrat' | 'sms';
    const rendered = this.renderer.render(
      template,
      channel,
      query.variables,
    );

    const renderedSubject = rendered.subject;
    const renderedContent = channel === 'email'
      ? rendered.htmlBody || rendered.textBody
      : rendered.textBody;

    this.logger.log(`Template rendered: ${query.id}, variables used: ${rendered.variablesUsed.length}`);

    return {
      rendered_subject: renderedSubject,
      rendered_content: renderedContent,
      variables_used: rendered.variablesUsed,
    } as any;
  }
}
