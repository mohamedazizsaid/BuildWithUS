import { Module, Injectable, LoggerService, Logger } from '@nestjs/common';

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger = new Logger('App');

  log(message: string): void {
    this.logger.log(message);
  }

  error(message: string, trace?: string): void {
    this.logger.error(message, trace);
  }

  warn(message: string): void {
    this.logger.warn(message);
  }

  debug(message: string): void {
    this.logger.debug(message);
  }

  verbose(message: string): void {
    this.logger.verbose(message);
  }
}

@Module({
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class LoggerModule {}
