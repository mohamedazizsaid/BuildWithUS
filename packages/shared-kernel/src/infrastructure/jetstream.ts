import { Module, DynamicModule, Injectable, Logger } from '@nestjs/common';

export interface EventHandlerConfig {
  eventName: string;
  logging?: boolean;
}

@Injectable()
export class JetStreamPublisherService {
  private readonly logger = new Logger(JetStreamPublisherService.name);

  async publish(subject: string, data: any): Promise<void> {
    this.logger.debug(`[Stub] Would publish to ${subject}: ${JSON.stringify(data)}`);
  }
}

export abstract class BaseJetStreamEventHandler<TEvent, TResult = any> {
  protected abstract readonly config: EventHandlerConfig;

  constructor(protected readonly publisher: JetStreamPublisherService) {}
}

export const TEMPLATES_STREAM = {
  name: 'TEMPLATE_EVENTS',
  subjects: ['template.>'],
};

@Module({})
export class JetStreamModule {
  private static readonly logger = new Logger(JetStreamModule.name);

  static forRoot(_options?: any): DynamicModule {
    JetStreamModule.logger.warn('JetStream module running in stub mode (no NATS server)');
    return {
      module: JetStreamModule,
      global: true,
      providers: [JetStreamPublisherService],
      exports: [JetStreamPublisherService],
    };
  }
}
