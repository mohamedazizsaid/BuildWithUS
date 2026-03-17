import { BaseJetStreamEventHandler, EventHandlerConfig, JetStreamPublisherService } from '@winaity/shared-kernel';
import { TemplateUpdatedEvent } from '../../domain/events/index.js';

/**
 * Template Updated Event Handler
 *
 * Handles side effects when a template is updated.
 */
export class TemplateUpdatedHandler extends BaseJetStreamEventHandler<TemplateUpdatedEvent, any> {
  protected readonly config: EventHandlerConfig = {
    eventName: 'template.updated',
    logging: true,
  };

  constructor(publisher: JetStreamPublisherService) {
    super(publisher);
  }
}
