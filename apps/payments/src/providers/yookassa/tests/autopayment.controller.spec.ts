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
      data: { id: 1000, username: 'test', status: 'ACTIVE', telegramId: 42 },
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

  it('delegates -48h even when the -24h flow would also match the event', async () => {
    const payload = makePayload(EXPIRATION, -48);
    await controller.handleRemnaEvent(payload);

    expect(mockCheckAndNotifyExpiry48h).toHaveBeenCalledTimes(1);
  });

  // The 48h path is fire-and-forget too: an email or bot outage must not turn
  // into a non-200 that makes Remnawave redeliver the event.
  it('does not throw when the 48h handler rejects', async () => {
    mockCheckAndNotifyExpiry48h.mockRejectedValue(new Error('smtp down'));

    const result = await controller.handleRemnaEvent(makePayload(EXPIRATION, -48));

    expect(result).toEqual({ ok: true });
  });

  // Only -24h and -48h are wired up; any other lead time is logged and dropped
  // rather than charging the customer at an unexpected moment.
  it.each([[-72], [-1], [24]])('ignores an expiration lead time of %i hours', async (hours) => {
    const result = await controller.handleRemnaEvent(makePayload(EXPIRATION, hours));

    expect(result).toEqual({ ok: true });
    expect(mockInit).not.toHaveBeenCalled();
    expect(mockCheckAndNotifyExpiry48h).not.toHaveBeenCalled();
  });

  it('ignores an expiration event that carries no meta at all', async () => {
    const result = await controller.handleRemnaEvent(makePayload(EXPIRATION));

    expect(result).toEqual({ ok: true });
    expect(mockInit).not.toHaveBeenCalled();
    expect(mockCheckAndNotifyExpiry48h).not.toHaveBeenCalled();
  });

  it('ignores an expiration event whose meta omits the expiration field', async () => {
    const payload = {
      ...makePayload(EXPIRATION),
      meta: {},
    } as unknown as RemnawebhookPayload;

    const result = await controller.handleRemnaEvent(payload);

    expect(result).toEqual({ ok: true });
    expect(mockInit).not.toHaveBeenCalled();
  });
});
