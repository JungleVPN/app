/**
 * Landing scroll depth — each landing section reports to PostHog the first time
 * it scrolls into view, with its position in the page so the furthest section
 * a visitor reached (up to the footer) can be read off the events.
 */
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionReachedMarker, TrackedSection } from '../SectionTracking';

const { phCapture } = vi.hoisted(() => ({ phCapture: vi.fn() }));

vi.mock('../../../../utils', () => ({ phCapture }));

type ObserverCall = { callback: IntersectionObserverCallback; disconnected: boolean };

const observers: ObserverCall[] = [];
const disconnect = vi.fn();

class FakeIntersectionObserver {
  private readonly call: ObserverCall;
  constructor(callback: IntersectionObserverCallback) {
    this.call = { callback, disconnected: false };
    observers.push(this.call);
  }
  observe = vi.fn();
  disconnect = () => {
    this.call.disconnected = true;
    disconnect();
  };
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);
}

const scrollIntoView = ({ isIntersecting }: { isIntersecting: boolean }) =>
  act(() => {
    const [{ callback, disconnected }] = observers;
    if (disconnected) return;
    callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
  });

describe('landing section tracking', () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports a section with its position once it scrolls into view', () => {
    render(
      <TrackedSection section='faq'>
        <p>questions</p>
      </TrackedSection>,
    );

    expect(phCapture).not.toHaveBeenCalled();

    scrollIntoView({ isIntersecting: true });

    expect(phCapture).toHaveBeenCalledExactlyOnceWith('landing_section_viewed', {
      section: 'faq',
      section_index: 11,
    });
  });

  it('ignores a section that is still out of view', () => {
    render(
      <TrackedSection section='faq'>
        <p>questions</p>
      </TrackedSection>,
    );

    scrollIntoView({ isIntersecting: false });

    expect(phCapture).not.toHaveBeenCalled();
  });

  it('reports a section only the first time it is seen', () => {
    render(
      <TrackedSection section='pricing'>
        <p>plans</p>
      </TrackedSection>,
    );

    scrollIntoView({ isIntersecting: true });
    scrollIntoView({ isIntersecting: true });

    expect(phCapture).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalled();
  });

  it('renders the section content', () => {
    const { getByText } = render(
      <TrackedSection section='pricing'>
        <p>plans</p>
      </TrackedSection>,
    );

    expect(getByText('plans')).toBeTruthy();
  });

  it('reports reaching the footer when the end of the page content comes into view', () => {
    render(<SectionReachedMarker section='footer' />);

    scrollIntoView({ isIntersecting: true });

    expect(phCapture).toHaveBeenCalledExactlyOnceWith('landing_section_viewed', {
      section: 'footer',
      section_index: 13,
    });
  });

  it('reports nothing when disabled', () => {
    render(<SectionReachedMarker section='footer' enabled={false} />);

    expect(observers).toHaveLength(0);
    expect(phCapture).not.toHaveBeenCalled();
  });

  it('does nothing in environments without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    expect(() => render(<SectionReachedMarker section='footer' />)).not.toThrow();
    expect(phCapture).not.toHaveBeenCalled();
  });
});
