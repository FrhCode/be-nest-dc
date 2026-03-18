import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { join } from 'path';
import { AppModule } from './app.module';
import { LoggerService } from './core/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(LoggerService));

  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('Discord Clone API')
    .setDescription(
      'REST API for a Discord-like chat platform with servers, channels, and messages',
    )
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(documentFactory()));

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.useStaticAssets(join(process.cwd(), 'uploads', 'temp'), {
    prefix: '/uploads/temp/',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  app.get(LoggerService).log(`Server running on port http://localhost:${port}`);
  app.get(LoggerService).log(`Docs available on http://localhost:${port}/docs`);
}
bootstrap();
