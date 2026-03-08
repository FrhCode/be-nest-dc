import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AsyncStorageService } from '../async-storage.service';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(private readonly asyncStorage: AsyncStorageService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    const store = { requestId, method: req.method, path: req.path };

    this.asyncStorage.run(store, () => {
      res.setHeader('x-request-id', requestId);
      next();
    });
  }
}
