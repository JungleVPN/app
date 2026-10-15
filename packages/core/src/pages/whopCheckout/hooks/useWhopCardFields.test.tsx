/**
 * useWhopCardFields — the card form: Whop's hosted card fields plus the
 * billing details Whop needs (name, country, postal code). The card can be
 * paid only once all of them are filled and no other payment is under way,
 * and paying tokenises the card with those details under the checkout email.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import type { IpStatusDto } from '@workspace/types';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CardTokenError } from '../utils/whopPayErrors';
import type { WhopCheckoutState } from '../whopCheckoutState';
import { useWhopCardFields } from './useWhopCardFields';
import type { PayVia, Tokenise, WhopPay } from './useWhopPay';

const { payments, ipStatus } = vi.hoisted(() => ({
  payments: { createConfirmationToken: vi.fn() },
  ipStatus: { current: null as IpStatusDto | null },
}));

vi.mock('@whop/elements-react', () => ({
  CardFields: ({
    children,
    onChange,
  }: {
    children: ReactNode;
    onChange: (state: { complete: boolean }) => void;
  }) => (
    <>
      <button type='button' onClick={() => onChange({ complete: true })}>
        complete-card
      </button>
      {children}
    </>
  ),
  CardNumberElement: () => null,
  CardExpiryElement: () => null,
  CardCvcElement: () => null,
  usePayments: () => payments,
  useWhop: () => ({}),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../api', () => ({ useRemnawaveApi: () => ({}) }));
vi.mock('../../../hooks', () => ({ useIpStatus: () => ipStatus.current }));
vi.mock('../../../core/i18n', () => ({ i18n: { language: 'en' } }));

afterEach(() => {
  ipStatus.current = null;
});

const checkout: WhopCheckoutState = {
  accountId: 'biz_1',
  whopPlanId: 'plan_1',
  request: { email: 'payer@test.com', planId: 'whop-30' },
  selectedPeriod: 30,
};

function CardForm({ payment }: { payment: WhopPay }) {
  const { inputs, canPay, submit } = useWhopCardFields({ checkout, payment });
  return (
    <>
      {inputs}
      <p data-testid='can-pay'>{String(canPay)}</p>
      <button type='button' onClick={submit}>
        pay
      </button>
    </>
  );
}

const renderCardForm = ({ pendingVia = null }: { pendingVia?: PayVia | null } = {}) => {
  const pay = vi.fn();
  render(<CardForm payment={{ pay, pendingVia, isCharging: false, failure: null }} />);
  return { pay };
};

const fillCard = ({ name = ' Jane Payer ', postalCode = ' 10001 ' } = {}) => {
  fireEvent.click(screen.getByRole('button', { name: 'complete-card' }));
  fireEvent.change(screen.getByLabelText('whopCheckout.name'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('whopCheckout.postal_code'), {
    target: { value: postalCode },
  });
};

const canPay = () => screen.getByTestId('can-pay').textContent;

const submittedTokenise = (pay: ReturnType<typeof vi.fn>): Tokenise => {
  fireEvent.click(screen.getByRole('button', { name: 'pay' }));
  expect(pay).toHaveBeenCalledWith({ method: 'card', tokenise: expect.any(Function) });
  return pay.mock.calls[0]?.[0].tokenise;
};

describe('useWhopCardFields', () => {
  it('cannot pay until the card and every billing detail is filled', () => {
    renderCardForm();
    expect(canPay()).toBe('false');

    fillCard();

    expect(canPay()).toBe('true');
  });

  it.each([
    ['name', { name: '   ' }],
    ['postal code', { postalCode: '   ' }],
  ])('cannot pay with a blank %s', (_, details) => {
    renderCardForm();

    fillCard(details);

    expect(canPay()).toBe('false');
  });

  it('cannot pay while another payment is under way', () => {
    renderCardForm({ pendingVia: 'wallet' });

    fillCard();

    expect(canPay()).toBe('false');
  });

  it('does not pay when the form is incomplete', () => {
    const { pay } = renderCardForm();

    fireEvent.click(screen.getByRole('button', { name: 'pay' }));

    expect(pay).not.toHaveBeenCalled();
  });

  it('tokenises the card with the trimmed billing details and the checkout email', async () => {
    payments.createConfirmationToken.mockResolvedValue({ confirmationToken: 'ctok_1' });
    const { pay } = renderCardForm();
    fillCard();

    const token = await submittedTokenise(pay)();

    expect(token).toBe('ctok_1');
    expect(payments.createConfirmationToken).toHaveBeenCalledWith({
      billingDetails: {
        email: 'payer@test.com',
        name: 'Jane Payer',
        address: { country: 'US', postal_code: '10001' },
      },
    });
  });

  it('reports a card Whop cannot tokenise as a card error', async () => {
    payments.createConfirmationToken.mockRejectedValue(new Error('invalid number'));
    const { pay } = renderCardForm();
    fillCard();

    await expect(submittedTokenise(pay)()).rejects.toBeInstanceOf(CardTokenError);
  });

  it('bills to the country the payer’s address is in', async () => {
    ipStatus.current = { protected: false, countryCode: 'DE' } as IpStatusDto;
    payments.createConfirmationToken.mockResolvedValue({ confirmationToken: 'ctok_1' });
    const { pay } = renderCardForm();
    fillCard();

    await submittedTokenise(pay)();

    expect(payments.createConfirmationToken).toHaveBeenCalledWith({
      billingDetails: expect.objectContaining({
        address: expect.objectContaining({ country: 'DE' }),
      }),
    });
  });

  it('bills to the country the browser autofills', async () => {
    payments.createConfirmationToken.mockResolvedValue({ confirmationToken: 'ctok_1' });
    const { pay } = renderCardForm();
    fillCard();
    const autofill = document.querySelector('select[name="country"]');
    if (!autofill) throw new Error('no autofill select');

    fireEvent.change(autofill, { target: { value: 'FR' } });
    await submittedTokenise(pay)();

    expect(payments.createConfirmationToken).toHaveBeenCalledWith({
      billingDetails: expect.objectContaining({
        address: expect.objectContaining({ country: 'FR' }),
      }),
    });
  });

  it('cannot pay when no country is chosen', () => {
    renderCardForm();
    fillCard();
    const autofill = document.querySelector('select[name="country"]');
    if (!autofill) throw new Error('no autofill select');

    fireEvent.change(autofill, { target: { value: '' } });

    expect(canPay()).toBe('false');
  });
});
