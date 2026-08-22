import 'reflect-metadata';
import { AutopaymentController } from '@payments/providers/yookassa/autopayment/autopayment.controller';
import { AutopaymentService } from '@payments/providers/yookassa/autopayment/autopayment.service';
import type { RemnawebhookPayload } from '@workspace/types';
import { REMNAWAVE_EVENTS } from '@workspace/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const EXPIRATION = REMNAWAVE_EVENTS.USER.EXPIRATION;

describe('AutopaymentController', () => {
  let controller: AutopaymentController;
  let mockInit: ReturnType<typeof vi.fn>;
  let mockCheckAndNotifyExpiry48h: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInit = vi.fn().mockResolvedValue(undefined);
    mockCheckAndNotifyExpiry48h = vi.fn().mockResolvedValue(undefined);

    const autopaymentService = {
      init: mockInit,
      checkAndNotifyExpiry48h: mockCheckAndNotifyExpiry48h,
    } as unknown as AutopaymentService;

    controller = new AutopaymentController(autopaymentService);
  });

  const makePayload = (event: string, expirationHours: number | null = null) =>
    ({
      scope: 'user',
      event,
      data: { uuid: 'u-1', username: 'test', status: 'ACTIVE', telegramId: 42 },
      timestamp: new Date(),
      meta: expirationHours !== null ? { expiration: expirationHours } : null,
    }) as unknown as RemnawebhookPayload;

  it('returns { ok: true } for user.expiration -24h', async () => {
    const result = await controller.handleRemnaEvent(makePayload(EXPIRATION, -24));
    expect(result).toEqual({ ok: true });
  });

  it('delegates user.expiration -24h to autopayment service (fire-and-forget)', async () => {
    const payload = makePayload(EXPIRATION, -24);
    await controller.handleRemnaEvent(payload);

    expect(mockInit).toHaveBeenCalledWith(payload);
    expect(mockCheckAndNotifyExpiry48h).not.toHaveBeenCalled();
  });

  it('delegates user.expiration -48h to 48h check service', async () => {
    const payload = makePayload(EXPIRATION, -48);
    await controller.handleRemnaEvent(payload);

    expect(mockCheckAndNotifyExpiry48h).toHaveBeenCalledWith(payload);
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('returns { ok: true } for unknown events without calling service', async () => {
    const result = await controller.handleRemnaEvent(makePayload('user.created'));

    expect(result).toEqual({ ok: true });
    expect(mockInit).not.toHaveBeenCalled();
    expect(mockCheckAndNotifyExpiry48h).not.toHaveBeenCalled();
  });

  it('does not throw when the async handler rejects', async () => {
    mockInit.mockRejectedValue(new Error('boom'));

    // Fire-and-forget — the controller catches the rejection internally
    const result = await controller.handleRemnaEvent(makePayload(EXPIRATION, -24));
    expect(result).toEqual({ ok: true });
  });
});
