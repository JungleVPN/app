/**
 * WhopPaymentTabs — the payment methods to choose from. The card inputs are
 * Whop's hosted frames, which are slow to load and are lost when unmounted,
 * so they load as soon as the tabs appear and survive switching tabs.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Wallet } from '../../whopCheckout/utils/whopWallets';
import { type PaymentMethod, WhopPaymentTabs } from './WhopPaymentTabs';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../assets/icons/apple-pay-short-icon.svg?react', () => ({ default: () => null }));
vi.mock('../../../assets/icons/google-pay-short-icon.svg?react', () => ({ default: () => null }));

function CardInputs({ onMount }: { onMount: () => void }) {
  useEffect(onMount, [onMount]);
  return <p>card-inputs</p>;
}

const renderTabs = ({
  wallets = ['apple_pay'],
  selected = 'apple_pay',
}: {
  wallets?: Wallet[];
  selected?: PaymentMethod;
} = {}) => {
  const onMount = vi.fn();
  const onSelect = vi.fn();
  const tabs = (method: PaymentMethod) => (
    <WhopPaymentTabs
      wallets={wallets}
      selected={method}
      onSelect={onSelect}
      cardPanel={<CardInputs onMount={onMount} />}
    />
  );
  const { rerender } = render(tabs(selected));
  return { onMount, onSelect, select: (method: PaymentMethod) => rerender(tabs(method)) };
};

const isCardInert = () => screen.getByText('card-inputs').closest('[inert]') !== null;

describe('WhopPaymentTabs', () => {
  it('loads the card inputs while a wallet is selected', () => {
    renderTabs({ selected: 'apple_pay' });

    expect(screen.getByText('card-inputs')).toBeTruthy();
  });

  it('keeps the card inputs out of reach while a wallet is selected', () => {
    renderTabs({ selected: 'apple_pay' });

    expect(isCardInert()).toBe(true);
  });

  it('makes the card inputs usable once the card is selected', () => {
    renderTabs({ selected: 'card' });

    expect(isCardInert()).toBe(false);
  });

  it('keeps the same card inputs across switching tabs', () => {
    const { onMount, select } = renderTabs({ selected: 'apple_pay' });

    select('card');
    select('apple_pay');
    select('card');

    expect(onMount).toHaveBeenCalledTimes(1);
  });

  it('reports the method the payer picks', () => {
    const { onSelect } = renderTabs({ wallets: ['google_pay'], selected: 'google_pay' });

    fireEvent.click(screen.getByRole('tab', { name: 'getSubscription.card_tab' }));

    expect(onSelect).toHaveBeenCalledWith('card');
  });

  it('shows no tab list when the card is the only method', () => {
    renderTabs({ wallets: [], selected: 'card' });

    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText('card-inputs')).toBeTruthy();
  });
});
