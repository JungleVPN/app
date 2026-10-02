import { NO_PROVIDER_SUBSCRIPTION } from '@workspace/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth';
import { useSavedMethodsStore } from './saved-methods';
import { useSubscriptionConfigStore } from './subscription-config';
import { useSubscriptionInfoStore } from './subscription-info';

const alice = { id: 'auth-alice', email: 'alice@example.com' };
const bob = { id: 'auth-bob', email: 'bob@example.com' };

const accountOf = (email: string) => ({ id: 101, shortUuid: `short-${email}`, email }) as never;
const subscriptionOf = (email: string) =>
  ({ user: { shortUuid: `short-${email}`, expiresAt: '2026-12-01T00:00:00Z' } }) as never;
const subscriptionPageConfig = { locales: ['en'], platforms: {}, uiConfig: {} } as never;
const activeCard = { id: 'pm-1', provider: 'yookassa', isActive: true } as never;

function signInWithCachedProfile(user: typeof alice) {
  useAuthStore.getState().actions.setAuthUser(user);
  useAuthStore.getState().actions.setRmnUser(accountOf(user.email));
  useAuthStore.getState().actions.setUserScope('ru');
  useSubscriptionInfoStore
    .getState()
    .actions.setSubscriptionInfo({ subscription: subscriptionOf(user.email) });
  useSubscriptionConfigStore.getState().actions.setConfig(subscriptionPageConfig);
  useSavedMethodsStore.getState().actions.setBillingState({
    yookassa: { active: true, methods: [activeCard] },
    stripe: NO_PROVIDER_SUBSCRIPTION,
    paddle: NO_PROVIDER_SUBSCRIPTION,
    whop: NO_PROVIDER_SUBSCRIPTION,
  });
}

function expectNoCachedProfile() {
  expect(useAuthStore.getState().rmnUser).toBeNull();
  expect(useAuthStore.getState().userScope).toBeNull();
  expect(useSubscriptionInfoStore.getState().subscription).toBeNull();
  expect(useSubscriptionConfigStore.getState().isConfigLoaded).toBe(false);
  expect(useSubscriptionConfigStore.getState().config).toBeNull();
  expect(useSavedMethodsStore.getState().isLoaded).toBe(false);
  expect(useSavedMethodsStore.getState().yookassa.active).toBe(false);
}

describe('auth store: switching the signed-in web user', () => {
  beforeEach(() => {
    useAuthStore.getState().actions.setAuthUser(null);
    useSubscriptionInfoStore.getState().actions.resetState();
    useSubscriptionConfigStore.getState().actions.resetState();
    useSavedMethodsStore.getState().actions.resetState();
  });

  it("forgets the previous account's profile, subscription and billing on sign-out", () => {
    signInWithCachedProfile(alice);

    useAuthStore.getState().actions.setAuthUser(null);

    expect(useAuthStore.getState().authUser).toBeNull();
    expectNoCachedProfile();
  });

  it("forgets the previous account's data when a different user signs in", () => {
    signInWithCachedProfile(alice);

    useAuthStore.getState().actions.setAuthUser(bob);

    expect(useAuthStore.getState().authUser).toEqual(bob);
    expectNoCachedProfile();
  });

  // Supabase re-reports the same session on every token refresh; refetching
  // the whole profile each time would flash the spinner for nothing.
  it('keeps the cached profile when the same user is reported again', () => {
    signInWithCachedProfile(alice);

    useAuthStore.getState().actions.setAuthUser({ ...alice, email: 'alice@new.example.com' });

    expect(useAuthStore.getState().authUser?.email).toBe('alice@new.example.com');
    expect(useAuthStore.getState().rmnUser).toEqual(accountOf(alice.email));
    expect(useAuthStore.getState().userScope).toBe('ru');
    expect(useSubscriptionInfoStore.getState().subscription).toEqual(subscriptionOf(alice.email));
    expect(useSubscriptionConfigStore.getState().isConfigLoaded).toBe(true);
    expect(useSavedMethodsStore.getState().isLoaded).toBe(true);
  });
});
