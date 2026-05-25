import * as process from 'node:process';
import { BotService } from '@bot/bot.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.setGlobalPrefix('bot');

  app.getHttpAdapter().getInstance().set('trust proxy', true);

  const corsOriginEnv = process.env.CORS_ORIGIN;
  if (!corsOriginEnv) {
    throw new Error('CORS_ORIGIN environment variable must be set to an explicit origin URL');
  }

  const origin = corsOriginEnv
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: process.env.NODE_ENV !== 'production' ? '*' : origin,
    credentials: true,
  });

  const port = Number(process.env.BOT_PORT) || 7000;

  await app.listen(port, '0.0.0.0');
  console.log(`Server is running on http://localhost:${port}`);

  const bot = app.get(BotService).bot;
  await bot.start();
}
bootstrap();
