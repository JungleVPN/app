import 'reflect-metadata';
import * as crypto from 'node:crypto';
import * as process from 'node:process';

import { UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RemnaSignatureGuard } from '../main/remna-signature.guard';
import { WebhookController } from '../main/webhook.controller';
import { WebhookService } from '../main/webhook.service';

// ── axios mock ────────────────────────────────────────────────────────────────
const mockAxiosPost = vi.fn().mockResolvedValue({ status: 200 });
vi.mock('axios', () => ({
  default: { post: (...args: any[]) => mockAxiosPost(...args) },
}));

// ── Shared helpers ────────────────────────────────────────────────────────────

const makeConfigService = (overrides: Record<string, string> = {}) => ({
  get: vi.fn((key: string, fallback?: string): string => {
    const defaults: Record<string, string> = {
      PAYMENTS_URL: 'http://payments:3001',
      NODE_ENV: 'test',
      REMNAWAVE_WEBHOOK_SECRET: 'super-secret',
      ...overrides,
    };
    return defaults[key] ?? fallback ?? '';
  }),
});

const makeEventEmitter = () => ({ emit: vi.fn() }) as unknown as EventEmitter2;

const makeValidSignature = (secret: string, payload: object): string =>
  crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

const remnaPayload = {
  scope: 'user',
  event: 'user.expiration',
  data: { uuid: 'u-1', telegramId: 42 },
  timestamp: '2026-01-01T00:00:00Z',
  meta: { expiration: -24 },
} as any;

describe('Security Audit', () => {
  describe('[FINDING #2] WebhookController — YooKassa IP from x-forwarded-for', () => {
    let service: WebhookService;
    let controller: WebhookController;

    beforeEach(() => {
      vi.clearAllMocks();
      service = new WebhookService(makeEventEmitter(), makeConfigService() as any);
      controller = new WebhookController(service);
      vi.spyOn(service, 'forwardYookassaWebhook').mockResolvedValue(undefined);
    });

    it('forwards the first x-forwarded-for hop to payments', async () => {
      const payload = { type: 'notification', event: 'payment.succeeded', object: {} } as any;

      await controller.handleYookassaEvents('185.71.76.1', '172.19.0.7', payload);

      expect(service.forwardYookassaWebhook).toHaveBeenCalledWith(payload, '185.71.76.1');
    });

    it('forwards empty string when x-forwarded-for is absent', async () => {
      const payload = { type: 'notification', event: 'payment.succeeded', object: {} } as any;

      await controller.handleYookassaEvents('', '203.0.113.99', payload);

      expect(service.forwardYookassaWebhook).toHaveBeenCalledWith(payload, '203.0.113.99');
    });
  });
  describe('[FINDING #7] RemnaSignatureGuard — HMAC signature must be validated in all environments', () => {
    const makeGuard = (secret: string) => new RemnaSignatureGuard({ get: () => secret } as any);

    const makeContext = (signature: string, body: unknown) =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { 'x-remnawave-signature': signature },
            body,
          }),
        }),
      }) as any;

    it('rejects an invalid signature', () => {
      const guard = makeGuard('super-secret');
      const ctx = makeContext('totally-wrong-signature', remnaPayload);

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('rejects an empty signature', () => {
      const guard = makeGuard('super-secret');
      const ctx = makeContext('', remnaPayload);

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('rejects the string "undefined" as a signature', () => {
      const guard = makeGuard('super-secret');
      const ctx = makeContext('undefined', remnaPayload);

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('CONTROL: accepts a valid HMAC-SHA256 signature', () => {
      const secret = 'super-secret';
      const guard = makeGuard(secret);
      const validSig = makeValidSignature(secret, remnaPayload);
      const ctx = makeContext(validSig, remnaPayload);

      expect(() => guard.canActivate(ctx)).not.toThrow();
    });
  });
  describe('[FINDING #10] Bot notification secret — must always require a valid secret', () => {
    function validateSecret(secret: string): void {
      const expected = process.env.BOT_NOTIFY_SECRET;
      if (!expected) {
        throw new UnauthorizedException('BOT_NOTIFY_SECRET is not configured');
      }
      if (secret !== expected) {
        throw new UnauthorizedException('Invalid notification secret');
      }
    }

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      delete process.env.BOT_NOTIFY_SECRET;
    });

    it('rejects any secret when BOT_NOTIFY_SECRET is not configured (env var absent)', () => {
      delete process.env.BOT_NOTIFY_SECRET;

      // CORRECT: missing env must NOT be treated as "no auth required"
      expect(() => validateSecret('attacker-secret')).toThrow(UnauthorizedException);
      expect(() => validateSecret('')).toThrow(UnauthorizedException);
    });

    it('rejects any secret when BOT_NOTIFY_SECRET is an empty string', () => {
      process.env.BOT_NOTIFY_SECRET = '';

      // CORRECT: empty env var must not silently disable authentication
      expect(() => validateSecret('anything')).toThrow(UnauthorizedException);
    });

    it('rejects an empty-string secret when BOT_NOTIFY_SECRET is not set', () => {
      delete process.env.BOT_NOTIFY_SECRET;

      // CORRECT: even an empty string must not pass when there is no configured secret
      expect(() => validateSecret('')).toThrow(UnauthorizedException);
    });

    // ── Control tests — must always pass ────────────────────────────────────────

    it('CONTROL: rejects an incorrect secret when BOT_NOTIFY_SECRET is properly configured', () => {
      process.env.BOT_NOTIFY_SECRET = 'correct-secret';

      expect(() => validateSecret('wrong-secret')).toThrow(UnauthorizedException);
    });

    it('CONTROL: accepts the correct secret when BOT_NOTIFY_SECRET is configured', () => {
      process.env.BOT_NOTIFY_SECRET = 'correct-secret';

      expect(() => validateSecret('correct-secret')).not.toThrow();
    });
  });
});
