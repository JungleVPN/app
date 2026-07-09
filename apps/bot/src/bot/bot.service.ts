import * as process from 'node:process';
import { BotContext, initialSession } from '@bot/bot.types';
import { NavigateMainCallback } from '@bot/callbacks/navigate-main.callback';
import { BroadcastDeleteCommand } from '@bot/commands/broadcast/broadcast-delete.command';
import { BroadcastEditCommand } from '@bot/commands/broadcast/broadcast-edit.command';
import { BroadcastMessageCommand } from '@bot/commands/broadcast/broadcast-message.command';
import { StartCommand } from '@bot/commands/start.command';
import { InlineQueryListener } from '@bot/listeners/inline-query.listener';
import { TelegramStarsListener } from '@bot/listeners/telegram-stars.listener';
import { LocalisationService } from '@bot/localisation/localisation.service';
import { MainKeyboardCallback } from '@bot/navigation/features/main/main-keyboard.callback';
import { MenuTree } from '@bot/navigation/menu.tree';
import { PollService } from '@bot/poll/poll.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Bot, GrammyError, HttpError, session } from 'grammy';

@Injectable()
export class BotService implements OnModuleInit {
  token = process.env.PUBLIC_TELEGRAM_BOT_TOKEN;
  bot: Bot<BotContext>;

  constructor(
    private readonly menuTree: MenuTree,
    private readonly startCommand: StartCommand,
    private readonly broadcastMessageCommand: BroadcastMessageCommand,
    private readonly broadcastEditCommand: BroadcastEditCommand,
    private readonly broadcastDeleteCommand: BroadcastDeleteCommand,
    private readonly navigateMainCallback: NavigateMainCallback,
    private readonly mainKeyboardCallback: MainKeyboardCallback,
    private readonly localService: LocalisationService,
    private readonly inlineQueryListener: InlineQueryListener,
    private readonly telegramStarsListener: TelegramStarsListener,
    private readonly pollService: PollService,
  ) {
    if (!this.token) {
      throw new Error('TELEGRAM_BOT_TOKEN missing');
    }

    this.bot = new Bot(this.token);
  }

  async onModuleInit() {
    this.bot.use(session({ initial: initialSession }));

    this.bot.use(this.localService.i18n);

    this.menuTree.init(this.bot);

    this.startCommand.register(this.bot);
    this.broadcastMessageCommand.register(this.bot);
    this.broadcastEditCommand.register(this.bot);
    this.broadcastDeleteCommand.register(this.bot);
    this.pollService.register(this.bot);

    this.navigateMainCallback.register(this.bot);
    this.mainKeyboardCallback.register(this.bot);
    this.inlineQueryListener.register(this.bot);
    this.telegramStarsListener.register(this.bot);

    this.bot.catch((err) => {
      const e = err.error;
      if (e instanceof GrammyError) {
        console.log('GrammyError. Error in request:', e);
      } else if (e instanceof HttpError) {
        console.log('HttpError. Could not contact Telegram:', e);
      } else {
        console.log('Unknown error:', e);
      }
    });
  }
}
