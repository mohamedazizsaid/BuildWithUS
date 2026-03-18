import { AggregateRoot as NestAggregateRoot } from '@nestjs/cqrs';

export abstract class AggregateRoot extends NestAggregateRoot {
  constructor() {
    super();
  }
}
