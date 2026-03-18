import { Module, DynamicModule, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class GrpcHealthService {
  private readonly logger = new Logger(GrpcHealthService.name);

  registerWithServer(_server: any): void {
    this.logger.log('Health service registered (stub)');
  }

  updateStatus(status: string): void {
    this.logger.log(`Health status: ${status}`);
  }
}

@Module({})
export class HealthModule {
  static forRoot(_options?: any): DynamicModule {
    return {
      module: HealthModule,
      global: true,
      providers: [GrpcHealthService],
      exports: [GrpcHealthService],
    };
  }
}
