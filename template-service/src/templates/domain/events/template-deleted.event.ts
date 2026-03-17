import { DomainEvent } from '@winaity/shared-kernel';

export class TemplateDeletedEvent extends DomainEvent {
  static readonly EVENT_NAME = 'template.deleted';

  constructor(aggregateId: string) {
    super(aggregateId);
  }

  static create(templateId: string): TemplateDeletedEvent {
    return new TemplateDeletedEvent(templateId);
  }

  eventName(): string {
    return TemplateDeletedEvent.EVENT_NAME;
  }

  toPrimitives(): Record<string, any> {
    return {
      eventId: this.eventId,
      eventName: this.eventName(),
      aggregateId: this.aggregateId,
      occurredOn: this.occurredOn.toISOString(),
      eventVersion: this.eventVersion,
    };
  }
}
