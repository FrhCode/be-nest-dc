import { Injectable, LoggerService as NestLoger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';

@Injectable()
export class LoggerService implements NestLoger {
  private readonly logger: winston.Logger;

  constructor(private readonly configService: ConfigService) {
    const isDevelopment =
      this.configService.getOrThrow<string>('NODE_ENV') === 'development';

    if (isDevelopment) {
      this.logger = winston.createLogger({
        level: 'debug',
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(
            ({
              timestamp,
              level,
              message,
              context,
              trace,
              meta,
            }: {
              timestamp: string;
              level: string;
              message: string;
              context?: string;
              trace?: string;
              meta?: Record<string, any>;
            }) =>
              `${timestamp} [${level}]${
                context ? ' [' + context + ']' : ''
              } : ${message}${
                trace ? '\nTrace: ' + trace : ''
              }${meta ? '\nMeta: ' + JSON.stringify(meta, null, 2) : ''}`,
          ),
        ),
        transports: [new winston.transports.Console()],
      });
    } else {
      this.logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
        transports: [new winston.transports.Console()],
      });
    }
  }

  log(message: string, context?: string, meta?: Record<string, any>) {
    this.logger.info(message, { context, meta });
  }

  error(
    message: string,
    trace: string,
    context?: string,
    meta?: Record<string, any>,
  ) {
    this.logger.error(`${message}`, { context, trace, meta });
  }

  warn(message: string, context?: string, meta?: Record<string, any>) {
    this.logger.warn(message, { context, meta });
  }

  debug(message: string, context?: string, meta?: Record<string, any>) {
    this.logger.debug(message, { context, meta });
  }

  verbose(message: string, context?: string, meta?: Record<string, any>) {
    this.logger.verbose(message, { context, meta });
  }
}
