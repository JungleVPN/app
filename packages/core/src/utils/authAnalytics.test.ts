/**
 * Login analytics — every step of the email OTP login reports to PostHog, and
 * a failed step carries the Supabase error code and status so failures can be
 * broken down without ever sending the email address.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  trackLoginEmailChanged,
  trackLoginOtpRequested,
  trackLoginOtpRequestFailed,
  trackLoginOtpResendFailed,
  trackLoginOtpResent,
  trackLoginOtpVerified,
  trackLoginOtpVerifyFailed,
  trackLogout,
  trackTmaSessionExpired,
} from './authAnalytics';

const { phCapture, phReset } = vi.hoisted(() => ({ phCapture: vi.fn(), phReset: vi.fn() }));

vi.mock('./posthog', () => ({ phCapture, phReset }));

const authError = {
  message: 'Email rate limit exceeded',
  code: 'over_email_send_rate_limit',
  status: 429,
};

describe('login analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports an OTP being requested', () => {
    trackLoginOtpRequested();

    expect(phCapture).toHaveBeenCalledWith('login_otp_requested', undefined);
  });

  it('reports a failed OTP request with the error code and status', () => {
    trackLoginOtpRequestFailed(authError);

    expect(phCapture).toHaveBeenCalledWith('login_otp_request_failed', {
      error_code: 'over_email_send_rate_limit',
      error_status: 429,
      reason: 'Email rate limit exceeded',
    });
  });

  it('reports an OTP being resent, and a resend failing', () => {
    trackLoginOtpResent();
    trackLoginOtpResendFailed(authError);

    expect(phCapture).toHaveBeenCalledWith('login_otp_resent', undefined);
    expect(phCapture).toHaveBeenCalledWith(
      'login_otp_resend_failed',
      expect.objectContaining({ error_code: 'over_email_send_rate_limit' }),
    );
  });

  it('reports a verified code', () => {
    trackLoginOtpVerified();

    expect(phCapture).toHaveBeenCalledWith('otp_verified', undefined);
  });

  it('reports a rejected code under its existing event name, with the reason', () => {
    trackLoginOtpVerifyFailed({ message: 'Token has expired', code: 'otp_expired', status: 403 });

    expect(phCapture).toHaveBeenCalledWith('otp_invalid_code', {
      error_code: 'otp_expired',
      error_status: 403,
      reason: 'Token has expired',
    });
  });

  it('reports an error with no code or status as null rather than dropping it', () => {
    trackLoginOtpRequestFailed({ message: 'Failed to fetch' });

    expect(phCapture).toHaveBeenCalledWith('login_otp_request_failed', {
      error_code: null,
      error_status: null,
      reason: 'Failed to fetch',
    });
  });

  it('reports the user going back to change their email', () => {
    trackLoginEmailChanged();

    expect(phCapture).toHaveBeenCalledWith('login_email_changed', undefined);
  });

  it('reports a logout before resetting the PostHog identity', () => {
    trackLogout();

    expect(phCapture).toHaveBeenCalledWith('logout', undefined);
    expect(phCapture.mock.invocationCallOrder[0]).toBeLessThan(
      phReset.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('reports an expired mini app session', () => {
    trackTmaSessionExpired({ apiPath: '/users/me' });

    expect(phCapture).toHaveBeenCalledWith('tma_session_expired', { api_path: '/users/me' });
  });
});
