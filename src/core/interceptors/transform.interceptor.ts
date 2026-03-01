import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AsyncStorageService } from '../async-storage.service';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly asyncStorage: AsyncStorageService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Request>();
    const requestId = this.asyncStorage.get<string>('requestId');

    return next.handle().pipe(
      map((object) => {
        const statusCode = response?.statusCode || 200;

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

        const basicResponse = {
          statusCode,
          requestId,
          message: getMessage(statusCode),
        };

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
    );
  }
}
