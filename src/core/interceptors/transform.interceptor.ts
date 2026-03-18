import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ZodError } from 'zod';
import { AsyncStorageService } from '../async-storage.service';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(
    private readonly asyncStorage: AsyncStorageService,
    private readonly logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = this.asyncStorage.get<string>('requestId');

    const getMessage = (code: number) => {
      const mapExact: Record<number, string> = {
        200: 'OK',
        201: 'Created',
        204: 'No Content',
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        422: 'Unprocessable Entity',
        500: 'Internal Server Error',
      };

      if (mapExact[code]) return mapExact[code];
      if (code >= 200 && code < 300) return 'Success';
      if (code >= 400 && code < 500) return 'Client Error';
      if (code >= 500) return 'Server Error';
      return 'Unknown Status';
    };

    const getBasicResponse = (statusCode: number) => ({
      statusCode,
      requestId,
      message: getMessage(statusCode),
    });

    return next.handle().pipe(
      map((object) => {
        const statusCode = response?.statusCode || 200;
        const basicResponse = getBasicResponse(statusCode);

        if (object === null || object === undefined) {
          return {
            ...basicResponse,
            data: [],
          };
        }

        // eslint-disable-next-line
        if (object.data !== undefined && object.meta !== undefined) {
          // eslint-disable-next-line
          return {
            ...basicResponse,
            ...object,
          };
        }

        return {
          ...basicResponse,
          // eslint-disable-next-line
          data: object,
        };
      }),
      catchError((error: unknown) => {
        const statusCode =
          error instanceof HttpException ? error.getStatus() : 500;

        if (!(error instanceof HttpException)) {
          const requestId = this.asyncStorage.get<string>('requestId') || 'N/A';
          const stack = error instanceof Error ? error.stack : String(error);
          const message =
            error instanceof Error ? error.message : String(error);
          const cause =
            error instanceof Error && error.cause != null
              ? `\nCause: ${error.cause instanceof Error ? error.cause.stack : JSON.stringify(error.cause, null, 2)}`
              : '';
          this.logger.error(
            `[${requestId}] Unhandled error: ${message}${cause}`,
            stack ?? '',
            'TransformInterceptor',
          );
        }

        const zodIssues =
          error instanceof ZodValidationException
            ? (error.getZodError() as ZodError).issues
            : undefined;

        let message = getMessage(statusCode);
        if (error instanceof HttpException) {
          const response = error.getResponse();
          if (typeof response === 'string') {
            message = response;
          } else if (
            typeof response === 'object' &&
            response !== null &&
            'message' in response
          ) {
            const msg = (response as Record<string, unknown>).message;
            message = Array.isArray(msg) ? msg.join(', ') : String(msg);
          }
        }

        return throwError(
          () =>
            new HttpException(
              {
                ...getBasicResponse(statusCode),
                message,
                data: [],
                ...(zodIssues && { errors: zodIssues }),
              },
              statusCode,
            ),
        );
      }),
    );
  }
}
