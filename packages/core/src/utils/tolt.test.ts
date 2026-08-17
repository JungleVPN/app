import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  isNewAffCode,
  readLandingAffCode,
  readToltAttribution,
  writeToltAttribution,
} from './tolt';

function setSearch(search: string) {
  window.history.replaceState({}, '', search || '/');
}

function setCookie(name: string, value: unknown) {
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}`;
}

function clearCookies() {
  for (const cookie of document.cookie.split('; ')) {
    const name = cookie.split('=')[0];
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

beforeEach(() => {
  clearCookies();
  window.tolt_referral = undefined;
  window.tolt_data = undefined;
});

afterEach(clearCookies);

describe('readToltAttribution — from window globals', () => {
  it('reads the code and partner set by tlt.js', () => {
    window.tolt_referral = 'jimhalpert';
    window.tolt_data = { partner_id: 'part_xyz', click_id: 'clk_1' };

    expect(readToltAttribution()).toEqual({
      referralCode: 'jimhalpert',
      partnerId: 'part_xyz',
      clickId: 'clk_1',
    });
  });

  it('treats a missing click id as null rather than undefined', () => {
    window.tolt_referral = 'jimhalpert';
    window.tolt_data = { partner_id: 'part_xyz' };

    expect(readToltAttribution()?.clickId).toBeNull();
  });

  it('returns null when the visitor did not arrive via an affiliate link', () => {
    expect(readToltAttribution()).toBeNull();
  });

  it('returns null while tlt.js has resolved neither global yet', () => {
    // tlt.js initialises both to null before its /clicks round-trip completes.
    window.tolt_referral = null as unknown as undefined;
    window.tolt_data = null as unknown as undefined;

    expect(readToltAttribution()).toBeNull();
  });

  it('returns null when a partner id is missing — it is required by Tolt', () => {
    window.tolt_referral = 'jimhalpert';
    window.tolt_data = { click_id: 'clk_1' } as never;

    expect(readToltAttribution()).toBeNull();
  });
});

describe('readToltAttribution — from cookies', () => {
  it('falls back to the cookies tlt.js writes, so a returning visitor still attributes', () => {
    setCookie('tolt_referral', 'jimhalpert');
    setCookie('tolt_data', { partner_id: 'part_xyz', click_id: 'clk_1' });

    expect(readToltAttribution()).toEqual({
      referralCode: 'jimhalpert',
      partnerId: 'part_xyz',
      clickId: 'clk_1',
    });
  });

  it('prefers the live globals over the cookie', () => {
    setCookie('tolt_referral', 'oldpartner');
    setCookie('tolt_data', { partner_id: 'part_old' });
    window.tolt_referral = 'newpartner';
    window.tolt_data = { partner_id: 'part_new' };

    expect(readToltAttribution()).toMatchObject({
      referralCode: 'newpartner',
      partnerId: 'part_new',
    });
  });

  it('survives a cookie that is not valid JSON', () => {
    document.cookie = 'tolt_data=not-json';
    document.cookie = 'tolt_referral=not-json';

    expect(() => readToltAttribution()).not.toThrow();
    expect(readToltAttribution()).toBeNull();
  });
});

describe('readLandingAffCode', () => {
  it('reads the aff parameter from the landing URL', () => {
    setSearch('/?aff=zaira');
    expect(readLandingAffCode()).toBe('zaira');
  });

  it('returns null when the visitor arrived without one', () => {
    setSearch('/?utm_source=newsletter');
    expect(readLandingAffCode()).toBeNull();
  });

  it('ignores an empty parameter', () => {
    setSearch('/?aff=');
    expect(readLandingAffCode()).toBeNull();
  });

  it('trims stray whitespace from a hand-edited link', () => {
    setSearch('/?aff=%20zaira%20');
    expect(readLandingAffCode()).toBe('zaira');
  });
});

describe('writeToltAttribution', () => {
  it('stores attribution readable by readToltAttribution — same shape as before', () => {
    writeToltAttribution({ referralCode: 'zaira', partnerId: 'part_z', clickId: 'clk_1' });

    // Globals are populated too, so a capture in this same page load sees it.
    expect(readToltAttribution()).toEqual({
      referralCode: 'zaira',
      partnerId: 'part_z',
      clickId: 'clk_1',
    });
  });

  it('survives a reload — the cookie alone is enough', () => {
    writeToltAttribution({ referralCode: 'zaira', partnerId: 'part_z', clickId: 'clk_1' });
    window.tolt_referral = null;
    window.tolt_data = null;

    expect(readToltAttribution()).toMatchObject({ referralCode: 'zaira', partnerId: 'part_z' });
  });

  it('lets a newer partner replace an older one — last click wins', () => {
    writeToltAttribution({ referralCode: 'in1', partnerId: 'part_in1', clickId: null });
    writeToltAttribution({ referralCode: 'in2', partnerId: 'part_in2', clickId: null });

    expect(readToltAttribution()).toMatchObject({ referralCode: 'in2', partnerId: 'part_in2' });
  });
});

describe('isNewAffCode', () => {
  it('is true when nothing is stored yet', () => {
    expect(isNewAffCode('zaira')).toBe(true);
  });

  it('is false for the code already stored, so a reload records no new click', () => {
    writeToltAttribution({ referralCode: 'zaira', partnerId: 'part_z', clickId: null });
    expect(isNewAffCode('zaira')).toBe(false);
  });

  it('is true for a different partner, so their click is recorded', () => {
    writeToltAttribution({ referralCode: 'in1', partnerId: 'part_in1', clickId: null });
    expect(isNewAffCode('in2')).toBe(true);
  });
});
