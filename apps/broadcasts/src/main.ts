import * as process from 'node:process';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.setGlobalPrefix('broadcasts');

  const port = process.env.BROADCASTS_PORT ?? 3005;
  await app.listen(port, '0.0.0.0');

  console.log(`[broadcasts] listening on port ${port}`);
}

bootstrap();
