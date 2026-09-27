/**
 * WhopSubscriptionCard — Whop's stand-in for the Stripe/Paddle "Manage"
 * button. Whop has no customer portal, so cancelling happens here: behind a
 * confirmation, at period end, with the end date shown once it is done.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ar from '../../../../core/i18n/locales/ar.json';
import en from '../../../../core/i18n/locales/en.json';
import es from '../../../../core/i18n/locales/es.json';
import hi from '../../../../core/i18n/locales/hi.json';
import id from '../../../../core/i18n/locales/id.json';
import pt from '../../../../core/i18n/locales/pt.json';
import ru from '../../../../core/i18n/locales/ru.json';
import tr from '../../../../core/i18n/locales/tr.json';
import { WhopSubscriptionCard } from './WhopSubscriptionCard';

const { paymentsApi } = vi.hoisted(() => ({ paymentsApi: { cancelWhopSubscription: vi.fn() } }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
    i18n: { language: 'en' },
  }),
}));
vi.mock('../../../../runtime', () => ({ usePaymentsApi: () => paymentsApi }));
vi.mock('../../../../ui/Paragraph', () => ({
  Paragraph: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

const openAndConfirm = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'payment.whopCancel.button' }));
  fireEvent.click(await screen.findByRole('button', { name: 'payment.whopCancel.confirm' }));
};

describe('WhopSubscriptionCard', () => {
  beforeEach(() => {
    paymentsApi.cancelWhopSubscription.mockResolvedValue({
      cancelAtPeriodEnd: true,
      accessUntil: '2026-10-26T10:00:00Z',
    });
  });

  it('cancels only after the user confirms', async () => {
    render(<WhopSubscriptionCard />);

    fireEvent.click(screen.getByRole('button', { name: 'payment.whopCancel.button' }));
    await screen.findByRole('button', { name: 'payment.whopCancel.confirm' });
    expect(paymentsApi.cancelWhopSubscription).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'payment.whopCancel.confirm' }));

    await waitFor(() => expect(paymentsApi.cancelWhopSubscription).toHaveBeenCalledTimes(1));
  });

  it('keeps the subscription when the user backs out', async () => {
    render(<WhopSubscriptionCard />);

    fireEvent.click(screen.getByRole('button', { name: 'payment.whopCancel.button' }));
    fireEvent.click(await screen.findByRole('button', { name: 'payment.whopCancel.keep' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'payment.whopCancel.confirm' })).toBeNull(),
    );
    expect(paymentsApi.cancelWhopSubscription).not.toHaveBeenCalled();
  });

  it('says when access ends, in place of the cancel button', async () => {
    render(<WhopSubscriptionCard />);

    await openAndConfirm();

    expect(await screen.findByText(/payment\.whopCancel\.endsOn/)).toBeTruthy();
    expect(screen.getByText(/October 26, 2026/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'payment.whopCancel.button' })).toBeNull();
  });

  it('confirms the cancellation even when Whop reports no end date', async () => {
    paymentsApi.cancelWhopSubscription.mockResolvedValue({
      cancelAtPeriodEnd: true,
      accessUntil: null,
    });
    render(<WhopSubscriptionCard />);

    await openAndConfirm();

    expect(await screen.findByText('payment.whopCancel.canceled')).toBeTruthy();
  });

  it('says so and leaves the button when cancelling fails', async () => {
    paymentsApi.cancelWhopSubscription.mockRejectedValue(new Error('whop down'));
    render(<WhopSubscriptionCard />);

    await openAndConfirm();

    expect(await screen.findByText('payment.whopCancel.error')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'payment.whopCancel.button' })).toBeTruthy();
  });

  it.each(
    Object.entries({ ar, en, es, hi, id, pt, ru, tr }),
  )('has every piece of cancel copy in %s', (_language, locale) => {
    const copy = (locale as { payment: { whopCancel?: Record<string, string> } }).payment
      .whopCancel;

    expect(Object.keys(copy ?? {}).sort()).toEqual(Object.keys(en.payment.whopCancel).sort());
    for (const text of Object.values(copy ?? {})) expect(text.trim()).not.toBe('');
  });
});
