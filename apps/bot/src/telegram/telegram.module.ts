import { Module } from '@nestjs/common';
import { BotModule } from '@bot/bot.module';
import { TelegramController } from './telegram.controller';

@Module({
  imports: [BotModule],
  controllers: [TelegramController],
})
export class TelegramModule {}
