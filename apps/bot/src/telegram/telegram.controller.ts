import type { ServerResponse } from 'node:http';
import * as process from 'node:process';
import { BotService } from '@bot/bot.service';
import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly botService: BotService) {}

  /**
   * Proxies a Telegram sticker by file ID — resolves the download URL via
   * the bot's grammy client and streams the bytes back to the caller,
   * avoiding a cross-origin redirect to api.telegram.org.
   *
   * Cache-Control is set to 1 day since sticker bytes never change for a
   * given fileId.
   */
  @Get('sticker/:fileId')
  async getSticker(@Param('fileId') fileId: string, @Res() res: ServerResponse): Promise<void> {
    const file = await this.botService.bot.api.getFile(fileId);

    if (!file.file_path) {
      throw new NotFoundException(`Sticker file not found for fileId: ${fileId}`);
    }

    const token = process.env.PUBLIC_TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    const upstream = await fetch(url);

    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') ?? 'application/octet-stream',
    );
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const reader = upstream.body!.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  }
}
