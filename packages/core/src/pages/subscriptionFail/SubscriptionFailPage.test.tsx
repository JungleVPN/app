/**
 * SubscriptionFailPage — where a payment that did not go through lands. It
 * reports how the checkout this tab started ended (checkout_result: failed),
 * and nothing for a direct visit or a reload. The backend still reports
 * payment_failed from the provider's webhook.
 */
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubscriptionFailPage from './SubscriptionFailPage';

const { phCapture, takePendingCheckout } = vi.hoisted(() => ({
  phCapture: vi.fn(),
  takePendingCheckout: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@heroui/react', () => ({
  Button: ({ children }: { children: ReactNode }) => <button type='button'>{children}</button>,
}));
vi.mock('../../env', () => ({ coreEnv: {}, getTelegramStickerUrl: () => null }));
vi.mock('../../hooks', () => ({ useNavigation: () => vi.fn() }));
vi.mock('../../ui', () => ({
  TgsSticker: () => null,
  Heading: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
  Paragraph: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));
vi.mock('../../utils', async () => {
  const { checkoutEventProperties } = await import('../../utils/checkoutAnalytics');
  return { PRICING_PATH: '/pricing', phCapture, takePendingCheckout, checkoutEventProperties };
});

describe('SubscriptionFailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports the checkout this tab started as failed', () => {
    takePendingCheckout.mockReturnValue({ paymentProvider: 'yookassa', days: 30 });

    render(<SubscriptionFailPage />);

    expect(phCapture).toHaveBeenCalledWith('checkout_result', {
      payment_provider: 'yookassa',
      days: 30,
      status: 'failed',
    });
  });

  it('reports nothing for a visit no checkout led to, such as a reload', () => {
    takePendingCheckout.mockReturnValue(null);

    render(<SubscriptionFailPage />);

    expect(phCapture).not.toHaveBeenCalled();
  });
});
