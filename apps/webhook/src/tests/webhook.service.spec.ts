import 'reflect-metadata';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { REMNAWAVE_EVENTS, REMNAWAVE_EVENTS_SCOPES } from '@workspace/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebhookService } from '../main/webhook.service';

const mockAxiosPost = vi.fn().mockResolvedValue({ status: 200 });

vi.mock('axios', () => ({
  default: {
    post: (...args: any[]) => mockAxiosPost(...args),
  },
}));

describe('WebhookService', () => {
  let service: WebhookService;

  const mockEventEmitter = {
    emit: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn((key: string, fallback?: string): string => {
      const map: Record<string, string> = {
        PAYMENTS_URL: 'http://payments:3001',
      };
      return map[key] ?? fallback ?? '';
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WebhookService(
      mockEventEmitter as unknown as EventEmitter2,
      mockConfigService as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('forwardStripeWebhook', () => {
    it('forwards raw body and signature to payments service', async () => {
      const rawBody = Buffer.from('{"test": true}');
      await service.forwardStripeWebhook(rawBody, 'sig_123');

      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.stringContaining('/stripe/webhook'),
        rawBody,
        expect.objectContaining({
          headers: expect.objectContaining({
            'stripe-signature': 'sig_123',
          }),
        }),
      );
    });
  });

  describe('processRemnaEvent', () => {
    it('forwards user.expiration -48h event to payments, not bot', async () => {
      const payload = {
        scope: REMNAWAVE_EVENTS_SCOPES.USER,
        event: REMNAWAVE_EVENTS.USER.EXPIRATION,
        data: { uuid: 'user-1', telegramId: 42 },
        meta: { expiration: -48 },
      } as any;

      await service.processRemnaEvent(payload);

      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.stringContaining('/remnawave-event'),
        payload,
        expect.any(Object),
      );
    });

    it('forwards user.expiration -24h event to payments only', async () => {
      const payload = {
        scope: REMNAWAVE_EVENTS_SCOPES.USER,
        event: REMNAWAVE_EVENTS.USER.EXPIRATION,
        data: { uuid: 'user-1', telegramId: 42 },
        meta: { expiration: -24 },
      } as any;

      await service.processRemnaEvent(payload);

      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.stringContaining('/remnawave-event'),
        payload,
        expect.any(Object),
      );
    });

    it('forwards user.expiration +24h event to bot only', async () => {
      const payload = {
        scope: REMNAWAVE_EVENTS_SCOPES.USER,
        event: REMNAWAVE_EVENTS.USER.EXPIRATION,
        data: { uuid: 'user-1', telegramId: 42 },
        meta: { expiration: 24 },
      } as any;

      await service.processRemnaEvent(payload);

      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.stringContaining('/notify/user-event'),
        payload,
        expect.any(Object),
      );
    });

    it('forwards user.expired event to bot only', async () => {
      const payload = {
        scope: REMNAWAVE_EVENTS_SCOPES.USER,
        event: REMNAWAVE_EVENTS.USER.EXPIRED,
        data: { uuid: 'user-1', telegramId: 42 },
        meta: null,
      } as any;

      await service.processRemnaEvent(payload);

      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.stringContaining('/notify/user-event'),
        payload,
        expect.any(Object),
      );
    });

    it('forwards user.first_connected event to bot only', async () => {
      const payload = {
        scope: REMNAWAVE_EVENTS_SCOPES.USER,
        event: REMNAWAVE_EVENTS.USER.FIRST_CONNECTED,
        data: { id: 846, uuid: 'user-1', telegramId: 42 },
        meta: null,
      } as any;

      await service.processRemnaEvent(payload);

      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.stringContaining('/notify/user-event'),
        payload,
        expect.any(Object),
      );
    });

    it('skips user.expiration event without meta.expiration', async () => {
      const payload = {
        scope: REMNAWAVE_EVENTS_SCOPES.USER,
        event: REMNAWAVE_EVENTS.USER.EXPIRATION,
        data: { uuid: 'user-1', telegramId: 42 },
        meta: null,
      } as any;

      await service.processRemnaEvent(payload);

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });
  });

  describe('forwardYookassaWebhook', () => {
    it('forwards payload and IP to payments service', async () => {
      const payload = { type: 'notification', event: 'payment.succeeded', object: {} } as any;
      await service.forwardYookassaWebhook(payload, '1.2.3.4');

      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.stringContaining('/yookassa/webhook'),
        payload,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-forwarded-for': '1.2.3.4',
          }),
        }),
      );
    });
  });
});
