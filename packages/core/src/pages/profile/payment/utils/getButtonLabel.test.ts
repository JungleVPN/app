import type { PlanPricing } from '@workspace/types';
import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';
import en from '../../../../core/i18n/locales/en.json';
import ru from '../../../../core/i18n/locales/ru.json';
import { getButtonLabel } from './getButtonLabel';

const i18n = createInstance();
await i18n.init({ lng: 'en', resources: { en: { translation: en }, ru: { translation: ru } } });
const t = i18n.getFixedT('en');

function pricing(overrides: Partial<PlanPricing> = {}): PlanPricing {
  return {
    total: '43.20',
    monthly: '3.60',
    fullTotal: '72.00',
    discountPercent: 40,
    currencyCode: 'EUR',
    ...overrides,
  };
}

describe('getButtonLabel', () => {
  it("labels the button with the plan's total in the currency the backend quoted", () => {
    expect(getButtonLabel({ days: 365, pricing: pricing() }, t)).toBe('€43.20 · 1 year');
  });

  it('follows the quoted currency rather than the payment method', () => {
    const label = getButtonLabel(
      { days: 90, pricing: pricing({ total: '1200', currencyCode: 'RUB' }) },
      t,
    );

    expect(label).toMatch(/1[\s,]?200.* · 3 months$/);
  });

  it.each([
    [7, '7 days'],
    [30, '1 month'],
    [90, '3 months'],
    [180, '6 months'],
    [365, '1 year'],
  ])('formats a %i-day plan as %s', (days, period) => {
    expect(getButtonLabel({ days, pricing: pricing() }, t)).toBe(`€43.20 · ${period}`);
  });

  it('uses the translated duration', () => {
    expect(getButtonLabel({ days: 7, pricing: pricing() }, i18n.getFixedT('ru'))).toBe(
      '€43.20 · 7 дней',
    );
  });
});
