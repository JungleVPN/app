import * as process from 'node:process';
import { BotContext } from '@bot/bot.types';
import { PROD } from '@bot/utils/constants';
import { convertEntitiesToHtml } from '@bot/utils/utils';
import {
  BroadcastAudience,
  DEFAULT_AUDIENCE,
  filterUsersByAudience,
  parseAudience,
} from '@broadcasts/broadcast-audience';
import {
  BroadcastDto,
  BroadcastMessageDto,
  BroadcastsService,
} from '@broadcasts/broadcasts.service';
import { RemnaService } from '@remna/remna.service';
import { mockBroadcastUserDto } from '@shared/mock-data';
import { UserDto } from '@workspace/types';

export abstract class BroadcastBase {
  protected successCount = 0;
  protected failureCount = 0;
  protected errorMessages: string[] = [];

  private readonly BATCH_SIZE = 25;
  private readonly DELAY_MS = 1050;

  protected constructor(
    protected readonly remnaService: RemnaService,
    protected readonly broadcastsService: BroadcastsService,
  ) {}

  protected async processBatch<T>(items: T[], processItem: (item: T) => Promise<void>) {
    const totalItems = items.length;

    for (let i = 0; i < totalItems; i += this.BATCH_SIZE) {
      const batch = items.slice(i, i + this.BATCH_SIZE);

      const promises = batch.map(async (item) => {
        try {
          await processItem(item);
          this.successCount++;
        } catch (e) {
          this.failureCount++;
        }
      });

      await Promise.allSettled(promises);

      if (i + this.BATCH_SIZE < totalItems) {
        await new Promise((resolve) => setTimeout(resolve, this.DELAY_MS));
      }
    }
  }

  protected isAdmin(fromId: number | undefined): boolean {
    return fromId === Number(process.env.TELEGRAM_ADMIN_ID);
  }

  protected parseBroadcastId(
    message: string,
    commandName: string,
  ): { broadcastId: number } | { error: string } {
    const regex = new RegExp(`\\/${commandName}\\s+(\\d+)`);
    const match = message.match(regex);

    if (!match) {
      return {
        error: `Invalid format. Use: <code>/${commandName} &lt;BROADCAST_ID&gt;</code>`,
      };
    }

    return { broadcastId: Number(match[1]) };
  }

  protected async fetchBroadcastWithMessages(
    ctx: BotContext,
    broadcastId: number,
  ): Promise<{ broadcast: BroadcastDto; messages: BroadcastMessageDto[] } | null> {
    const broadcast = await this.broadcastsService.getById(broadcastId);

    if (!broadcast) {
      await ctx.reply(`Broadcast ID ${broadcastId} not found.`);
      return null;
    }

    const messages = await this.broadcastsService.getMessages(broadcastId);

    if (messages.length === 0) {
      await ctx.reply(`No messages found for broadcast ID ${broadcastId}.`);
      return null;
    }

    return { broadcast, messages };
  }

  protected async getValidUsers(
    audience: BroadcastAudience = DEFAULT_AUDIENCE,
  ): Promise<UserDto[]> {
    const isProd = process.env.NODE_ENV === PROD;
    const users = isProd ? await this.remnaService.getAllUsers() : mockBroadcastUserDto;

    const eligible = users.filter((u) => u.telegramId && !this.isAdmin(u.telegramId));

    return filterUsersByAudience(eligible, audience);
  }

  /**
   * Extract the target audience from a broadcast command, e.g. `/message expired`.
   * Defaults to "all" when no segment is provided.
   */
  protected parseAudience(message: string | undefined): BroadcastAudience {
    const token = message?.split('\n')[0].trim().split(/\s+/)[1];

    return parseAudience(token);
  }

  protected mapErrorMessages(errorMessages?: string[]): string | null {
    return errorMessages && errorMessages.length > 0 ? errorMessages.join('\n') : null;
  }

  protected parseMessageText(
    message: string | undefined,
    entities?: any[],
    commandPrefix?: string,
  ): string | null {
    if (!message || message.startsWith('/start')) return null;

    // Check if message starts with expected command prefix
    if (commandPrefix && !message.startsWith(commandPrefix)) return null;

    const lines = message.split('\n');
    const textLines = lines.slice(1);
    const textToSend = textLines.join('\n');
    if (!textToSend || textToSend.startsWith('/start')) return null;

    // Convert entities to HTML, adjusting offset for removed first line
    if (entities && entities.length > 0) {
      const firstLineLength = lines[0].length + 1; // +1 for newline
      const adjustedEntities = entities
        .map((entity) => ({
          ...entity,
          offset: entity.offset - firstLineLength,
        }))
        .filter((entity) => entity.offset >= 0); // Only keep entities after first line

      return convertEntitiesToHtml(textToSend, adjustedEntities);
    }

    return textToSend;
  }

  protected resetState() {
    this.successCount = 0;
    this.failureCount = 0;
    this.errorMessages = [];
  }
}
