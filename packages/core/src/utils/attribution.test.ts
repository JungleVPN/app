import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureAttribution, getAttribution } from './attribution';

// Push a query string onto the jsdom URL without a full navigation.
function setUrlSearch(search: string) {
  window.history.pushState({}, '', search ? `/${search}` : '/');
}

function setCookieAttribution(queryString: string) {
  document.cookie = `jv_attr=${encodeURIComponent(queryString)}; path=/`;
}

function clearCookie() {
  document.cookie = 'jv_attr=; Max-Age=-1; path=/';
}

beforeEach(() => {
  localStorage.clear();
  clearCookie();
  setUrlSearch('');
  // suppress the console.warn that getAttribution() emits when localStorage is empty
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  setUrlSearch('');
});

// ── Telegram ─────────────────────────────────────────────────────────────────

describe('captureAttribution — telegram', () => {
  it('stores the ad code when the startParam is not a referral prefix', () => {
    captureAttribution({ platform: 'telegram', startParam: 'channel_42' });

    expect(getAttribution()).toMatchObject({
      platform: 'telegram',
      adCode: 'channel_42',
    });
  });

  it('does not store an ad code when the startParam begins with ref_', () => {
    captureAttribution({ platform: 'telegram', startParam: 'ref_abc123' });

    expect(getAttribution()?.adCode).toBeUndefined();
  });

  it('still records platform and landing time when startParam is a referral code', () => {
    captureAttribution({ platform: 'telegram', startParam: 'ref_abc123' });

    const result = getAttribution();
    expect(result).not.toBeNull();
    expect(result?.platform).toBe('telegram');
    expect(result?.landingAt).toBeDefined();
  });

  it('records platform and landing time for an organic Telegram user with no startParam', () => {
    captureAttribution({ platform: 'telegram' });

    const result = getAttribution();
    expect(result).not.toBeNull();
    expect(result?.platform).toBe('telegram');
    expect(result?.landingAt).toBeDefined();
  });

  it('treats a startParam that begins with "ref" but not "ref_" as a regular ad code', () => {
    captureAttribution({ platform: 'telegram', startParam: 'reference_campaign' });

    expect(getAttribution()?.adCode).toBe('reference_campaign');
  });

  it('does not overwrite an existing first-touch attribution when called a second time', () => {
    captureAttribution({ platform: 'telegram', startParam: 'first_ad' });
    captureAttribution({ platform: 'telegram', startParam: 'second_ad' });

    expect(getAttribution()?.adCode).toBe('first_ad');
  });
});

// ── Web ───────────────────────────────────────────────────────────────────────

describe('captureAttribution — web', () => {
  it('captures utm_source from the URL', () => {
    setUrlSearch('?utm_source=google');
    captureAttribution({ platform: 'web' });

    expect(getAttribution()?.source).toBe('google');
  });

  it('captures utm_medium from the URL', () => {
    setUrlSearch('?utm_source=google&utm_medium=cpc');
    captureAttribution({ platform: 'web' });

    expect(getAttribution()?.medium).toBe('cpc');
  });

  it('captures utm_campaign from the URL', () => {
    setUrlSearch('?utm_source=google&utm_campaign=summer_sale');
    captureAttribution({ platform: 'web' });

    expect(getAttribution()?.campaign).toBe('summer_sale');
  });

  it('captures adCode from the URL', () => {
    setUrlSearch('?adCode=ad_001');
    captureAttribution({ platform: 'web' });

    expect(getAttribution()?.adCode).toBe('ad_001');
  });

  it('captures fbclid as the clickId', () => {
    setUrlSearch('?fbclid=FB_12345');
    captureAttribution({ platform: 'web' });

    expect(getAttribution()?.clickId).toBe('FB_12345');
  });

  it('captures gclid as the clickId when there is no fbclid', () => {
    setUrlSearch('?gclid=GC_12345');
    captureAttribution({ platform: 'web' });

    expect(getAttribution()?.clickId).toBe('GC_12345');
  });

  it('falls back to cookie params when the URL has no UTM or click signals', () => {
    setCookieAttribution('utm_source=email&utm_medium=newsletter');
    captureAttribution({ platform: 'web' });

    expect(getAttribution()).toMatchObject({ source: 'email', medium: 'newsletter' });
  });

  it('prefers URL params over cookie params when the URL carries UTM signals', () => {
    setCookieAttribution('utm_source=email');
    setUrlSearch('?utm_source=google');
    captureAttribution({ platform: 'web' });

    expect(getAttribution()?.source).toBe('google');
  });

  it('records platform and landing time for an organic web visitor with no UTM, adCode, or click params', () => {
    captureAttribution({ platform: 'web' });

    const result = getAttribution();
    expect(result).not.toBeNull();
    expect(result?.platform).toBe('web');
    expect(result?.landingAt).toBeDefined();
  });

  it('does not overwrite an existing first-touch attribution when called a second time', () => {
    setUrlSearch('?utm_source=google');
    captureAttribution({ platform: 'web' });

    setUrlSearch('?utm_source=facebook');
    captureAttribution({ platform: 'web' });

    expect(getAttribution()?.source).toBe('google');
  });
});
