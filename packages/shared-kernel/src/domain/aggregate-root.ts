import { AggregateRoot as NestAggregateRoot, IEvent } from '@nestjs/cqrs';

export abstract class AggregateRoot extends NestAggregateRoot {
  constructor() {
    super();
  }

  override apply<T extends IEvent = IEvent>(
    event: T,
    isFromHistoryOrOptions?: boolean | { fromHistory?: boolean; skipHandler?: boolean },
  ): void {
    super.apply(event, isFromHistoryOrOptions as any);
  }
}

