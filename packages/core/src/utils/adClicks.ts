import type { AdClicks } from '@workspace/types';
import { readCookie } from './cookies';

export type { AdClicks };

/**
 * The last Google Ads / Microsoft Ads click, kept so a checkout can hand it to
 * the backend, which reports the purchase to the ad platform once it is paid.
 *
 * A click id is an advertising identifier, so it is held in sessionStorage
 * until the cookie banner is accepted and only then kept in localStorage;
 * a denial discards it. Last click wins, and a click stops counting after the
 * 90 days both platforms accept a conversion for.
 */

const PENDING_KEY = 'jungle.pendingAdClick';
const GRANTED_KEY = 'jungle.adClick';
const LANDING_COOKIE = 'jv_attr';
const CLICK_ID_PARAMS = ['gclid', 'gbraid', 'wbraid', 'msclkid'] as const;
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

type StoredAdClick = { clicks: AdClicks; clickedAt: number };

export function captureAdClicks(): void {
  const clicks =
    clickIdsIn(new URLSearchParams(window.location.search)) ??
    clickIdsIn(new URLSearchParams(readCookie(LANDING_COOKIE) ?? ''));
  if (!clicks) return;

  const known = read(sessionStorage, PENDING_KEY) ?? read(localStorage, GRANTED_KEY);
  const clickedAt = known && sameClicks(known.clicks, clicks) ? known.clickedAt : Date.now();
  write(sessionStorage, PENDING_KEY, { clicks, clickedAt });
}

/** The cookie banner was accepted: the pending click becomes the one a checkout reports. */
export function grantAdClicks(): void {
  const pending = read(sessionStorage, PENDING_KEY);
  if (!pending) return;
  write(localStorage, GRANTED_KEY, pending);
}

/** The cookie banner was declined: no click is kept. */
export function dropAdClicks(): void {
  remove(sessionStorage, PENDING_KEY);
  remove(localStorage, GRANTED_KEY);
}

/** The consented click still within its 90 days, or null. */
export function getAdClicks(): AdClicks | null {
  const stored = read(localStorage, GRANTED_KEY);
  if (!stored || Date.now() - stored.clickedAt > MAX_AGE_MS) return null;
  return stored.clicks;
}

function clickIdsIn(source: unknown): AdClicks | null {
  const entries = CLICK_ID_PARAMS.flatMap((name) => {
    const value = clickIdValue(source, name);
    return value ? [[name, value] as const] : [];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function clickIdValue(source: unknown, name: string): string | null {
  if (source instanceof URLSearchParams) return source.get(name);
  if (typeof source !== 'object' || source === null || !(name in source)) return null;
  const value: unknown = Reflect.get(source, name);
  return typeof value === 'string' ? value : null;
}

function sameClicks(a: AdClicks, b: AdClicks): boolean {
  return CLICK_ID_PARAMS.every((name) => a[name] === b[name]);
}

function read(storage: Storage, key: string): StoredAdClick | null {
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : toStoredAdClick(JSON.parse(raw));
  } catch {
    return null;
  }
}

function toStoredAdClick(stored: unknown): StoredAdClick | null {
  if (typeof stored !== 'object' || stored === null) return null;
  if (!('clickedAt' in stored) || typeof stored.clickedAt !== 'number') return null;
  if (!('clicks' in stored)) return null;
  const clicks = clickIdsIn(stored.clicks);
  return clicks ? { clicks, clickedAt: stored.clickedAt } : null;
}

function write(storage: Storage, key: string, value: StoredAdClick): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage disabled — this click goes unreported rather than failing the page.
  }
}

function remove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Storage disabled — nothing was kept to remove.
  }
}
