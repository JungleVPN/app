import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../stores';
import { ApiClientError } from './client';
import { handleTelegramUnauthorized } from './telegram-session';

const { phCapture } = vi.hoisted(() => ({ phCapture: vi.fn() }));
vi.mock('../utils/posthog', () => ({ phCapture }));

const rejection = (data: unknown, path = '/users/me') =>
  new ApiClientError({ status: 401, message: 'Request failed', path, data });

const launchedFromTelegram = () => useAuthStore.setState({ tgInitDataRaw: 'query_id=1&hash=x' });

describe('handleTelegramUnauthorized', () => {
  afterEach(() => {
    useAuthStore.setState({ tgInitDataRaw: null, sessionExpired: false });
    phCapture.mockClear();
  });

  it('asks the user to reopen the app once the launch data has expired', () => {
    launchedFromTelegram();

    handleTelegramUnauthorized(rejection({ statusCode: 401, code: 'init_data_expired' }));

    expect(useAuthStore.getState().sessionExpired).toBe(true);
  });

  it('keeps the app usable when the launch data is rejected for another reason', () => {
    launchedFromTelegram();

    handleTelegramUnauthorized(rejection({ statusCode: 401, message: 'User not found' }));

    expect(useAuthStore.getState().sessionExpired).toBe(false);
  });

  it('reports a non-expiry rejection with its endpoint and reason', () => {
    launchedFromTelegram();

    handleTelegramUnauthorized(
      rejection({ statusCode: 401, error: 'Invalid Telegram initData signature' }, '/payments/x'),
    );

    expect(phCapture).toHaveBeenCalledWith('tma_auth_rejected', {
      api_path: '/payments/x',
      reason: 'Invalid Telegram initData signature',
    });
  });

  it('does not report an expiry as a rejection', () => {
    launchedFromTelegram();

    handleTelegramUnauthorized(rejection({ code: 'init_data_expired' }));

    expect(phCapture).not.toHaveBeenCalled();
  });

  it('does nothing when no launch data was sent', () => {
    handleTelegramUnauthorized(rejection({ code: 'init_data_expired' }));

    expect(useAuthStore.getState().sessionExpired).toBe(false);
    expect(phCapture).not.toHaveBeenCalled();
  });
});
