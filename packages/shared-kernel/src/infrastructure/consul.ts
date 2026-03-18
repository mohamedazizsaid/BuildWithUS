import { Module, DynamicModule, Logger } from '@nestjs/common';

@Module({})
export class ConsulModule {
  private static readonly logger = new Logger(ConsulModule.name);

  static forRoot(_options?: any): DynamicModule {
    ConsulModule.logger.warn('Consul module running in stub mode (no Consul server)');
    return {
      module: ConsulModule,
      global: true,
      providers: [],
      exports: [],
    };
  }
}
