import { phCapture, phReset } from './posthog';

/** The parts of a Supabase `AuthError` worth reporting. The email address is never sent. */
export type AuthFailure = {
  message: string;
  code?: string;
  status?: number;
};

function failureProperties({ message, code, status }: AuthFailure) {
  return { error_code: code ?? null, error_status: status ?? null, reason: message };
}

export function trackLoginOtpRequested(): void {
  phCapture('login_otp_requested', undefined);
}

export function trackLoginOtpRequestFailed(failure: AuthFailure): void {
  phCapture('login_otp_request_failed', failureProperties(failure));
}

export function trackLoginOtpResent(): void {
  phCapture('login_otp_resent', undefined);
}

export function trackLoginOtpResendFailed(failure: AuthFailure): void {
  phCapture('login_otp_resend_failed', failureProperties(failure));
}

export function trackLoginOtpVerified(): void {
  phCapture('otp_verified', undefined);
}

/** Keeps the `otp_invalid_code` name existing insights are built on. */
export function trackLoginOtpVerifyFailed(failure: AuthFailure): void {
  phCapture('otp_invalid_code', failureProperties(failure));
}

export function trackLoginEmailChanged(): void {
  phCapture('login_email_changed', undefined);
}

/** Captured before the reset, so the logout lands on the person who logged out. */
export function trackLogout(): void {
  phCapture('logout', undefined);
  phReset();
}

export function trackTmaSessionExpired({ apiPath }: { apiPath: string | undefined }): void {
  phCapture('tma_session_expired', { api_path: apiPath });
}
