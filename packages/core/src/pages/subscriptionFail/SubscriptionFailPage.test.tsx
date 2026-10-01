/**
 * SubscriptionFailPage — where a payment that did not go through lands. The
 * backend reports the failure from the provider's webhook; this page only
 * drops the checkout this tab started, so a later visit to the success page
 * cannot report it as a purchase.
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

  it('drops the checkout this tab started without reporting it', () => {
    takePendingCheckout.mockReturnValue({ paymentProvider: 'yookassa', days: 30 });

    render(<SubscriptionFailPage />);

    expect(takePendingCheckout).toHaveBeenCalledTimes(1);
    expect(phCapture).not.toHaveBeenCalled();
  });
});
