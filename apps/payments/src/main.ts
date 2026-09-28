import * as process from 'node:process';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { trustReverseProxy } from './trust-reverse-proxy';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // So that @Ip() and req.ip resolve to the real client IP from
  // X-Forwarded-For instead of the Docker internal gateway address.
  trustReverseProxy(app.getHttpAdapter().getInstance());

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

  app.setGlobalPrefix('payments');

  const port = process.env.PAYMENTS_PORT ?? 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`[payments] listening on port ${port}`);
}

bootstrap();
