import * as process from 'node:process';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOriginEnv = process.env.CORS_ORIGIN;
  if (!corsOriginEnv) {
    throw new Error('CORS_ORIGIN environment variable must be set to an explicit origin URL');
  }

  const origin = corsOriginEnv
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: process.env.NODE_ENV !== 'production' ? true : origin,
    credentials: true,
  });

  app.setGlobalPrefix('referrals');

  const port = process.env.REFERRALS_PORT ?? 3004;
  await app.listen(port, '0.0.0.0');

  console.log(`[referrals] listening on port ${port}`);
}

bootstrap();
