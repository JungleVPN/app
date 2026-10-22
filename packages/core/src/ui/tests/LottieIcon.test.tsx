import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = () => void;

const { players, playerFactory } = vi.hoisted(() => {
  const players: FakePlayer[] = [];
  type FakePlayer = {
    options: { src: string };
    listeners: Map<string, Listener>;
    destroy: ReturnType<typeof vi.fn>;
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    emit: (type: string) => void;
  };
  const playerFactory = { throwOnCreate: false, failDownload: false };
  return { players, playerFactory };
});

vi.mock('@lottiefiles/dotlottie-web', () => {
  class DotLottie {
    options: { src: string };
    listeners = new Map<string, Listener>();
    destroy = vi.fn();
    play = vi.fn();
    pause = vi.fn();
    constructor(options: { src: string }) {
      if (playerFactory.throwOnCreate) throw new Error('wasm failed to start');
      this.options = options;
      players.push(this as never);
    }
    addEventListener(type: string, listener: Listener) {
      this.listeners.set(type, listener);
    }
    emit(type: string) {
      this.listeners.get(type)?.();
    }
  }
  // Read on every import, so a test can make the player's code fail to arrive.
  return {
    get DotLottie() {
      if (playerFactory.failDownload)
        throw new Error('Failed to fetch dynamically imported module');
      return DotLottie;
    },
  };
});

/** Every icon is on screen at once, so each starts its player straight away. */
class VisibleIntersectionObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe() {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
  }
  disconnect() {}
}

/** The module keeps a per-visit "the player is broken" flag, so each test loads it afresh. */
async function loadLottieIcon() {
  vi.resetModules();
  return (await import('../LottieIcon')).LottieIcon;
}

async function renderIcon(src = '/assets/privacy.lottie') {
  const LottieIcon = await loadLottieIcon();
  const view = render(<LottieIcon src={src} size={64} />);
  await act(async () => {});
  return { ...view, LottieIcon };
}

describe('LottieIcon', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', VisibleIntersectionObserver);
    vi.useFakeTimers({ toFake: ['setTimeout'] });
  });

  afterEach(() => {
    cleanup();
    players.length = 0;
    playerFactory.throwOnCreate = false;
    playerFactory.failDownload = false;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('plays the animation once the icon is on screen', async () => {
    const { container } = await renderIcon('/assets/privacy.lottie');

    expect(players).toHaveLength(1);
    expect(players[0].options.src).toBe('/assets/privacy.lottie');
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  // Seen on iOS 15 Safari: the WASM player fails to load every animation,
  // then throws uncaught errors that end the visit.
  describe('when the player fails', () => {
    it.each([
      'loadError',
      'renderError',
    ])('replaces the animation with an empty space of the same size on %s', async (failure) => {
      const { container } = await renderIcon();

      act(() => players[0].emit(failure));

      expect(container.querySelector('canvas')).toBeNull();
      const placeholder = container.firstElementChild as HTMLElement;
      expect(placeholder.style.width).toBe('64px');
      expect(placeholder.style.height).toBe('64px');
    });

    // Destroying the player from inside its own event callback re-enters the
    // WASM core, which is what throws "recursive use of an object".
    it('shuts the broken player down only after its callback has returned', async () => {
      await renderIcon();

      act(() => players[0].emit('loadError'));

      expect(players[0].destroy).not.toHaveBeenCalled();
      act(() => vi.runAllTimers());
      expect(players[0].destroy).toHaveBeenCalledTimes(1);
    });

    it('does not start the player for any other icon for the rest of the visit', async () => {
      const { LottieIcon } = await renderIcon('/assets/privacy.lottie');
      act(() => players[0].emit('loadError'));

      const { container } = render(<LottieIcon src='/assets/referrals.lottie' size={64} />);
      await act(async () => {});

      expect(players).toHaveLength(1);
      expect(container.querySelector('canvas')).toBeNull();
    });

    it('leaves an empty space when the player code fails to download', async () => {
      playerFactory.failDownload = true;

      const { container } = await renderIcon();

      expect(container.querySelector('canvas')).toBeNull();
    });

    it('leaves an empty space when the player cannot even start', async () => {
      playerFactory.throwOnCreate = true;

      const { container } = await renderIcon();

      expect(container.querySelector('canvas')).toBeNull();
    });
  });
});
