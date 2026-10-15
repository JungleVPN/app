/**
 * PriceCard — a plan's price and the button that buys it. Reaching for the
 * button, before it is pressed, is reported so the page can start loading
 * the checkout it leads to.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PriceCard } from './PriceCard';

const renderCard = () => {
  const onCtaClick = vi.fn();
  const onCtaIntent = vi.fn();
  render(
    <PriceCard
      period='1 month'
      price='$6'
      interval='/mo'
      guarantee='30-day guarantee'
      cta='Buy'
      onCtaClick={onCtaClick}
      onCtaIntent={onCtaIntent}
    />,
  );
  return { onCtaClick, onCtaIntent, button: screen.getByRole('button', { name: 'Buy' }) };
};

describe('PriceCard', () => {
  it.each([
    ['pointed at', (button: HTMLElement) => fireEvent.mouseEnter(button)],
    ['focused', (button: HTMLElement) => act(() => button.focus())],
    ['pressed', (button: HTMLElement) => fireEvent.mouseDown(button)],
  ])('reports intent when the button is %s', (_, reach) => {
    const { onCtaIntent, button } = renderCard();

    reach(button);

    expect(onCtaIntent).toHaveBeenCalled();
  });

  it('buys the plan when the button is clicked', () => {
    const { onCtaClick, button } = renderCard();

    fireEvent.click(button);

    expect(onCtaClick).toHaveBeenCalled();
  });
});
