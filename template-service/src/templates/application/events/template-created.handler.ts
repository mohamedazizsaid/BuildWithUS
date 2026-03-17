import { BaseJetStreamEventHandler, EventHandlerConfig, JetStreamPublisherService } from '@winaity/shared-kernel';
import { TemplateCreatedEvent } from '../../domain/events/index.js';

/**
 * Template Created Event Handler
 *
 * Handles side effects when a template is created.
 */
export class TemplateCreatedHandler extends BaseJetStreamEventHandler<TemplateCreatedEvent, any> {
  protected readonly config: EventHandlerConfig = {
    eventName: 'template.created',
    logging: true,
  };

  constructor(publisher: JetStreamPublisherService) {
    super(publisher);
  }
}
