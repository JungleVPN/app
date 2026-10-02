import { useAuthStore } from '../stores';
import { phCapture } from '../utils';
import type { ApiClientError } from './client';

/** The code both backends attach to a 401 for Telegram launch data past its maximum age. */
const INIT_DATA_EXPIRED = 'init_data_expired';

/**
 * What the mini app does when the backend refuses its Telegram launch data.
 *
 * Only expiry is cured by reopening the app, so only expiry swaps the app for
 * the "session expired" screen. Any other refusal — a bad signature, an
 * account the backend cannot find — leaves the app usable and is reported, as
 * reopening would not help and the cause is ours to find.
 */
export function handleTelegramUnauthorized(error: ApiClientError): void {
  const { tgInitDataRaw, actions } = useAuthStore.getState();
  if (!tgInitDataRaw) return;

  if (field(error.data, 'code') === INIT_DATA_EXPIRED) {
    actions.setSessionExpired(true);
    return;
  }

  phCapture('tma_auth_rejected', {
    api_path: error.path,
    reason: field(error.data, 'error') ?? field(error.data, 'message'),
  });
}

function field(data: unknown, key: string): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const value: unknown = Reflect.get(data, key);
  return typeof value === 'string' ? value : undefined;
}
