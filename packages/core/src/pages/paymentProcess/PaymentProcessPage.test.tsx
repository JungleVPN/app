import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../api';
import PaymentProcessPage from './PaymentProcessPage';

const {
  navigate,
  isGlobalOrigin,
  plansStatus,
  planByMonths,
  validateEmail,
  createPublicStripeSession,
  stub,
} = vi.hoisted(() => ({
  navigate: vi.fn(),
  isGlobalOrigin: vi.fn(),
  plansStatus: vi.fn(),
  planByMonths: vi.fn(),
  validateEmail: vi.fn(),
  createPublicStripeSession: vi.fn(),
  stub: () => null,
}));

vi.mock('@heroui/react', () => ({
  Button: ({ children, type }: { children?: ReactNode; type?: string }) =>
    type === 'submit' ? <button type='submit'>{children}</button> : null,
  Chip: stub,
  Description: stub,
  FieldError: stub,
  // Rendered for real: the checkout's submit path is what these tests drive.
  Form: ({ children, onSubmit }: { children?: ReactNode; onSubmit?: (e: never) => void }) => (
    <form onSubmit={onSubmit as never}>{children}</form>
  ),
  Input: ({ value, onChange }: { value?: string; onChange?: (e: never) => void }) => (
    <input value={value} onChange={onChange as never} />
  ),
  TextField: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Tooltip: stub,
}));
vi.mock('@tabler/icons-react', () => ({
  IconBrandAppleFilled: stub,
  IconBrandGoogle: stub,
  IconBrandMastercard: stub,
  IconBrandVisa: stub,
  IconChevronRight: stub,
  IconCreditCard: stub,
  IconHelpCircle: stub,
  IconMail: stub,
  IconRestore: stub,
}));
vi.mock('../../assets/Logo.svg?react', () => ({ default: stub }));
vi.mock('../../components', () => ({
  FeaturesCard: stub,
  Link: stub,
  Loading: () => <div data-testid='loading' />,
}));
vi.mock('../../hooks', () => ({ usePlans: vi.fn(), useNavigation: () => navigate }));
vi.mock('../../runtime', () => ({
  usePaymentsApi: () => ({ createPublicStripeSession }),
  useAppRoutes: () => ({
    profileSubscriptionPath: '/profile/subscription',
    profilePaymentPath: '/profile/payments',
  }),
}));
vi.mock('../../stores', () => ({
  usePlanByMonths: planByMonths,
  usePlansStatus: plansStatus,
  useTermsStore: () => ({ open: vi.fn() }),
}));
vi.mock('../../ui', () => ({
  Block: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Container: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Grid: ({ children }: { children?: ReactNode }) => <>{children}</>,
  GridItem: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('../../utils', () => ({
  formatPlanPrice: vi.fn(),
  getReferralUserId: vi.fn(),
  isGlobalOrigin,
  phCapture: vi.fn(),
  validateEmail,
}));
vi.mock('../profile/payment/components/TermsDialog', () => ({ TermsDialog: stub }));
vi.mock('./PaymentFooter', () => ({ PaymentFooter: stub }));
vi.mock('./ActiveSubscriptionDialog', () => ({
  ActiveSubscriptionDialog: ({ email, onLogin }: { email: string | null; onLogin: () => void }) =>
    email ? (
      <div data-testid='active-subscription-dialog'>
        {email}
        <button type='button' data-testid='dialog-login' onClick={onLogin}>
          log in
        </button>
      </div>
    ) : null,
}));
vi.mock('react-router', () => ({ useParams: () => ({ planSlug: 'plan1' }) }));

describe('PaymentProcessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isGlobalOrigin.mockReturnValue(true);
    plansStatus.mockReturnValue('loading');
    planByMonths.mockReturnValue(undefined);
  });
  afterEach(cleanup);

  it('sends a RU visitor who deep-links to the global checkout to their subscription', () => {
    isGlobalOrigin.mockReturnValue(false);

    render(<PaymentProcessPage />);

    expect(navigate).toHaveBeenCalledWith('/profile/subscription', { replace: true });
  });

  it('leaves a global visitor on the checkout', () => {
    render(<PaymentProcessPage />);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('never shows the EUR checkout to a RU visitor, even with the plans already loaded', () => {
    isGlobalOrigin.mockReturnValue(false);
    plansStatus.mockReturnValue('success');

    const { getByTestId } = render(<PaymentProcessPage />);

    expect(getByTestId('loading')).toBeTruthy();
  });
  describe('when the payer email already has an active subscription', () => {
    const submitCheckout = async () => {
      plansStatus.mockReturnValue('success');
      planByMonths.mockReturnValue({ eur: { total: 10, discountPercent: 0, fullTotal: null } });
      validateEmail.mockReturnValue(true);

      const view = render(<PaymentProcessPage />);
      const input = view.container.querySelector('input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'payer@test.com' } });
      fireEvent.submit(view.container.querySelector('form') as HTMLFormElement);
      return view;
    };

    beforeEach(() => {
      createPublicStripeSession.mockRejectedValue(
        new ApiClientError({
          status: 409,
          message: 'Request failed',
          data: { code: 'active_subscription' },
        }),
      );
    });

    it('offers to log in instead of reporting a failed checkout', async () => {
      const { getByTestId, queryByText } = await submitCheckout();

      await waitFor(() => expect(getByTestId('active-subscription-dialog')).toBeTruthy());
      expect(getByTestId('active-subscription-dialog').textContent).toContain('payer@test.com');
      // A known account is not a checkout failure — the generic error would tell
      // the visitor to retry a payment that can never succeed.
      expect(queryByText(/could not start the payment/i)).toBeNull();
    });

    it('sends the visitor to their payments page, which gates them through login', async () => {
      const { getByTestId } = await submitCheckout();

      await waitFor(() => expect(getByTestId('active-subscription-dialog')).toBeTruthy());
      fireEvent.click(getByTestId('dialog-login'));

      expect(navigate).toHaveBeenCalledWith('/profile/payments');
    });

    it('still reports an ordinary checkout failure as one', async () => {
      createPublicStripeSession.mockRejectedValue(
        new ApiClientError({ status: 500, message: 'boom' }),
      );

      const { queryByTestId, getByText } = await submitCheckout();

      await waitFor(() => expect(getByText(/could not start the payment/i)).toBeTruthy());
      expect(queryByTestId('active-subscription-dialog')).toBeNull();
    });
  });
});
