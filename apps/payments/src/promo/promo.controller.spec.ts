import type { PublicPromoDto } from '@workspace/types';
import { describe, expect, it, vi } from 'vitest';
import { PromoController } from './promo.controller';
import type { PromoService } from './promo.service';

const GLOBAL_ORIGIN = 'https://jungle-vpn.com';
const RU_ORIGIN = 'https://ru-web.jungle-vpn.com';

const PROMO: PublicPromoDto = {
  code: 'SPRING20',
  effect: { type: 'bonus_months', days: 7 },
  eligibility: 'new',
  duration: 'forever',
  durationMonths: null,
  endsAt: null,
  perUserLimit: 1,
  planPeriods: null,
};

function setup(promos: PublicPromoDto[]) {
  const promoService = { listAvailable: vi.fn().mockResolvedValue(promos) };
  return {
    controller: new PromoController(promoService as unknown as PromoService),
    promoService,
  };
}

describe('PromoController.list', () => {
  it('lists the promos of the storefront the request comes from', async () => {
    const { controller, promoService } = setup([PROMO]);

    await expect(controller.list(undefined, GLOBAL_ORIGIN)).resolves.toEqual({ promos: [PROMO] });
    expect(promoService.listAvailable).toHaveBeenCalledWith({ scope: 'global' });

    await controller.list(undefined, RU_ORIGIN);
    expect(promoService.listAvailable).toHaveBeenLastCalledWith({ scope: 'ru' });
  });

  it('passes the featured query param through as a boolean', async () => {
    const { controller, promoService } = setup([]);

    await controller.list('true', GLOBAL_ORIGIN);
    expect(promoService.listAvailable).toHaveBeenLastCalledWith({
      scope: 'global',
      featured: true,
    });

    await controller.list('false', GLOBAL_ORIGIN);
    expect(promoService.listAvailable).toHaveBeenLastCalledWith({
      scope: 'global',
      featured: false,
    });
  });

  it('ignores a featured value that is not a boolean', async () => {
    const { controller, promoService } = setup([]);

    await controller.list('yes', GLOBAL_ORIGIN);
    expect(promoService.listAvailable).toHaveBeenLastCalledWith({ scope: 'global' });

    await controller.list('toString', GLOBAL_ORIGIN);
    expect(promoService.listAvailable.mock.lastCall).toStrictEqual([{ scope: 'global' }]);
  });

  it('answers with an empty list when the storefront has no promos', async () => {
    const { controller } = setup([]);
    await expect(controller.list(undefined, GLOBAL_ORIGIN)).resolves.toEqual({ promos: [] });
  });
});
