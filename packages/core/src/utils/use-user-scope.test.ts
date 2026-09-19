/**
 * The scope a page should render for: the signed-in user's, when we know it.
 *
 * The host a user is browsing from says where they are, not which storefront they
 * bought from — an RU customer who opens the global domain is still an RU customer,
 * and rendering global pricing and payment methods at them is the same class of bug
 * as sending them a global "manage subscription" link.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, usePlatformStore } from '../stores';
import { setRequestHostname, userScope } from './domain';

const RU_DOMAINS = 'thejungle.pro,jungle.community';

describe('userScope', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    setRequestHostname(null);
    usePlatformStore.getState().actions.setPlatformType('web');
    useAuthStore.getState().actions.setUserScope(null);
    vi.stubEnv('PUBLIC_DOMAIN_RU', RU_DOMAINS);
  });

  it("uses the signed-in user's stored scope over the host", () => {
    vi.stubGlobal('window', { location: { hostname: 'jungle-vpn.com' } });
    useAuthStore.getState().actions.setUserScope('ru');

    expect(userScope()).toBe('ru');
  });

  it('uses the stored global scope even on an RU host', () => {
    vi.stubGlobal('window', { location: { hostname: 'thejungle.pro' } });
    useAuthStore.getState().actions.setUserScope('global');

    expect(userScope()).toBe('global');
  });

  // An unauthenticated visitor, or one whose metadata has not arrived yet: the host
  // is the only signal there is, and it is the right one for them.
  it('falls back to the host when no user scope is known', () => {
    vi.stubGlobal('window', { location: { hostname: 'jungle-vpn.com' } });

    expect(userScope()).toBe('global');

    vi.stubGlobal('window', { location: { hostname: 'thejungle.pro' } });
    expect(userScope()).toBe('ru');
  });
});
