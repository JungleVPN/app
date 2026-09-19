import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHoverOpen } from './use-hover-open';

describe('useHoverOpen', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts closed', () => {
    const { result } = renderHook(() => useHoverOpen());

    expect(result.current.isOpen).toBe(false);
  });

  it('opens as soon as the pointer arrives', () => {
    const { result } = renderHook(() => useHoverOpen());

    act(() => result.current.open());

    expect(result.current.isOpen).toBe(true);
  });

  it('keeps the menu open while the pointer crosses the gap to the popover', () => {
    const { result } = renderHook(() => useHoverOpen({ closeDelayMs: 150 }));

    act(() => result.current.open());
    act(() => result.current.close());
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => result.current.open());
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('closes once the pointer has stayed away for the close delay', () => {
    const { result } = renderHook(() => useHoverOpen({ closeDelayMs: 150 }));

    act(() => result.current.open());
    act(() => result.current.close());

    expect(result.current.isOpen).toBe(true);

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('closes immediately when asked to, without waiting out the delay', () => {
    const { result } = renderHook(() => useHoverOpen({ closeDelayMs: 150 }));

    act(() => result.current.open());
    act(() => result.current.closeNow());

    expect(result.current.isOpen).toBe(false);
  });

  it('closes when the user presses Escape, even from inside an overlay that swallows the key', () => {
    const { result } = renderHook(() => useHoverOpen());
    const overlay = document.createElement('div');
    overlay.addEventListener('keydown', (event) => event.stopPropagation());
    document.body.append(overlay);

    act(() => result.current.open());
    act(() => {
      overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    overlay.remove();

    expect(result.current.isOpen).toBe(false);
  });

  it('reports the dismissal so the caller can keep returning focus from reopening it', () => {
    const onDismiss = vi.fn();
    const { result } = renderHook(() => useHoverOpen({ onDismiss }));

    act(() => result.current.open());
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape while it is already closed', () => {
    const { result } = renderHook(() => useHoverOpen());

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('stops listening for Escape once it unmounts', () => {
    const removeEventListener = vi.spyOn(document, 'removeEventListener');
    const { result, unmount } = renderHook(() => useHoverOpen());

    act(() => result.current.open());
    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
  });

  it('drops a pending close when it unmounts', () => {
    const { result, unmount } = renderHook(() => useHoverOpen({ closeDelayMs: 150 }));

    act(() => result.current.open());
    act(() => result.current.close());
    unmount();

    expect(() => vi.advanceTimersByTime(150)).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});
