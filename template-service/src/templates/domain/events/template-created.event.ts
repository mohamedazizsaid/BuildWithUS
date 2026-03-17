import { DomainEvent } from '@winaity/shared-kernel';

export interface TemplateCreatedPayload {
  name: string;
  description: string | null;
  type: string;
  subject: string | null;
  content: string;
  variables: string[];
}

export class TemplateCreatedEvent extends DomainEvent {
  static readonly EVENT_NAME = 'template.created';

  constructor(
    aggregateId: string,
    public readonly payload: TemplateCreatedPayload,
  ) {
    super(aggregateId);
  }

  static create(
    templateId: string,
    payload: TemplateCreatedPayload,
  ): TemplateCreatedEvent {
    return new TemplateCreatedEvent(templateId, payload);
  }

  eventName(): string {
    return TemplateCreatedEvent.EVENT_NAME;
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
