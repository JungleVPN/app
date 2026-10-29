/**
 * StickyFooterReveal — the footer only pins to the bottom of the viewport
 * once its slot scrolls into view. A sticky element that sits on the bottom
 * edge for the whole page makes iOS 26 Safari paint its toolbar in the
 * footer's solid colour instead of fading over the page.
 */
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StickyFooterReveal } from '../StickyFooterReveal';

const callbacks: IntersectionObserverCallback[] = [];

class FakeIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    callbacks.push(callback);
  }
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);
}

const scrollSlot = ({ isIntersecting }: { isIntersecting: boolean }) =>
  act(() => {
    callbacks.forEach((callback) =>
      callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver),
    );
  });

const footer = () => screen.getByText('footer links').parentElement;

describe('StickyFooterReveal', () => {
  beforeEach(() => {
    callbacks.length = 0;
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not pin the footer while its slot is out of view', () => {
    render(
      <StickyFooterReveal>
        <p>footer links</p>
      </StickyFooterReveal>,
    );

    expect(footer()?.classList.contains('sticky')).toBe(false);
  });

  it('pins the footer once its slot scrolls into view', () => {
    render(
      <StickyFooterReveal>
        <p>footer links</p>
      </StickyFooterReveal>,
    );

    scrollSlot({ isIntersecting: true });

    expect(footer()?.classList.contains('sticky')).toBe(true);
  });

  it('unpins the footer when its slot scrolls back out of view', () => {
    render(
      <StickyFooterReveal>
        <p>footer links</p>
      </StickyFooterReveal>,
    );

    scrollSlot({ isIntersecting: true });
    scrollSlot({ isIntersecting: false });

    expect(footer()?.classList.contains('sticky')).toBe(false);
  });
});
