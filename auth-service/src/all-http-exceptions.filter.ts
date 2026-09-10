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
 * Global HTTP exception filter for auth-service.
 *
 * Turns any thrown error into a clean JSON body that the API gateway (or any
 * HTTP client) can consume:
 *   - HttpException (Bad/Unauthorized/Conflict/…) → pass through with real status
 *   - Plain Error with a meaningful message → 400 with that message
 *   - Anything else → 500 with a generic message (logged server-side)
 */
@Catch()
export class AllHttpExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

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

    // Plain Error thrown inside a handler → surface as 400 with the real message
    // so the gateway (and eventually the frontend) sees something useful.
    const message: string =
      exception?.message && typeof exception.message === 'string'
        ? exception.message
        : 'Une erreur est survenue.';

    const status = inferStatus(message);

    this.logger.warn(`Handler error: ${message}`);
    return res.status(status).json({ statusCode: status, message });
  }
}

/** Best-effort HTTP status from a plain-text error message (FR + EN). */
function inferStatus(message: string): number {
  const m = message.toLowerCase();
  if (
    m.includes('mot de passe') ||
    m.includes('password') ||
    m.includes('token') ||
    m.includes('identifiant') ||
    m.includes('credential') ||
    m.includes('invalid token')
  ) {
    return HttpStatus.UNAUTHORIZED;
  }
  if (m.includes('déjà') || m.includes('already') || m.includes('exists')) {
    return HttpStatus.CONFLICT;
  }
  if (
    m.includes('introuvable') ||
    m.includes('not found') ||
    m.includes('inexistant')
  ) {
    return HttpStatus.NOT_FOUND;
  }
  if (m.includes('admin') || m.includes('permission') || m.includes('droit')) {
    return HttpStatus.FORBIDDEN;
  }
  return HttpStatus.BAD_REQUEST;
}
