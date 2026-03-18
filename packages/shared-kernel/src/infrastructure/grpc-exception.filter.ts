import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { Observable, throwError } from 'rxjs';
import { BusinessRuleException, NotFoundException } from '../domain/exceptions';

@Catch()
export class GrpcExceptionFilter {
  private readonly logger = new Logger(GrpcExceptionFilter.name);

  catch(exception: any, _host: ArgumentsHost): Observable<never> {
    this.logger.error(`gRPC Exception: ${exception.message}`, exception.stack);

    let grpcStatus = GrpcStatus.INTERNAL;
    let message = exception.message || 'Internal server error';

    if (exception instanceof NotFoundException) {
      grpcStatus = GrpcStatus.NOT_FOUND;
    } else if (exception instanceof BusinessRuleException) {
      grpcStatus = GrpcStatus.INVALID_ARGUMENT;
    } else if (exception instanceof RpcException) {
      const error = exception.getError() as any;
      grpcStatus = error?.code ?? GrpcStatus.INTERNAL;
      message = error?.message ?? message;
    }

    return throwError(() => ({
      code: grpcStatus,
      message,
    }));
  }
}
