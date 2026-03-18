import { DrizzleService } from '@/core/orm/drizzle.service';
import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AsyncStorageService } from './async-storage.service';
import config from './config';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { LoggerService } from './logger/logger.service';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { RequestIdMiddleware } from './middleware/request-id.middleware';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
      isGlobal: true,
    }),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    AsyncStorageService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    LoggerService,
    DrizzleService,
  ],
  exports: [AsyncStorageService, LoggerService, DrizzleService],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, LoggerMiddleware).forRoutes('*');
  }
}
