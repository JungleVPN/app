import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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

  describe('validateAndProcessTorrent', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string, fallback?: string): string => {
        if (key === 'REMNAWAVE_TORRENT_WEBHOOK_TOKEN') return 'token';
        return fallback ?? '';
      });
      service = new WebhookService(
        mockEventEmitter as unknown as EventEmitter2,
        mockConfigService as any,
      );
    });

    it('throws BadRequestException for invalid token', () => {
      const payload = {} as any;
      expect(() => service.validateAndProcessTorrent('invalid', payload)).toThrow(
        BadRequestException,
      );
    });

    it('emits event for valid token', () => {
      const payload = { username: 'test' } as any;
      service.validateAndProcessTorrent('token', payload);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('torrent.event', payload);
    });
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
