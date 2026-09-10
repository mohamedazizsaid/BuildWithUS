import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Global HTTP exception filter for template-service.
 *
 * Turns any thrown error into a clean JSON HTTP response with
 * proper status code and message.
 */
@Catch()
export class AllHttpExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllHttpExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message || message;
        details = (res as any).details || res;
      }
    } else if (exception instanceof Error) {
      const msg = exception.message || '';
      message = msg;

      if (
        msg.includes('not found') ||
        msg.includes('NotFound') ||
        exception.name === 'NotFoundException'
      ) {
        status = HttpStatus.NOT_FOUND;
      } else if (
        msg.includes('required') ||
        msg.includes('Invalid') ||
        msg.includes('already exists') ||
        exception.name === 'BusinessRuleException'
      ) {
        status = HttpStatus.BAD_REQUEST;
      } else if (
        msg.includes('Unauthorized') ||
        msg.includes('unauthorized')
      ) {
        status = HttpStatus.UNAUTHORIZED;
      } else if (
        msg.includes('Forbidden') ||
        msg.includes('forbidden')
      ) {
        status = HttpStatus.FORBIDDEN;
      }
    }

    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} Error: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
