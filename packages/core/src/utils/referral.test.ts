import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { captureReferral, clearReferral, getReferral, getReferralUserId } from './referral';

function setUrlSearch(search: string) {
  window.history.pushState({}, '', search ? `/${search}` : '/');
}

function clearCookie() {
  document.cookie = 'jv_referral=; max-age=0; path=/';
}

beforeEach(() => {
  clearCookie();
  setUrlSearch('');
});

afterEach(() => {
  setUrlSearch('');
});

describe('captureReferral', () => {
  it('stores the ref param in a cookie when present in the URL', () => {
    setUrlSearch('?ref=abc123');
    captureReferral();

    expect(getReferral()).toBe('abc123');
  });

  it('does nothing when no ref param is in the URL', () => {
    setUrlSearch('?utm_source=google');
    captureReferral();

    expect(getReferral()).toBeNull();
  });

  it('is first-touch only — does not overwrite an existing cookie', () => {
    setUrlSearch('?ref=first');
    captureReferral();

    setUrlSearch('?ref=second');
    captureReferral();

    expect(getReferral()).toBe('first');
  });

  it('handles ref values that contain special characters', () => {
    setUrlSearch('?ref=hello%2Bworld');
    captureReferral();

    expect(getReferral()).toBe('hello+world');
  });
});

describe('getReferral', () => {
  it('returns null when no cookie is set', () => {
    expect(getReferral()).toBeNull();
  });

  it('returns the stored value after captureReferral', () => {
    setUrlSearch('?ref=user-uuid-1');
    captureReferral();

    expect(getReferral()).toBe('user-uuid-1');
  });
});

describe('clearReferral', () => {
  it('removes the cookie so getReferral returns null', () => {
    setUrlSearch('?ref=abc123');
    captureReferral();
    expect(getReferral()).toBe('abc123');

    clearReferral();

    expect(getReferral()).toBeNull();
  });

  it('allows a new referral to be captured after clearing', () => {
    setUrlSearch('?ref=first');
    captureReferral();
    clearReferral();

    setUrlSearch('?ref=second');
    captureReferral();

    expect(getReferral()).toBe('second');
  });
});

describe('getReferralUserId', () => {
  it('returns the stored code as a number when it is a valid user id', () => {
    document.cookie = 'jv_referral=4821';
    expect(getReferralUserId()).toBe(4821);
  });

  it('returns null when no referral is stored', () => {
    expect(getReferralUserId()).toBeNull();
  });

  it('returns null for a legacy uuid captured before the panel v3 migration', () => {
    document.cookie = 'jv_referral=a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    expect(getReferralUserId()).toBeNull();
  });

  it('returns null for a non-numeric code rather than forwarding a bogus inviter', () => {
    document.cookie = 'jv_referral=not-an-id';
    expect(getReferralUserId()).toBeNull();
  });

  it('returns null for a non-positive id', () => {
    document.cookie = 'jv_referral=0';
    expect(getReferralUserId()).toBeNull();
  });
});
