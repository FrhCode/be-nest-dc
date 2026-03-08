import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { AsyncStorageService } from '../async-storage.service';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: LoggerService,
    private readonly asyncStorage: AsyncStorageService,
  ) {}

  use(req: Request, res: Response, next: () => void) {
    const requestId = this.asyncStorage.get<string>('requestId') || 'N/A';
    this.logger.log(`[${requestId}] ${req.method} ${req.originalUrl}`, 'HTTP');
    const safeStringify = (obj: any, max = 1000) => {
      try {
        const s = JSON.stringify(obj);
        return s.length > max ? `${s.slice(0, max)}... (truncated)` : s;
      } catch {
        return '[unserializable]';
      }
    };

    if (req.body) {
      this.logger.log(
        `[${requestId}] Body: ${safeStringify(req.body)}`,
        'HTTP',
      );
    }
    const requestStart = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - requestStart;
      // do logger base on response status
      const statusCode = res.statusCode;
      const logMessage = `[${requestId}] ${req.method} ${req.originalUrl} - ${statusCode} - ${duration}ms`;

      if (statusCode >= 500) {
        this.logger.error(logMessage, 'HTTP');
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage, 'HTTP');
      } else {
        this.logger.log(logMessage, 'HTTP');
      }
    });

    next();
  }
}
