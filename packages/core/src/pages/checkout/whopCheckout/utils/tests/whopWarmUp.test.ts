/**
 * Warming the Whop checkout: its SDK is a large script from Whop's CDN that
 * the checkout page only starts loading once it mounts. Pages that lead to the
 * checkout start the download and open Whop's connections ahead of it. Only
 * the global scope checks out through Whop.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { warmWhopCheckout, whopCheckoutHeadHtml } from '../whopWarmUp';

const SDK_URL = 'https://cdn.whop.com/elements/amber/elements.js';
const PLAN_CHECKOUT = '/payment/0b6f7d2e-3c1a-4f5b-9d8e-7a6b5c4d3e2f';

afterEach(() => {
  document.head.replaceChildren();
  vi.unstubAllEnvs();
});

const links = () =>
  [...document.head.querySelectorAll('link')].map((link) => ({
    rel: link.rel,
    href: link.href,
    as: link.getAttribute('as'),
    crossOrigin: link.getAttribute('crossorigin'),
  }));

describe('whopCheckoutHeadHtml', () => {
  it('preloads the SDK and opens Whop’s connections for a plan checkout', () => {
    vi.stubEnv('PUBLIC_WHOP_ENVIRONMENT', 'sandbox');

    const html = whopCheckoutHeadHtml({ pathname: PLAN_CHECKOUT, scope: 'global' });

    expect(html).toContain(`<link rel="preload" href="${SDK_URL}" as="script">`);
    expect(html).toContain('<link rel="preconnect" href="https://cdn.whop.com">');
    expect(html).toContain(
      '<link rel="preconnect" href="https://sandbox-api.whop.com" crossorigin="anonymous">',
    );
  });

  it('leaves out the wallet providers’ scripts, which the wallet probe loads itself', () => {
    vi.stubEnv('PUBLIC_WHOP_ENVIRONMENT', 'production');

    const html = whopCheckoutHeadHtml({ pathname: PLAN_CHECKOUT, scope: 'global' });

    expect(html).not.toMatch(/paypal|braintree|pay\.google|apple/);
  });

  it.each([
    ['another page', '/pricing', 'global'],
    ['the RU checkout, which is not Whop’s', PLAN_CHECKOUT, 'ru'],
  ] as const)('adds nothing for %s', (_, pathname, scope) => {
    vi.stubEnv('PUBLIC_WHOP_ENVIRONMENT', 'production');

    expect(whopCheckoutHeadHtml({ pathname, scope })).toBe('');
  });

  it('adds nothing, rather than failing the page, when the Whop environment is not set', () => {
    vi.stubEnv('PUBLIC_WHOP_ENVIRONMENT', '');

    expect(whopCheckoutHeadHtml({ pathname: PLAN_CHECKOUT, scope: 'global' })).toBe('');
  });
});

describe('warmWhopCheckout', () => {
  it('starts loading the SDK and opens Whop’s connections', () => {
    vi.stubEnv('PUBLIC_WHOP_ENVIRONMENT', 'production');

    warmWhopCheckout('global');

    expect(links()).toEqual(
      expect.arrayContaining([
        { rel: 'preload', href: SDK_URL, as: 'script', crossOrigin: null },
        { rel: 'preconnect', href: 'https://cdn.whop.com/', as: null, crossOrigin: null },
        { rel: 'preconnect', href: 'https://api.whop.com/', as: null, crossOrigin: 'anonymous' },
      ]),
    );
  });

  it('adds each hint once however often it is asked', () => {
    vi.stubEnv('PUBLIC_WHOP_ENVIRONMENT', 'production');

    warmWhopCheckout('global');
    warmWhopCheckout('global');

    expect(document.head.querySelectorAll(`link[href="${SDK_URL}"]`)).toHaveLength(1);
  });

  it('warms nothing in the RU scope, which does not check out through Whop', () => {
    vi.stubEnv('PUBLIC_WHOP_ENVIRONMENT', 'production');

    warmWhopCheckout('ru');

    expect(links()).toEqual([]);
  });

  it('warms nothing, rather than failing the page, when the Whop environment is not set', () => {
    vi.stubEnv('PUBLIC_WHOP_ENVIRONMENT', '');

    expect(() => warmWhopCheckout('global')).not.toThrow();
    expect(links()).toEqual([]);
  });
});
