import { BaseJetStreamEventHandler, EventHandlerConfig, JetStreamPublisherService } from '@winaity/shared-kernel';
import { TemplateDeletedEvent } from '../../domain/events/index.js';

/**
 * Template Deleted Event Handler
 *
 * Handles side effects when a template is deleted.
 */
export class TemplateDeletedHandler extends BaseJetStreamEventHandler<TemplateDeletedEvent, any> {
  protected readonly config: EventHandlerConfig = {
    eventName: 'template.deleted',
    logging: true,
  };

  constructor(publisher: JetStreamPublisherService) {
    super(publisher);
  }
}
