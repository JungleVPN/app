import { preloadHints, type WhopPreloadHints } from '@whop/elements';
import type { UserScope } from '@workspace/types';
import { isPlanCheckoutPath } from '../../../../utils/site/domain';
import { getWhopEnvironment } from './whopEnv';

/**
 * The hints that warm Whop's checkout: its CDN, its SDK script and its API.
 * The wallet providers' scripts are left out — the wallet probe loads them
 * while the payer gives their email, and most payers never use PayPal's.
 * None when the Whop environment is not set: a missing hint must never fail
 * the page that would have carried it.
 */
function checkoutHints(scope: UserScope): WhopPreloadHints | null {
  if (scope === 'ru') return null;
  try {
    return preloadHints({
      environment: getWhopEnvironment(),
      wallets: false,
      bankConnections: false,
    });
  } catch {
    return null;
  }
}

/**
 * The `<link>` tags a server-rendered plan checkout carries in its head, so
 * the browser fetches Whop's SDK while the page's own scripts load, rather
 * than once the checkout has mounted.
 */
export function whopCheckoutHeadHtml({
  pathname,
  scope,
}: {
  pathname: string;
  scope: UserScope;
}): string {
  if (!isPlanCheckoutPath(pathname)) return '';
  return checkoutHints(scope)?.toHtml() ?? '';
}

/**
 * Starts loading Whop's SDK and opens its connections from a page the payer
 * goes to the checkout from. The checkout's own load then finds the script
 * already downloaded. Each hint is added once.
 */
export function warmWhopCheckout(scope: UserScope): void {
  for (const hint of checkoutHints(scope) ?? []) {
    if (document.head.querySelector(`link[rel="${hint.rel}"][href="${hint.href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = hint.rel;
    link.href = hint.href;
    if (hint.as) link.setAttribute('as', hint.as);
    if (hint.crossOrigin) link.setAttribute('crossorigin', hint.crossOrigin);
    document.head.appendChild(link);
  }
}
