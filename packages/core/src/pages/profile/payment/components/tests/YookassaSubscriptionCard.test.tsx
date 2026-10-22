/**
 * YookassaSubscriptionCard — the YooKassa subscription as the profile page
 * shows it, with Cancel Plan: the saved method is terminated (its row is kept),
 * a popup says the plan is cancelled and must be paid for again, and closing
 * it leads to the plans page.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SavedMethodDto } from '@workspace/types';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ar from '../../../../../i18n/locales/ar.json';
import en from '../../../../../i18n/locales/en.json';
import es from '../../../../../i18n/locales/es.json';
import hi from '../../../../../i18n/locales/hi.json';
import id from '../../../../../i18n/locales/id.json';
import pt from '../../../../../i18n/locales/pt.json';
import ru from '../../../../../i18n/locales/ru.json';
import tr from '../../../../../i18n/locales/tr.json';
import ur from '../../../../../i18n/locales/ur.json';
import { YookassaSubscriptionCard } from '../YookassaSubscriptionCard';

const { paymentsApi, navigate, setYookassaMethods } = vi.hoisted(() => ({
  paymentsApi: { deleteSavedMethod: vi.fn(), getYookassaSavedMethods: vi.fn() },
  navigate: vi.fn(),
  setYookassaMethods: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
    i18n: { language: 'en' },
  }),
}));
vi.mock('../../../../../runtime', () => ({
  usePaymentsApi: () => paymentsApi,
  useAppRoutes: () => ({ profilePlansPath: '/profile/plans' }),
}));
vi.mock('../../../../../hooks', () => ({ useNavigation: () => navigate }));
vi.mock('../../../../../stores', () => ({
  useSavedMethodsStoreActions: () => ({ setYookassaMethods }),
}));
vi.mock('../../../../../ui', () => ({
  Block: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Paragraph: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

const yookassaMethod = (overrides: Partial<SavedMethodDto> = {}): SavedMethodDto => ({
  id: 'row-1',
  userId: 1000,
  provider: 'yookassa',
  paymentMethodId: 'pm_1',
  paymentMethodType: 'bank_card',
  title: 'Visa 1234',
  card: { last4: '1234', cardType: 'Visa' },
  iconUrl: null,
  isActive: true,
  productName: 'Jungle VPN',
  amount: 199,
  currency: 'RUB',
  billingPeriod: 30,
  renewsAt: '2026-10-27T10:00:00.000Z',
  status: 'active',
  createdAt: '2026-09-27T10:00:00.000Z',
  updatedAt: '2026-09-27T10:00:00.000Z',
  ...overrides,
});

const openAndConfirm = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'payment.yookassaCancel.button' }));
  fireEvent.click(await screen.findByRole('button', { name: 'payment.yookassaCancel.confirm' }));
};

describe('YookassaSubscriptionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentsApi.deleteSavedMethod.mockResolvedValue(undefined);
    paymentsApi.getYookassaSavedMethods.mockResolvedValue([]);
  });

  it('shows the product, price, next payment date and card the subscription is on', () => {
    render(<YookassaSubscriptionCard method={yookassaMethod()} />);

    expect(screen.getByText('Jungle VPN')).toBeTruthy();
    expect(screen.getByText(/199/)).toBeTruthy();
    expect(screen.getByText('payment.whopSubscription.nextPayment')).toBeTruthy();
    expect(screen.getByText('October 27, 2026')).toBeTruthy();
    expect(screen.getByText('•••• 1234')).toBeTruthy();
    expect(screen.getByText('payment.whopSubscription.active')).toBeTruthy();
  });

  it('leaves out what has not been recorded yet, keeping the cancel button', () => {
    render(
      <YookassaSubscriptionCard
        method={yookassaMethod({
          productName: null,
          amount: null,
          currency: null,
          billingPeriod: null,
          renewsAt: null,
        })}
      />,
    );

    expect(screen.queryByText('payment.whopSubscription.product')).toBeNull();
    expect(screen.queryByText('payment.whopSubscription.price')).toBeNull();
    expect(screen.queryByText('payment.whopSubscription.nextPayment')).toBeNull();
    expect(screen.getByRole('button', { name: 'payment.yookassaCancel.button' })).toBeTruthy();
  });

  it('terminates the plan only after the user confirms', async () => {
    render(<YookassaSubscriptionCard method={yookassaMethod()} />);

    fireEvent.click(screen.getByRole('button', { name: 'payment.yookassaCancel.button' }));
    await screen.findByRole('button', { name: 'payment.yookassaCancel.confirm' });
    expect(paymentsApi.deleteSavedMethod).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'payment.yookassaCancel.confirm' }));

    await waitFor(() => expect(paymentsApi.deleteSavedMethod).toHaveBeenCalledWith('row-1'));
  });

  it('keeps the plan when the user backs out', async () => {
    render(<YookassaSubscriptionCard method={yookassaMethod()} />);

    fireEvent.click(screen.getByRole('button', { name: 'payment.yookassaCancel.button' }));
    fireEvent.click(await screen.findByRole('button', { name: 'payment.yookassaCancel.keep' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'payment.yookassaCancel.confirm' })).toBeNull(),
    );
    expect(paymentsApi.deleteSavedMethod).not.toHaveBeenCalled();
  });

  it('tells the user the plan is cancelled and must be paid again, without leaving yet', async () => {
    render(<YookassaSubscriptionCard method={yookassaMethod()} />);

    await openAndConfirm();

    expect(await screen.findByText('payment.yookassaCancel.doneTitle')).toBeTruthy();
    expect(screen.getByText('payment.yookassaCancel.doneBody')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
    expect(setYookassaMethods).not.toHaveBeenCalled();
  });

  it('goes to the plans page once the popup is acknowledged', async () => {
    paymentsApi.getYookassaSavedMethods.mockResolvedValue([]);
    render(<YookassaSubscriptionCard method={yookassaMethod()} />);

    await openAndConfirm();
    fireEvent.click(await screen.findByRole('button', { name: 'payment.yookassaCancel.done' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/profile/plans'));
    expect(setYookassaMethods).toHaveBeenCalledWith([]);
  });

  it('says so and keeps the cancel button when cancelling fails', async () => {
    paymentsApi.deleteSavedMethod.mockRejectedValue(new Error('down'));
    render(<YookassaSubscriptionCard method={yookassaMethod()} />);

    await openAndConfirm();

    expect(await screen.findByText('payment.yookassaCancel.error')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'payment.yookassaCancel.button' })).toBeTruthy();
    expect(screen.queryByText('payment.yookassaCancel.doneTitle')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each(
    Object.entries({ ar, en, es, hi, id, pt, ru, tr, ur }),
  )('has every piece of cancel copy in %s', (_language, locale) => {
    const copy = (locale as { payment: { yookassaCancel?: Record<string, string> } }).payment
      .yookassaCancel;

    expect(Object.keys(copy ?? {}).sort()).toEqual(Object.keys(en.payment.yookassaCancel).sort());
    for (const text of Object.values(copy ?? {})) expect(text.trim()).not.toBe('');
  });
});
