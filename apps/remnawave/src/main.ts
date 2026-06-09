import * as process from 'node:process';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const corsOriginEnv = process.env.CORS_ORIGIN;
  if (!corsOriginEnv) {
    throw new Error('CORS_ORIGIN environment variable must be set to an explicit origin URL');
  }

  // main.ts — after app is created
  app.getHttpAdapter().get('/', (_req, res) => res.status(200).send());

  const origin = corsOriginEnv
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: process.env.NODE_ENV !== 'production' ? true : origin,
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('remnawave');

  const port = process.env.REMNAWAVE_PORT ?? 3002;
  await app.listen(port, '0.0.0.0');

  console.log(`[remnawave] listening on port ${port}`);
}

bootstrap();
