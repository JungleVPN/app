import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { CommonController } from './common.controller';

describe('CommonController.getPlans', () => {
  it("passes the caller's origin and IP through to the service", async () => {
    const commonService = { getPlans: vi.fn().mockResolvedValue([]) };
    const controller = new CommonController(commonService as never);

    await controller.getPlans('203.0.113.5', 'https://jungle-vpn.com');

    expect(commonService.getPlans).toHaveBeenCalledWith({
      origin: 'https://jungle-vpn.com',
      clientIp: '203.0.113.5',
    });
  });

  it('treats an empty IP and a missing origin as unknown rather than empty-string lookups', async () => {
    const commonService = { getPlans: vi.fn().mockResolvedValue([]) };
    const controller = new CommonController(commonService as never);

    await controller.getPlans('', undefined);

    expect(commonService.getPlans).toHaveBeenCalledWith({ origin: null, clientIp: null });
  });

  it('returns the plans from the service', async () => {
    const plans = [{ period: 1 }];
    const commonService = { getPlans: vi.fn().mockResolvedValue(plans) };
    const controller = new CommonController(commonService as never);

    await expect(controller.getPlans('203.0.113.5', 'https://jungle-vpn.com')).resolves.toBe(plans);
  });
});
