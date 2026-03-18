import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AsyncStorageService } from '../async-storage.service';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: LoggerService,
    private readonly asyncStorage: AsyncStorageService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = this.asyncStorage.get<string>('requestId') || 'N/A';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      // Only log here if it's a raw non-HttpException (TransformInterceptor already logged it,
      // but if it reaches here without going through the interceptor, we still catch it).
      if (!(exception instanceof HttpException)) {
        const stack =
          exception instanceof Error ? exception.stack : String(exception);
        const message =
          exception instanceof Error ? exception.message : String(exception);
        this.logger.error(
          `[${requestId}] Unhandled exception on ${req.method} ${req.originalUrl}: ${message}`,
          stack ?? '',
          'ExceptionFilter',
        );
      }
    } else if (status >= 400) {
      const message =
        exception instanceof HttpException
          ? JSON.stringify(exception.getResponse())
          : String(exception);
      this.logger.warn(
        `[${requestId}] ${req.method} ${req.originalUrl} - ${status}: ${message}`,
        'ExceptionFilter',
      );
    }

    if (res.headersSent) return;

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: 'Internal server error' };

    res.status(status).json(body);
  }
}
