import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

// gRPC status code → HTTP status. Business errors thrown as plain Error() in the
// microservices arrive as UNKNOWN (2); we surface those as 400 with their real
// message rather than a generic 500, so the frontend can show something useful.
const GRPC_TO_HTTP: Record<number, number> = {
  2: HttpStatus.BAD_REQUEST, // UNKNOWN (most business errors)
  3: HttpStatus.BAD_REQUEST, // INVALID_ARGUMENT
  5: HttpStatus.NOT_FOUND, // NOT_FOUND
  6: HttpStatus.CONFLICT, // ALREADY_EXISTS
  7: HttpStatus.FORBIDDEN, // PERMISSION_DENIED
  9: HttpStatus.BAD_REQUEST, // FAILED_PRECONDITION
  16: HttpStatus.UNAUTHORIZED, // UNAUTHENTICATED
};

// gRPC messages look like "2 UNKNOWN: Invalid email or password" — strip the
// "<code> <STATUS>: " prefix so the user sees only the human part.
function cleanMessage(raw: unknown): string {
  const s = typeof raw === 'string' ? raw : '';
  const m = s.match(/^\s*\d+\s+[A-Z_]+:\s*([\s\S]*)$/);
  return (m ? m[1] : s).trim();
}

/**
 * Global filter — turns every thrown error into a clean JSON body
 * `{ statusCode, message, ... }` the frontend can rely on.
 *
 * - HttpException (BadRequest, the plan-limit ForbiddenException, …) is passed
 *   through unchanged, so structured payloads like { code:'plan_limit', … }
 *   still reach the client.
 * - gRPC errors are mapped to a sensible HTTP status + their real message.
 * - Anything else is a genuine 500 (logged, generic message to the user).
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

    const grpcCode = typeof exception?.code === 'number' ? exception.code : undefined;
    if (grpcCode !== undefined) {
      const status = GRPC_TO_HTTP[grpcCode] ?? HttpStatus.BAD_REQUEST;
      const message =
        cleanMessage(exception.details) ||
        cleanMessage(exception.message) ||
        'Une erreur est survenue.';
      return res.status(status).json({ statusCode: status, message });
    }

    this.logger.error(exception?.stack || exception?.message || String(exception));
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Une erreur interne est survenue. Veuillez réessayer.',
    });
  }
}
