/**
 * PaymentForm routes the submit to the handler of the method being paid with.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PaymentForm } from './PaymentForm';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@tma.js/sdk-react', () => ({ mainButton: { show: () => {}, hide: () => {} } }));
vi.mock('@workspace/core/components', () => ({ PromoDrawer: () => null }));
vi.mock('../../../../stores', () => ({
  useNavbarStore: () => ({ setNavbarVisible: () => {} }),
  useTermsStore: () => ({ open: () => {} }),
}));
vi.mock('../../../../ui', () => ({
  Block: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../../../../ui/Paragraph', () => ({
  Paragraph: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

const renderForm = (selectedMethod: 'whop' | 'paddle') => {
  const handlers = {
    onYookassaPayment: vi.fn().mockResolvedValue(undefined),
    onPaddlePayment: vi.fn().mockResolvedValue(undefined),
    onWhopPayment: vi.fn().mockResolvedValue(undefined),
    onStarsPayment: vi.fn().mockResolvedValue(undefined),
  };
  render(
    <PaymentForm
      selectedMethod={selectedMethod}
      needsEmailInput={false}
      buttonLabel='Pay'
      isPending={false}
      starsError={null}
      platformType={null}
      enablePromo={false}
      {...handlers}
    />,
  );
  return handlers;
};

describe('PaymentForm', () => {
  it('pays through Whop when Whop is the selected method', async () => {
    const handlers = renderForm('whop');

    fireEvent.click(screen.getByRole('button', { name: /Pay/ }));

    await waitFor(() => expect(handlers.onWhopPayment).toHaveBeenCalledWith(undefined, undefined));
    expect(handlers.onPaddlePayment).not.toHaveBeenCalled();
  });

  it('still pays through Paddle when Paddle is the selected method', async () => {
    const handlers = renderForm('paddle');

    fireEvent.click(screen.getByRole('button', { name: /Pay/ }));

    await waitFor(() => expect(handlers.onPaddlePayment).toHaveBeenCalled());
    expect(handlers.onWhopPayment).not.toHaveBeenCalled();
  });
});
