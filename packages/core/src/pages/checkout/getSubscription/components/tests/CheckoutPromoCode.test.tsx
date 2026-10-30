/**
 * The checkout email step's promo code block — the storefront's featured promo,
 * fetched when the step loads, with its conditions and a way to copy the code.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PublicPromoDto, PublicPromosResponse } from '@workspace/types';
import { describe, expect, it, vi } from 'vitest';
import { type PaymentsApi, PaymentsApiProvider } from '../../../../../runtime';
import { CheckoutPromoCode } from '../CheckoutPromoCode';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options
        ? `${key}(${Object.entries(options)
            .map(([name, value]) => `${name}=${String(value)}`)
            .join(',')})`
        : key,
    i18n: { language: 'en' },
  }),
}));

const promo = (overrides: Partial<PublicPromoDto> = {}): PublicPromoDto => ({
  code: 'SPRING20',
  effect: { type: 'bonus_months', days: 7 },
  eligibility: 'all',
  endsAt: null,
  perUserLimit: 1,
  ...overrides,
});

function renderPromo(response: Promise<PublicPromosResponse>) {
  const getPromos = vi.fn().mockReturnValue(response);
  const api = { getPromos } as unknown as PaymentsApi;
  render(
    <PaymentsApiProvider api={api}>
      <CheckoutPromoCode />
    </PaymentsApiProvider>,
  );
  return { getPromos };
}

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  return writeText;
}

describe('CheckoutPromoCode', () => {
  it('asks for the featured promos when the step loads', async () => {
    const { getPromos } = renderPromo(Promise.resolve({ promos: [promo()] }));

    expect(await screen.findByText('SPRING20')).toBeTruthy();
    expect(getPromos).toHaveBeenCalledTimes(1);
    expect(getPromos).toHaveBeenCalledWith({ featured: true });
  });

  it('shows the newest featured promo when there are several', async () => {
    renderPromo(Promise.resolve({ promos: [promo({ code: 'NEWER' }), promo({ code: 'OLDER' })] }));

    expect(await screen.findByText('NEWER')).toBeTruthy();
    expect(screen.queryByText('OLDER')).toBeNull();
  });

  it('shows what the promo gives in its conditions badge', async () => {
    renderPromo(Promise.resolve({ promos: [promo()] }));

    const badge = await screen.findByTestId('promo-conditions');
    expect(badge.textContent).toContain('getSubscription.promo.bonus_days(count=7)');
  });

  it('adds who may use it and until when to the badge', async () => {
    renderPromo(
      Promise.resolve({
        promos: [promo({ eligibility: 'new', endsAt: '2026-11-30T12:00:00.000Z' })],
      }),
    );

    const badge = await screen.findByTestId('promo-conditions');
    expect(badge.textContent).toContain('getSubscription.promo.new_users');
    expect(badge.textContent).toContain('getSubscription.promo.until(date=Nov 30)');
  });

  it('leaves out conditions an open-ended promo for everyone does not have', async () => {
    renderPromo(Promise.resolve({ promos: [promo({ eligibility: 'all', endsAt: null })] }));

    const badge = await screen.findByTestId('promo-conditions');
    expect(badge.textContent).not.toContain('getSubscription.promo.new_users');
    expect(badge.textContent).not.toContain('getSubscription.promo.until');
  });

  it('copies the code to the clipboard and confirms it', async () => {
    const writeText = stubClipboard();
    renderPromo(Promise.resolve({ promos: [promo()] }));

    fireEvent.click(await screen.findByRole('button', { name: 'getSubscription.promo.copy' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('SPRING20'));
    expect(
      await screen.findByRole('button', { name: 'getSubscription.promo.copied' }),
    ).toBeTruthy();
  });

  it('shows nothing when the storefront has no featured promo', async () => {
    const response = Promise.resolve({ promos: [] });
    const { getPromos } = renderPromo(response);

    await waitFor(() => expect(getPromos).toHaveBeenCalled());
    await response;
    expect(screen.queryByRole('button', { name: 'getSubscription.promo.copy' })).toBeNull();
  });

  it('shows nothing when the promos cannot be loaded', async () => {
    const response = Promise.reject(new Error('network down'));
    response.catch(() => {});
    const { getPromos } = renderPromo(response);

    await waitFor(() => expect(getPromos).toHaveBeenCalled());
    await expect(response).rejects.toThrow();
    expect(screen.queryByRole('button', { name: 'getSubscription.promo.copy' })).toBeNull();
  });
});
