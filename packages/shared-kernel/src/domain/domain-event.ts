import { v4 as uuid } from 'uuid';

export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly aggregateId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number;

  constructor(aggregateId: string) {
    this.eventId = uuid();
    this.aggregateId = aggregateId;
    this.occurredOn = new Date();
    this.eventVersion = 1;
  }

  abstract eventName(): string;
  abstract toPrimitives(): Record<string, any>;
}
