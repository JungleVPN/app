import * as path from 'node:path';
import * as process from 'node:process';
import { BotContext } from '@bot/bot.types';
import { I18n } from '@grammyjs/i18n';
import { Injectable } from '@nestjs/common';
import { RemnaService } from '@remna/remna.service';

@Injectable()
export class LocalisationService {
  readonly i18n: I18n<BotContext>;

  constructor(private readonly remnaService: RemnaService) {
    this.i18n = new I18n<BotContext>({
      defaultLocale: process.env.DEFAULT_LOCALE || 'en',
      directory: path.join(__dirname, 'i18n'),
      localeNegotiator: async (ctx) => {
        const uuid = ctx.session?.userId;
        if (uuid) {
          const lang = await this.remnaService.getUserLang(uuid);
          if (lang) return lang;
        }
        return ctx.from?.language_code ?? undefined;
      },
    });
  }
}
