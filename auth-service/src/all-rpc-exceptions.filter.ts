import { ArgumentsHost, Catch, Logger, RpcExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

// gRPC status codes. We tag each error with one so the API gateway can map it
// to the right HTTP status (401 for bad credentials, 409 for duplicates, …).
const GRPC = {
  UNKNOWN: 2,
  INVALID_ARGUMENT: 3,
  NOT_FOUND: 5,
  ALREADY_EXISTS: 6,
  PERMISSION_DENIED: 7,
  UNAUTHENTICATED: 16,
};

// Best-effort code from the message (FR + EN) so the HTTP status is sensible.
function inferCode(message: string): number {
  const m = message.toLowerCase();
  if (
    m.includes('mot de passe') ||
    m.includes('password') ||
    m.includes('identifiant') ||
    m.includes('credential') ||
    m.includes('token')
  ) {
    return GRPC.UNAUTHENTICATED;
  }
  if (m.includes('déjà') || m.includes('already') || m.includes('exists')) {
    return GRPC.ALREADY_EXISTS;
  }
  if (m.includes('introuvable') || m.includes('not found') || m.includes('inexistant')) {
    return GRPC.NOT_FOUND;
  }
  if (m.includes('admin') || m.includes('permission') || m.includes('droit')) {
    return GRPC.PERMISSION_DENIED;
  }
  return GRPC.INVALID_ARGUMENT;
}

/**
 * Global RPC exception filter.
 *
 * NestJS's default behaviour replaces ANY plain `throw new Error('real message')`
 * in a gRPC handler with a generic "Internal server error" (the real text is
 * only logged), so the gateway — and the user — never see why something failed.
 *
 * This filter PRESERVES the real message and attaches a gRPC status code, so the
 * gateway can surface "E-mail ou mot de passe incorrect." etc. instead of a 500.
 */
@Catch()
export class AllRpcExceptionsFilter implements RpcExceptionFilter {
  private readonly logger = new Logger('RpcExceptionFilter');

  catch(exception: any, _host: ArgumentsHost): Observable<any> {
    // Honour explicit RpcException payloads as-is.
    if (exception instanceof RpcException) {
      const err = exception.getError();
      if (err && typeof err === 'object') return throwError(() => err);
      const message = String(err);
      return throwError(() => ({ code: inferCode(message), message, details: message }));
    }

    // Any other error (plain Error, HttpException thrown inside a handler, …):
    // keep the message instead of hiding it behind "Internal server error".
    const message =
      exception && exception.message ? String(exception.message) : 'Une erreur est survenue.';
    this.logger.warn(`gRPC handler error surfaced: ${message}`);
    return throwError(() => ({ code: inferCode(message), message, details: message }));
  }
}
