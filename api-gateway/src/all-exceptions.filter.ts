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
 * Global filter — turns every thrown error into a clean JSON body
 * `{ statusCode, message, ... }` the frontend can rely on.
 *
 * - HttpException (BadRequest, NotFound, Unauthorized, Forbidden, etc.) is passed
 *   through unchanged, so structured payloads like { code: 'plan_limit', ... }
 *   reach the client with proper status codes.
 * - Any unhandled error is logged and returned as a standard 500 error.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    // Already-sent responses (e.g. streamed) — nothing to do.
    if (res.headersSent) return;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      return res
        .status(status)
        .json(
          typeof body === 'string' ? { statusCode: status, message: body } : body,
        );
    }

    this.logger.error(exception?.stack || exception?.message || String(exception));
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Une erreur interne est survenue. Veuillez réessayer.',
    });
  }
}
