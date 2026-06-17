import { BotContext } from '@bot/bot.types';
import { BroadcastBase } from '@bot/commands/broadcast/broadcast.base';
import { safeReplyMessage, safeSendMessage, safeSendPhoto } from '@bot/utils/utils';
import { BroadcastDto, BroadcastsService } from '@broadcasts/broadcasts.service';
import { Injectable } from '@nestjs/common';
import { RemnaService } from '@remna/remna.service';
import { UserDto } from '@workspace/types';
import { Bot } from 'grammy';

@Injectable()
export class BroadcastMessageCommand extends BroadcastBase {
  constructor(
    readonly remnaService: RemnaService,
    readonly broadcastsService: BroadcastsService,
  ) {
    super(remnaService, broadcastsService);
  }

  register(bot: Bot<BotContext>) {
    bot.on('message:photo', (ctx) => this.proccessMessage(ctx, bot));
    bot.command('message', (ctx) => this.proccessMessage(ctx, bot));
  }

  private proccessMessage = async (ctx: BotContext, bot: Bot<BotContext>) => {
    if (!this.isAdmin(ctx.from?.id)) return;

    // Check if message has a photo
    const photo = ctx.message?.photo;
    const imageFileId = photo ? photo[photo.length - 1].file_id : undefined;

    // Parse text from message or caption
    const rawText = imageFileId ? ctx.message?.caption : ctx.message?.text;
    const entities = imageFileId ? ctx.message?.caption_entities : ctx.message?.entities;
    const textToSend = this.parseMessageText(rawText, entities, '/message');

    if (!textToSend) return;

    const audience = this.parseAudience(rawText);
    const validUsers = await this.getValidUsers(audience);

    const broadcast = await this.broadcastsService.create(textToSend);

    await ctx.reply(`Starting broadcast to ${audience} users (${validUsers.length})...`);
    await this.sendBroadcastToUsers(bot, validUsers, textToSend, broadcast, imageFileId);

    const errorMessagesText = this.mapErrorMessages(this.errorMessages);
    const resultMessage = this.getBroadcastMessage(broadcast, errorMessagesText);

    const erroReplyMessage = await safeReplyMessage(ctx, resultMessage);

    if (typeof erroReplyMessage === 'string') {
      const resultReplyMessage = this.getBroadcastMessage(broadcast, erroReplyMessage);
      await safeReplyMessage(ctx, resultReplyMessage);
    }
    this.resetState();
  };

  private async sendBroadcastToUsers(
    bot: Bot<BotContext>,
    users: UserDto[],
    textToSend: string,
    broadcast: BroadcastDto,
    imageFileId?: string,
  ) {
    await this.processBatch(users, async (user) => {
      const result = imageFileId
        ? await safeSendPhoto(bot, user.telegramId || 0, imageFileId, textToSend)
        : await safeSendMessage(bot, user.telegramId || 0, textToSend);

      const isError = typeof result === 'string';

      console.log(isError && result);

      if (isError) {
        const isInvalidUser = await this.remnaService.handleInvalidUserRemoval(user, result);

        if (isInvalidUser) {
          this.errorMessages.push(`Deleted user ${user.telegramId} - blocked and not connected`);
        } else {
          this.errorMessages.push(`<code>${user.telegramId}</code>: ${result}`);
        }

        throw new Error(result);
      }

      await this.broadcastsService.addMessage(
        broadcast.id,
        String(user.telegramId),
        result.message_id,
      );
    });
  }

  private getBroadcastMessage(broadcast: BroadcastDto, errorMessages?: string | null): string {
    return `Message sent
Broadcast ID: ${broadcast.id}
Success: ${this.successCount}
Failed: ${this.failureCount}

To edit:
<blockquote>
<code>/editmsg ${broadcast.id}
${broadcast.messageText}</code>
</blockquote>

To delete:
<blockquote>
<code>/deletemsg ${broadcast.id}</code>
</blockquote>

<blockquote expandable>
${errorMessages ? `<b>Errors:</b>\n${errorMessages}` : 'No errors.'}
</blockquote>
`;
  }
}
