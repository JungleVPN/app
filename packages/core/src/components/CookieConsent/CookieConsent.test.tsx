import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieConsent } from './CookieConsent';

const { phConsentStatus, phOptIn, phOptOut, updateAdsConsent } = vi.hoisted(() => ({
  phConsentStatus: vi.fn(),
  phOptIn: vi.fn(),
  phOptOut: vi.fn(),
  updateAdsConsent: vi.fn(),
}));

vi.mock('../../utils', () => ({ phConsentStatus, phOptIn, phOptOut, updateAdsConsent }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

vi.mock('../../assets/Logo_dark.svg?react', () => ({
  default: () => <svg aria-hidden />,
}));

describe('CookieConsent', () => {
  beforeEach(() => {
    phConsentStatus.mockReturnValue('pending');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('grants ads consent when Accept is pressed', () => {
    render(<CookieConsent />);

    fireEvent.click(screen.getByRole('button', { name: 'cookieConsent.accept' }));

    expect(updateAdsConsent).toHaveBeenCalledWith({ granted: true });
  });

  it('denies ads consent when Deny is pressed', () => {
    render(<CookieConsent />);

    fireEvent.click(screen.getByRole('button', { name: 'cookieConsent.deny' }));

    expect(updateAdsConsent).toHaveBeenCalledWith({ granted: false });
  });

  it('re-applies an earlier grant on a later visit, without showing the banner', () => {
    phConsentStatus.mockReturnValue('granted');

    render(<CookieConsent />);

    expect(updateAdsConsent).toHaveBeenCalledWith({ granted: true });
  });

  it('applies nothing while consent is still pending', () => {
    render(<CookieConsent />);

    expect(updateAdsConsent).not.toHaveBeenCalled();
  });

  it('shows the banner while consent is pending', () => {
    render(<CookieConsent />);

    expect(screen.getByRole('button', { name: 'cookieConsent.accept' })).toBeDefined();
  });

  it('stays hidden when consent was already granted', () => {
    phConsentStatus.mockReturnValue('granted');

    render(<CookieConsent />);

    expect(screen.queryByRole('button', { name: 'cookieConsent.accept' })).toBeNull();
  });

  it('stays hidden when consent was already denied', () => {
    phConsentStatus.mockReturnValue('denied');

    render(<CookieConsent />);

    expect(screen.queryByRole('button', { name: 'cookieConsent.accept' })).toBeNull();
  });

  it('opts in to full tracking and hides the banner when Accept is pressed', () => {
    render(<CookieConsent />);

    fireEvent.click(screen.getByRole('button', { name: 'cookieConsent.accept' }));

    expect(phOptIn).toHaveBeenCalled();
    expect(phOptOut).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'cookieConsent.accept' })).toBeNull();
  });

  it('opts out of full tracking and hides the banner when Deny is pressed', () => {
    render(<CookieConsent />);

    fireEvent.click(screen.getByRole('button', { name: 'cookieConsent.deny' }));

    expect(phOptOut).toHaveBeenCalled();
    expect(phOptIn).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'cookieConsent.deny' })).toBeNull();
  });
});
