import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentProcessPage from './PaymentProcessPage';

const { navigate, isGlobalOrigin, plansStatus, stub } = vi.hoisted(() => ({
  navigate: vi.fn(),
  isGlobalOrigin: vi.fn(),
  plansStatus: vi.fn(),
  stub: () => null,
}));

vi.mock('@heroui/react', () => ({
  Button: stub,
  Chip: stub,
  Description: stub,
  FieldError: stub,
  Form: stub,
  Input: stub,
  TextField: stub,
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
  usePaymentsApi: () => ({ createPublicStripeSession: vi.fn() }),
  useAppRoutes: () => ({ profileSubscriptionPath: '/profile/subscription' }),
}));
vi.mock('../../stores', () => ({
  usePlanByMonths: () => undefined,
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
  validateEmail: vi.fn(),
}));
vi.mock('../profile/payment/components/TermsDialog', () => ({ TermsDialog: stub }));
vi.mock('./PaymentFooter', () => ({ PaymentFooter: stub }));
vi.mock('react-router', () => ({ useParams: () => ({ planSlug: 'plan1' }) }));

describe('PaymentProcessPage', () => {
  beforeEach(() => {
    isGlobalOrigin.mockReturnValue(true);
    plansStatus.mockReturnValue('loading');
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
});
