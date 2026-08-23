import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ToltController } from './tolt.controller';
import type { ToltService } from './tolt.service';

const USER = 4821;

/**
 * A different id, planted in the request body. It must never reach the service:
 * the controller takes the user from the validated credential, and trusting the
 * body would let anyone attribute someone else's payments to their partner code.
 */
const ATTACKER_SUPPLIED_ID = 9999;

function setup() {
  const service = {
    captureReferral: vi.fn().mockResolvedValue(undefined),
    recordClick: vi.fn().mockResolvedValue({ partnerId: 'part_xyz', clickId: 'clk_1' }),
  };
  const controller = new ToltController(service as unknown as ToltService);
  return { controller, service };
}

const body = { referralCode: 'jimhalpert', partnerId: 'part_xyz', clickId: 'clk_1' };

describe('ToltController.captureReferral', () => {
  it('attributes the referral to the authenticated user, never a body-supplied id', async () => {
    const { controller, service } = setup();

    await controller.captureReferral(
      { ...body, userId: ATTACKER_SUPPLIED_ID } as never,
      USER,
      'jim@example.com',
    );

    expect(service.captureReferral).toHaveBeenCalledWith(expect.objectContaining({ userId: USER }));
    expect(service.captureReferral).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: ATTACKER_SUPPLIED_ID }),
    );
  });

  it('passes the referral through to the service', async () => {
    const { controller, service } = setup();

    await controller.captureReferral(body, USER, 'jim@example.com');

    expect(service.captureReferral).toHaveBeenCalledWith({
      userId: USER,
      referralCode: 'jimhalpert',
      partnerId: 'part_xyz',
      clickId: 'clk_1',
      email: 'jim@example.com',
    });
  });

  it('acknowledges the capture', async () => {
    const { controller } = setup();
    await expect(controller.captureReferral(body, USER, 'jim@example.com')).resolves.toEqual({
      ok: true,
    });
  });

  it('treats a missing click id as absent rather than empty', async () => {
    const { controller, service } = setup();
    await controller.captureReferral(
      { referralCode: 'a', partnerId: 'p' },
      USER,
      'jim@example.com',
    );
    expect(service.captureReferral).toHaveBeenCalledWith(
      expect.objectContaining({ clickId: null }),
    );
  });

  it('trims surrounding whitespace', async () => {
    const { controller, service } = setup();
    await controller.captureReferral(
      { referralCode: '  jim  ', partnerId: ' part_xyz ' },
      USER,
      'jim@example.com',
    );
    expect(service.captureReferral).toHaveBeenCalledWith(
      expect.objectContaining({ referralCode: 'jim', partnerId: 'part_xyz' }),
    );
  });
});

describe('ToltController.recordClick', () => {
  it('records the click and returns the resolved partner', async () => {
    const { controller, service } = setup();

    const result = await controller.recordClick({
      affCode: 'zaira',
      page: 'https://jungle.vpn/?aff=zaira',
      referrer: 'https://t.me/channel',
    });

    expect(service.recordClick).toHaveBeenCalledWith({
      affCode: 'zaira',
      page: 'https://jungle.vpn/?aff=zaira',
      referrer: 'https://t.me/channel',
    });
    expect(result).toEqual({ partnerId: 'part_xyz', clickId: 'clk_1' });
  });

  it('accepts a bare code — page and referrer are optional', async () => {
    const { controller, service } = setup();
    await controller.recordClick({ affCode: 'zaira' });
    expect(service.recordClick).toHaveBeenCalledWith(
      expect.objectContaining({ affCode: 'zaira', page: null, referrer: null }),
    );
  });

  it('answers 404 for a code Tolt does not know, rather than erroring', async () => {
    const { controller, service } = setup();
    service.recordClick.mockResolvedValue(null);

    await expect(controller.recordClick({ affCode: 'mistyped' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a missing code', async () => {
    const { controller, service } = setup();
    await expect(controller.recordClick({} as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.recordClick).not.toHaveBeenCalled();
  });

  it('allows a full-length URL, which exceeds the identifier limit', async () => {
    const { controller, service } = setup();
    const longUrl = `https://jungle.vpn/?x=${'y'.repeat(500)}`;

    await controller.recordClick({ affCode: 'zaira', page: longUrl });

    expect(service.recordClick).toHaveBeenCalledWith(expect.objectContaining({ page: longUrl }));
  });
});

describe('ToltController.captureReferral — rejected input', () => {
  const reject = async (payload: unknown) => {
    const { controller, service } = setup();
    await expect(
      controller.captureReferral(payload as never, USER, 'jim@example.com'),
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
