/**
 * WhopSubscriptionCard — Whop's stand-in for the Stripe/Paddle "Manage"
 * button. Whop has no customer portal, so cancelling happens here: behind a
 * confirmation, at period end, with the end date shown once it is done —
 * and again on every reload, from the status the backend now keeps.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SavedMethodDto } from '@workspace/types';
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

const { paymentsApi } = vi.hoisted(() => ({
  paymentsApi: { cancelWhopSubscription: vi.fn(), resumeWhopSubscription: vi.fn() },
}));

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

const whopMethod = (overrides: Partial<SavedMethodDto> = {}): SavedMethodDto => ({
  id: 'row-1',
  userId: 1000,
  provider: 'whop',
  paymentMethodId: 'mem_1',
  paymentMethodType: 'whop',
  title: 'Visa •••• 1303',
  card: { last4: '1303', cardType: 'visa' },
  isActive: true,
  productName: 'Jungle VPN',
  amount: 0.4,
  currency: 'EUR',
  billingPeriod: 30,
  renewsAt: '2026-10-27T10:00:00.000Z',
  status: 'active',
  createdAt: '2026-09-27T10:00:00.000Z',
  updatedAt: '2026-09-27T10:00:00.000Z',
  ...overrides,
});

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
    paymentsApi.resumeWhopSubscription.mockResolvedValue({ cancelAtPeriodEnd: false });
  });

  it('shows the product, price, renewal date and card the subscription is on', () => {
    render(<WhopSubscriptionCard method={whopMethod()} />);

    expect(screen.getByText('Jungle VPN')).toBeTruthy();
    expect(screen.getByText(/€0\.40/)).toBeTruthy();
    expect(screen.getByText(/payment\.whopSubscription\.renewsOn.*October 27, 2026/)).toBeTruthy();
    expect(screen.getByText('•••• 1303')).toBeTruthy();
  });

  it("falls back to Whop's own name for a payment method that is not a card", () => {
    render(<WhopSubscriptionCard method={whopMethod({ card: null, title: 'Klarna' })} />);

    expect(screen.getByText('Klarna')).toBeTruthy();
  });

  it('leaves out what has not been recorded yet, keeping the cancel button', () => {
    render(
      <WhopSubscriptionCard
        method={whopMethod({
          productName: null,
          amount: null,
          currency: null,
          billingPeriod: null,
          renewsAt: null,
          title: null,
          card: null,
        })}
      />,
    );

    expect(screen.queryByText('payment.whopSubscription.product')).toBeNull();
    expect(screen.queryByText('payment.whopSubscription.price')).toBeNull();
    expect(screen.queryByText('payment.whopSubscription.status')).toBeNull();
    expect(screen.queryByText('payment.whopSubscription.paymentMethod')).toBeNull();
    expect(screen.getByRole('button', { name: 'payment.whopCancel.button' })).toBeTruthy();
  });

  it('stops promising a renewal once the subscription is canceled', async () => {
    render(<WhopSubscriptionCard method={whopMethod()} />);

    await openAndConfirm();

    expect(await screen.findByText(/payment\.whopCancel\.endsOn/)).toBeTruthy();
    expect(screen.queryByText(/payment\.whopSubscription\.renewsOn/)).toBeNull();
    expect(screen.getByText('Jungle VPN')).toBeTruthy();
  });

  it('shows a subscription canceled earlier as canceled after a reload, until its period ends', () => {
    render(<WhopSubscriptionCard method={whopMethod({ status: 'canceled' })} />);

    expect(screen.getByText(/payment\.whopCancel\.endsOn.*October 27, 2026/)).toBeTruthy();
    expect(screen.queryByText(/payment\.whopSubscription\.renewsOn/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'payment.whopCancel.button' })).toBeNull();
    expect(screen.getByText('Jungle VPN')).toBeTruthy();
  });

  it('offers to resume a canceled subscription, right below its details', () => {
    render(<WhopSubscriptionCard method={whopMethod({ status: 'canceled' })} />);

    const resume = screen.getByRole('button', { name: 'payment.whopResume.button' });
    const details = screen.getByText('Jungle VPN').closest('dl');
    expect(details?.compareDocumentPosition(resume)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renews again once resumed, offering to cancel instead', async () => {
    render(<WhopSubscriptionCard method={whopMethod({ status: 'canceled' })} />);

    fireEvent.click(screen.getByRole('button', { name: 'payment.whopResume.button' }));

    expect(await screen.findByRole('button', { name: 'payment.whopCancel.button' })).toBeTruthy();
    expect(paymentsApi.resumeWhopSubscription).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/payment\.whopSubscription\.renewsOn.*October 27, 2026/)).toBeTruthy();
    expect(screen.queryByText(/payment\.whopCancel\.endsOn/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'payment.whopResume.button' })).toBeNull();
  });

  it('offers to resume right after cancelling, too', async () => {
    render(<WhopSubscriptionCard method={whopMethod()} />);

    await openAndConfirm();

    expect(await screen.findByRole('button', { name: 'payment.whopResume.button' })).toBeTruthy();
  });

  it('says so and stays canceled when resuming fails', async () => {
    paymentsApi.resumeWhopSubscription.mockRejectedValue(new Error('whop down'));
    render(<WhopSubscriptionCard method={whopMethod({ status: 'canceled' })} />);

    fireEvent.click(screen.getByRole('button', { name: 'payment.whopResume.button' }));

    expect(await screen.findByText('payment.whopResume.error')).toBeTruthy();
    expect(screen.getByText(/payment\.whopCancel\.endsOn/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'payment.whopResume.button' })).toBeTruthy();
  });

  it('offers to cancel a subscription saved before statuses were tracked', () => {
    render(<WhopSubscriptionCard method={whopMethod({ status: null })} />);

    expect(screen.getByRole('button', { name: 'payment.whopCancel.button' })).toBeTruthy();
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

  it.each(
    Object.entries({ ar, en, es, hi, id, pt, ru, tr }),
  )('has every piece of resume copy in %s', (_language, locale) => {
    const copy = (locale as { payment: { whopResume?: Record<string, string> } }).payment
      .whopResume;

    expect(Object.keys(copy ?? {}).sort()).toEqual(['button', 'error']);
    for (const text of Object.values(copy ?? {})) expect(text.trim()).not.toBe('');
  });

  it.each(
    Object.entries({ ar, en, es, hi, id, pt, ru, tr }),
  )('has every piece of subscription detail copy in %s', (_language, locale) => {
    const copy = (locale as { payment: { whopSubscription?: Record<string, string> } }).payment
      .whopSubscription;

    expect(Object.keys(copy ?? {}).sort()).toEqual(
      ['paymentMethod', 'price', 'pricePerPeriod', 'product', 'renewsOn', 'status'].sort(),
    );
    for (const text of Object.values(copy ?? {})) expect(text.trim()).not.toBe('');
  });
});
