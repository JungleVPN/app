import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureAdClicks, getAdClicks } from './adClicks';

const DAY_MS = 24 * 60 * 60 * 1000;

function visit(search: string) {
  window.history.pushState({}, '', search ? `/${search}` : '/');
  captureAdClicks();
}

function setLandingCookie(queryString: string) {
  document.cookie = `jv_attr=${encodeURIComponent(queryString)}; path=/`;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.cookie = 'jv_attr=; Max-Age=-1; path=/';
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  window.history.pushState({}, '', '/');
});

describe('which click ids are kept', () => {
  it('keeps every Google and Microsoft click id and nothing else', () => {
    visit('?gclid=g-1&gbraid=gb-1&wbraid=wb-1&msclkid=ms-1&fbclid=fb-1&utm_source=google');

    expect(getAdClicks()).toEqual({
      gclid: 'g-1',
      gbraid: 'gb-1',
      wbraid: 'wb-1',
      msclkid: 'ms-1',
    });
  });

  it('keeps nothing from a visit without a click id', () => {
    visit('?utm_source=google');

    expect(getAdClicks()).toBeNull();
  });

  it('falls back to the click ids the landing page saved in its cookie', () => {
    setLandingCookie('gclid=g-landing&msclkid=ms-landing');
    visit('');

    expect(getAdClicks()).toEqual({ gclid: 'g-landing', msclkid: 'ms-landing' });
  });

  it('prefers the click ids in the address over the landing cookie', () => {
    setLandingCookie('gclid=g-landing');
    visit('?msclkid=ms-1');

    expect(getAdClicks()).toEqual({ msclkid: 'ms-1' });
  });
});

describe('the last ad click wins', () => {
  it('replaces an earlier click with a newer one from another platform', () => {
    visit('?gclid=g-1');
    visit('?msclkid=ms-1');

    expect(getAdClicks()).toEqual({ msclkid: 'ms-1' });
  });

  it('keeps the stored click across pages and sessions without a click id', () => {
    visit('?gclid=g-1');
    sessionStorage.clear();
    visit('');

    expect(getAdClicks()).toEqual({ gclid: 'g-1' });
  });
});

describe('a click older than 90 days', () => {
  it('is still reported on its 90th day', () => {
    visit('?gclid=g-1');
    vi.setSystemTime(Date.now() + 90 * DAY_MS);

    expect(getAdClicks()).toEqual({ gclid: 'g-1' });
  });

  it('is no longer reported after 90 days', () => {
    visit('?gclid=g-1');
    vi.setSystemTime(Date.now() + 90 * DAY_MS + 1);

    expect(getAdClicks()).toBeNull();
  });

  it('is not made younger by seeing the same click id again', () => {
    setLandingCookie('gclid=g-1');
    visit('');
    vi.setSystemTime(Date.now() + 60 * DAY_MS);
    visit('');
    vi.setSystemTime(Date.now() + 31 * DAY_MS);

    expect(getAdClicks()).toBeNull();
  });

  it('restarts the 90 days for a new click', () => {
    visit('?gclid=g-1');
    vi.setSystemTime(Date.now() + 60 * DAY_MS);
    visit('?msclkid=ms-1');
    vi.setSystemTime(Date.now() + 31 * DAY_MS);

    expect(getAdClicks()).toEqual({ msclkid: 'ms-1' });
  });

  it('treats a click that shares only some ids with the earlier one as new', () => {
    visit('?gclid=g-1');
    vi.setSystemTime(Date.now() + 60 * DAY_MS);
    visit('?gclid=g-1&msclkid=ms-1');
    vi.setSystemTime(Date.now() + 31 * DAY_MS);

    expect(getAdClicks()).toEqual({ gclid: 'g-1', msclkid: 'ms-1' });
  });
});

describe('a stored click that is not one we wrote', () => {
  it.each([
    ['not JSON', 'not-json'],
    ['without a time', JSON.stringify({ clicks: { gclid: 'g-1' } })],
    [
      'with a time that is not a number',
      JSON.stringify({ clicks: { gclid: 'g-1' }, clickedAt: 'today' }),
    ],
    ['without click ids', JSON.stringify({ clickedAt: Date.parse('2026-10-01T12:00:00Z') })],
    [
      'with a non-text click id',
      JSON.stringify({ clicks: { gclid: 42 }, clickedAt: Date.parse('2026-10-01T12:00:00Z') }),
    ],
  ])('is ignored when %s', (_case, stored) => {
    localStorage.setItem('jungle.adClick', stored);

    expect(getAdClicks()).toBeNull();
  });
});

describe('when storage is unavailable', () => {
  it('reports nothing rather than failing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(() => visit('?gclid=g-1')).not.toThrow();
    expect(getAdClicks()).toBeNull();

    vi.restoreAllMocks();
  });
});
