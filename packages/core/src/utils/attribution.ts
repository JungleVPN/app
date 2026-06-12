import type { AttributionPayload } from '@workspace/types';

export type { AttributionPayload };

const STORAGE_KEY = 'jv_attribution';
const COOKIE_NAME = 'jv_attr';

function readLandingCookie(): URLSearchParams {
  const match = document.cookie.split('; ').find(c => c.startsWith(COOKIE_NAME + '='));
  if (!match) return new URLSearchParams();
  return new URLSearchParams(decodeURIComponent(match.split('=').slice(1).join('=')));
}

export function captureAttribution(options: {
  platform: 'web' | 'telegram';
  startParam?: string;
}): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(STORAGE_KEY)) return; // first-touch only

  const payload: AttributionPayload = {
    platform: options.platform,
    landingAt: new Date().toISOString(),
  };

  if (options.platform === 'telegram') {
    if (options.startParam) payload.adCode = options.startParam;
  } else {
    // Prefer URL params (direct ad click); fall back to cookie set by landing page
    const urlParams = new URLSearchParams(window.location.search);
    const cookieParams = readLandingCookie();
    const params = urlParams.has('utm_source') || urlParams.has('fbclid') || urlParams.has('gclid')
      ? urlParams
      : cookieParams;

    payload.source = params.get('utm_source') ?? undefined;
    payload.medium = params.get('utm_medium') ?? undefined;
    payload.campaign = params.get('utm_campaign') ?? undefined;
    payload.adset = params.get('utm_content') ?? undefined;
    payload.ad = params.get('utm_term') ?? undefined;
    payload.clickId =
      params.get('fbclid') ?? params.get('gclid') ?? params.get('ttclid') ?? undefined;
  }

  // Only persist if there's at least one attribution signal
  const hasSignal =
    payload.source || payload.clickId || payload.adCode || payload.campaign;
  if (!hasSignal) return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function getAttribution(): AttributionPayload | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AttributionPayload;
  } catch {
    return null;
  }
}

export function clearAttribution(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
}
