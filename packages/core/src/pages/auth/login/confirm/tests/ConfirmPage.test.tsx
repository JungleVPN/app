import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import ConfirmPage from '../ConfirmPage';

const { mockNavigate, mockVerifyOtp } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockVerifyOtp: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../../../ui', () => ({
  Block: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  Heading: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
}));

vi.mock('../../../../../hooks', () => ({
  useNavigation: () => mockNavigate,
}));

vi.mock('../../../../../runtime', () => ({
  useAppRoutes: () => ({ profileSubscriptionPath: '/profile/subscription' }),
  useSupabaseClient: () => ({ auth: { verifyOtp: mockVerifyOtp } }),
}));

vi.mock('../../../../../utils', () => ({
  captureReferral: vi.fn(),
  trackLoginEmailChanged: vi.fn(),
  trackLoginOtpResendFailed: vi.fn(),
  trackLoginOtpResent: vi.fn(),
  trackLoginOtpVerified: vi.fn(),
  trackLoginOtpVerifyFailed: vi.fn(),
}));

const verified = () => ({ data: {}, error: null });
const rejected = () => ({ data: {}, error: { message: 'Token has expired or is invalid' } });

function renderConfirm(search = '?email=user%40example.com') {
  render(
    <MemoryRouter initialEntries={[`/login/confirm${search}`]}>
      <ConfirmPage />
    </MemoryRouter>,
  );
}

function enterCode(code: string) {
  fireEvent.change(screen.getByLabelText('a11y.otpCode'), { target: { value: code } });
}

describe('ConfirmPage', () => {
  it('verifies the code and opens the profile once six digits are entered', async () => {
    mockVerifyOtp.mockResolvedValue(verified());
    renderConfirm();

    enterCode('740899');

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/profile/subscription'));
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      token: '740899',
      type: 'email',
    });
  });

  it('does not verify an incomplete code', () => {
    renderConfirm();

    enterCode('74089');

    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('returns to the page the user came from after verifying', async () => {
    mockVerifyOtp.mockResolvedValue(verified());
    renderConfirm('?email=user%40example.com&to=%2Fprofile%2Fplans');

    enterCode('740899');

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/profile/plans'));
  });

  it('clears the code and explains when it is incorrect', async () => {
    mockVerifyOtp.mockResolvedValue(rejected());
    renderConfirm();

    enterCode('740899');

    expect(await screen.findByText('confirm.error_invalid_code')).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>('a11y.otpCode').value).toBe('');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps the code and lets the user retry when verification fails unexpectedly', async () => {
    mockVerifyOtp.mockRejectedValueOnce(new Error('Load failed')).mockResolvedValue(verified());
    renderConfirm();

    enterCode('740899');
    expect(await screen.findByText('errors.unknown')).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>('a11y.otpCode').value).toBe('740899');

    fireEvent.click(screen.getByRole('button', { name: 'login.submit' }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/profile/subscription'));
    expect(mockVerifyOtp).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('errors.unknown')).toBeNull();
  });

  it('verifies a corrected code that replaces a full one', async () => {
    mockVerifyOtp.mockRejectedValueOnce(new Error('Load failed')).mockResolvedValue(verified());
    renderConfirm();

    enterCode('740899');
    await screen.findByText('errors.unknown');
    enterCode('740898');

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/profile/subscription'));
    expect(mockVerifyOtp).toHaveBeenLastCalledWith({
      email: 'user@example.com',
      token: '740898',
      type: 'email',
    });
  });

  it('cannot be submitted before the code is complete', () => {
    renderConfirm();

    enterCode('7408');

    expect(screen.getByRole('button', { name: 'login.submit' }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('sends the user back to enter their email when the link has none', async () => {
    renderConfirm('');

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true }));
  });

  it('does not try to verify a code without an email', () => {
    renderConfirm('');

    enterCode('740899');

    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });
});
