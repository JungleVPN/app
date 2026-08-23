import 'reflect-metadata';
import * as process from 'node:process';
import type { Payments, RemnawebhookPayload } from '@workspace/types';
import { apiRoutes } from '@workspace/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BotNotificationService } from './bot-notification.service';

const mockAxiosPost = vi.fn();
const mockAxiosGet = vi.fn();
const isAxiosError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as any).isAxiosError === true;

vi.mock('axios', () => ({
  default: {
    post: (...args: unknown[]) => mockAxiosPost(...args),
    get: (...args: unknown[]) => mockAxiosGet(...args),
  },
  isAxiosError: (err: unknown) => isAxiosError(err),
}));

const makeRemnawavePayload = (): RemnawebhookPayload =>
  ({
    scope: 'user',
    event: 'user.expires_in_48_hours',
    data: {
      id: 1000,
      username: 'test',
      status: 'ACTIVE',
      telegramId: 42,
    },
    timestamp: new Date(),
    meta: null,
  }) as unknown as RemnawebhookPayload;

const makeExpiryEvent = (
  overrides: Partial<Payments.PaymentExpiryReminderEventPayload> = {},
): Payments.PaymentExpiryReminderEventPayload => ({
  userId: 1000,
  provider: 'yookassa',
  hoursRemaining: 48,
  remnawavePayload: makeRemnawavePayload(),
  ...overrides,
});

const REQUIRED_ENV = {
  BOT_URL: 'http://bot:7080',
  BOT_NOTIFY_SECRET: 'secret',
};

describe('BotNotificationService', () => {
  let service: BotNotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const [key, value] of Object.entries(REQUIRED_ENV)) {
      process.env[key] = value;
    }
    service = new BotNotificationService();
  });

  afterEach(() => {
    for (const key of Object.keys(REQUIRED_ENV)) {
      delete process.env[key];
    }
  });

  describe('onExpiryReminder', () => {
    it('forwards the raw remnawave payload to the bot user-event endpoint', async () => {
      mockAxiosPost.mockResolvedValue({ status: 200 });
      const event = makeExpiryEvent();

      await service.onExpiryReminder(event);

      expect(mockAxiosPost).toHaveBeenCalledWith(
        `http://bot:7080${apiRoutes.bot.notifyUserEvent}`,
        event.remnawavePayload,
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-bot-secret': 'secret' }),
          timeout: 10_000,
        }),
      );
    });

    it('logs and swallows a bot notification failure without throwing', async () => {
      mockAxiosPost.mockRejectedValue(new Error('bot down'));

      await expect(service.onExpiryReminder(makeExpiryEvent())).resolves.toBeUndefined();
    });

    it('falls back to local bot defaults when neither variable is configured', async () => {
      delete process.env.BOT_URL;
      delete process.env.BOT_NOTIFY_SECRET;
      mockAxiosPost.mockResolvedValue({ status: 200 });

      await service.onExpiryReminder(makeExpiryEvent());

      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:7080/bot'),
        expect.anything(),
        expect.anything(),
      );
    });
  });
});
