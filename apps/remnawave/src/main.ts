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

  // Exactly one hop, not `true`. Caddy appends the real peer address to
  // X-Forwarded-For, so trusting one proxy makes `req.ip` that appended entry.
  // Trusting all of them would make `req.ip` the left-most entry — a value the
  // visitor controls, which /ip-status compares against node addresses.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

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
