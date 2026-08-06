import * as process from 'node:process';
import { BotContext } from '@bot/bot.types';
import { Injectable, Logger } from '@nestjs/common';
import { RemnaService } from '@remna/remna.service';
import { mockBroadcastUserDto } from '@shared/mock-data';
import { Bot } from 'grammy';
import { PollAnswer } from '../../analytics/analytics.model';
import { AnalyticsService } from '../../analytics/analytics.service';

interface ActivePoll {
  question: string;
  options: string[];
}

@Injectable()
export class PollService {
  private readonly logger = new Logger(PollService.name);
  private readonly activePolls = new Map<string, ActivePoll>();

  private readonly BATCH_SIZE = 25;
  private readonly DELAY_MS = 1050;
  private readonly adminId = Number(process.env.TELEGRAM_ADMIN_ID);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly remnaService: RemnaService,
  ) {}

  register(bot: Bot<BotContext>) {
    bot.on('poll', async (ctx) => {
      const poll = ctx.poll;

      if (poll.is_anonymous) {
        await ctx.reply(
          `Poll "${poll.question}" is anonymous. "poll_answer" updates will NOT be received!`,
        );
        return;
      }

      this.logger.log(`Poll Metadata Update: "${poll.question}"`);

      this.activePolls.set(poll.id, {
        question: poll.question,
        options: poll.options.map((o) => o.text),
      });
    });

    // Listen for the initial poll message to trigger distribution
    bot.on(':poll', async (ctx) => {
      const poll = ctx.message?.poll;
      if (!poll) return;

      this.logger.log(`New Poll Detected: ${poll.question}`);

      this.activePolls.set(poll.id, {
        question: poll.question,
        options: poll.options.map((o) => o.text),
      });

      if (ctx.from?.id === this.adminId) {
        await this.broadcastPoll(ctx);
      }
    });

    bot.on('poll_answer', async (ctx) => {
      const { poll_id, user, option_ids } = ctx.pollAnswer;
      if (!user) return;

      const pollData = this.activePolls.get(poll_id);

      if (!pollData) {
        this.logger.warn(`Answer for untracked poll ${poll_id}. Question unknown.`);
        return;
      }

      this.logger.log('Received answer for poll:', pollData.question, 'from user:', user.id);

      const selectedOptions = option_ids.map((id) => pollData.options[id]);

      const answer: PollAnswer = {
        question: pollData.question,
        userId: user.id,
        userName: `${user.first_name || user.username} ${user.last_name || ''}`.trim(),
        options: selectedOptions,
        dateAndTime: new Date().toLocaleString(),
      };

      await this.analyticsService.addPollData(answer);
    });
  }

  private async broadcastPoll(ctx: BotContext) {
    const poll = ctx.message?.poll;
    if (!poll) return;

    if (poll.is_anonymous) {
      await ctx.reply('Poll is anonymous. Cannot broadcast.');
      return;
    }

    const isProd = process.env.NODE_ENV === 'production';
    const users = isProd ? await this.remnaService.getAllUsers() : mockBroadcastUserDto;
    const validUsers = users.filter((u) => u.telegramId && u.telegramId !== this.adminId);

    await ctx.reply(`Broadcasting poll "${poll.question}"`);

    const pollMetadata: ActivePoll = {
      question: poll.question,
      options: poll.options.map((o) => o.text),
    };

    for (let i = 0; i < validUsers.length; i += this.BATCH_SIZE) {
      const batch = validUsers.slice(i, i + this.BATCH_SIZE);
      const promises = batch.map(async (user) => {
        const excludeList = process.env.EXCLUDE_POLL_BROADCAST_LIST?.includes(
          <string>user.telegramId?.toString(),
        );

        try {
          if (!excludeList) {
            const sentMessage = await ctx.api.sendPoll(
              user.telegramId!,
              poll.question,
              poll.options.map((o) => o.text),
              {
                is_anonymous: poll.is_anonymous,
                type: poll.type,
                allows_multiple_answers: poll.allows_multiple_answers,
                explanation: poll.explanation,
                explanation_entities: poll.explanation_entities,
                open_period: poll.open_period,
                close_date: poll.close_date,
              },
            );

            if (sentMessage.poll) {
              this.activePolls.set(sentMessage.poll.id, pollMetadata);
            }
          }
        } catch (err) {
          const error = err as string;
          await this.remnaService.handleInvalidUserRemoval(user, error);
        }
      });

      await Promise.allSettled(promises);

      if (i + this.BATCH_SIZE < validUsers.length) {
        await new Promise((resolve) => setTimeout(resolve, this.DELAY_MS));
      }
    }

    await ctx.reply('Poll distribution finished!');
  }
}
