import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieConsent } from './CookieConsent';

const { readCookie, writeCookie } = vi.hoisted(() => ({
  readCookie: vi.fn(),
  writeCookie: vi.fn(),
}));

vi.mock('../../utils', () => ({ readCookie, writeCookie }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

vi.mock('../../assets/Logo_dark.svg?react', () => ({
  default: () => <svg aria-hidden />,
}));

describe('CookieConsent', () => {
  beforeEach(() => {
    readCookie.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the banner when no consent choice has been recorded yet', () => {
    render(<CookieConsent />);

    expect(screen.getByRole('button', { name: 'cookieConsent.accept' })).toBeDefined();
  });

  it('stays hidden when a consent choice was already recorded', () => {
    readCookie.mockReturnValue('accepted');

    render(<CookieConsent />);

    expect(screen.queryByRole('button', { name: 'cookieConsent.accept' })).toBeNull();
  });

  it('records acceptance and hides the banner when Accept is pressed', () => {
    render(<CookieConsent />);

    fireEvent.click(screen.getByRole('button', { name: 'cookieConsent.accept' }));

    expect(writeCookie).toHaveBeenCalledWith('cookie_consent', 'accepted', { maxAgeDays: 365 });
    expect(screen.queryByRole('button', { name: 'cookieConsent.accept' })).toBeNull();
  });

  it('records denial and hides the banner when Deny is pressed', () => {
    render(<CookieConsent />);

    fireEvent.click(screen.getByRole('button', { name: 'cookieConsent.deny' }));

    expect(writeCookie).toHaveBeenCalledWith('cookie_consent', 'denied', { maxAgeDays: 365 });
    expect(screen.queryByRole('button', { name: 'cookieConsent.deny' })).toBeNull();
  });
});
