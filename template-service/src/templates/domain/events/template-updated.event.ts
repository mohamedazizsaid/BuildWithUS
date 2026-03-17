import { DomainEvent } from '@winaity/shared-kernel';

export interface TemplateUpdatedPayload {
  name: string;
  description: string | null;
  type: string;
  subject: string | null;
  content: string;
  variables: string[];
}

export class TemplateUpdatedEvent extends DomainEvent {
  static readonly EVENT_NAME = 'template.updated';

  constructor(
    aggregateId: string,
    public readonly payload: TemplateUpdatedPayload,
  ) {
    super(aggregateId);
  }

  static create(
    templateId: string,
    payload: TemplateUpdatedPayload,
  ): TemplateUpdatedEvent {
    return new TemplateUpdatedEvent(templateId, payload);
  }

  eventName(): string {
    return TemplateUpdatedEvent.EVENT_NAME;
  }

  toPrimitives(): Record<string, any> {
    return {
      eventId: this.eventId,
      eventName: this.eventName(),
      aggregateId: this.aggregateId,
      occurredOn: this.occurredOn.toISOString(),
      eventVersion: this.eventVersion,
      payload: this.payload,
    };
  }
}
