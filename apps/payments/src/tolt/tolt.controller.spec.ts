import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ToltController } from './tolt.controller';
import type { ToltService } from './tolt.service';

const USER = 'user-uuid-1';

function setup() {
  const service = { captureReferral: vi.fn().mockResolvedValue(undefined) };
  const controller = new ToltController(service as unknown as ToltService);
  return { controller, service };
}

const body = { referralCode: 'jimhalpert', partnerId: 'part_xyz', clickId: 'clk_1' };

describe('ToltController.captureReferral', () => {
  it('attributes the referral to the authenticated user, never a body-supplied id', async () => {
    const { controller, service } = setup();

    await controller.captureReferral(
      { ...body, userId: 'attacker-supplied' } as never,
      USER,
      'jim@example.com',
    );

    expect(service.captureReferral).toHaveBeenCalledWith(expect.objectContaining({ userId: USER }));
  });

  it('passes the referral through to the service', async () => {
    const { controller, service } = setup();

    await controller.captureReferral(body, USER, undefined);

    expect(service.captureReferral).toHaveBeenCalledWith({
      userId: USER,
      referralCode: 'jimhalpert',
      partnerId: 'part_xyz',
      clickId: 'clk_1',
      email: null,
    });
  });

  it('uses the email established by the guard', async () => {
    const { controller, service } = setup();
    await controller.captureReferral(body, USER, 'jim@example.com');
    expect(service.captureReferral).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jim@example.com' }),
    );
  });

  it('acknowledges the capture', async () => {
    const { controller } = setup();
    await expect(controller.captureReferral(body, USER, undefined)).resolves.toEqual({ ok: true });
  });

  it('treats a missing click id as absent rather than empty', async () => {
    const { controller, service } = setup();
    await controller.captureReferral({ referralCode: 'a', partnerId: 'p' }, USER, undefined);
    expect(service.captureReferral).toHaveBeenCalledWith(
      expect.objectContaining({ clickId: null }),
    );
  });

  it('trims surrounding whitespace', async () => {
    const { controller, service } = setup();
    await controller.captureReferral(
      { referralCode: '  jim  ', partnerId: ' part_xyz ' },
      USER,
      undefined,
    );
    expect(service.captureReferral).toHaveBeenCalledWith(
      expect.objectContaining({ referralCode: 'jim', partnerId: 'part_xyz' }),
    );
  });
});

describe('ToltController.captureReferral — rejected input', () => {
  const reject = async (payload: unknown) => {
    const { controller, service } = setup();
    await expect(
      controller.captureReferral(payload as never, USER, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.captureReferral).not.toHaveBeenCalled();
  };

  it('rejects a missing referral code', () => reject({ partnerId: 'part_xyz' }));
  it('rejects a missing partner id', () => reject({ referralCode: 'jim' }));
  it('rejects an empty referral code', () => reject({ referralCode: '   ', partnerId: 'p' }));
  it('rejects a non-string referral code', () => reject({ referralCode: 42, partnerId: 'p' }));
  it('rejects an absent body', () => reject(undefined));

  it('rejects an over-long value rather than forwarding it to Tolt', () =>
    reject({ referralCode: 'x'.repeat(200), partnerId: 'p' }));

  it('rejects a value carrying control characters', () =>
    reject({ referralCode: 'jim\n\rhalpert', partnerId: 'p' }));
});
