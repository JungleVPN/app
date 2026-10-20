import posthog from 'posthog-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockedPosthog = posthog as unknown as {
  init: ReturnType<typeof vi.fn>;
  capture: ReturnType<typeof vi.fn>;
  identify: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  opt_in_capturing: ReturnType<typeof vi.fn>;
  opt_out_capturing: ReturnType<typeof vi.fn>;
  get_explicit_consent_status: ReturnType<typeof vi.fn>;
  setPersonProperties: ReturnType<typeof vi.fn>;
  _isIdentified: ReturnType<typeof vi.fn>;
};

async function loadPosthogModule(hostname = 'localhost') {
  vi.resetModules();
  Object.defineProperty(window, 'location', {
    value: { hostname },
    writable: true,
    configurable: true,
  });
  return import('./posthog');
}

describe('posthog utils', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('when the token or host is not configured', () => {
    it('does not initialise posthog-js', async () => {
      vi.stubEnv('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN', '');
      vi.stubEnv('VITE_PUBLIC_POSTHOG_HOST', '');

      await loadPosthogModule();

      expect(mockedPosthog.init).not.toHaveBeenCalled();
    });

    it('phIdentifyGuestCheckout is a no-op', async () => {
      vi.stubEnv('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN', '');
      vi.stubEnv('VITE_PUBLIC_POSTHOG_HOST', '');
      const { phIdentifyGuestCheckout } = await loadPosthogModule();

      phIdentifyGuestCheckout('payer@example.com');

      expect(mockedPosthog.identify).not.toHaveBeenCalled();
    });

    it('phCapture, phIdentify and phReset are no-ops', async () => {
      vi.stubEnv('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN', '');
      vi.stubEnv('VITE_PUBLIC_POSTHOG_HOST', '');
      const { phCapture, phIdentify, phReset } = await loadPosthogModule();

      phCapture('some_event', { foo: 'bar' });
      phIdentify('user-1', { plan: 'pro' });
      phReset();

      expect(mockedPosthog.capture).not.toHaveBeenCalled();
      expect(mockedPosthog.identify).not.toHaveBeenCalled();
      expect(mockedPosthog.reset).not.toHaveBeenCalled();
    });

    it('phOptIn, phOptOut and phGrantImpliedConsent are no-ops, and consent is reported as granted', async () => {
      vi.stubEnv('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN', '');
      vi.stubEnv('VITE_PUBLIC_POSTHOG_HOST', '');
      mockedPosthog.get_explicit_consent_status.mockReturnValue('pending');
      const { phOptIn, phOptOut, phGrantImpliedConsent, phConsentStatus } =
        await loadPosthogModule();

      phOptIn();
      phOptOut();
      phGrantImpliedConsent();

      expect(mockedPosthog.opt_in_capturing).not.toHaveBeenCalled();
      expect(mockedPosthog.opt_out_capturing).not.toHaveBeenCalled();
      expect(phConsentStatus()).toBe('granted');
    });
  });

  // A dev site shares the PostHog project with production; with
  // PUBLIC_ANALYTICS_ENVIRONMENT=dev it sends nothing, not even pageviews.
  describe('in a dev environment (PUBLIC_ANALYTICS_ENVIRONMENT=dev)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.stubEnv('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN', 'phc_test_token');
      vi.stubEnv('VITE_PUBLIC_POSTHOG_HOST', 'https://eu.i.posthog.com');
      vi.stubEnv('PUBLIC_ANALYTICS_ENVIRONMENT', 'dev');
    });

    it('does not initialise posthog-js, even with a token and host', async () => {
      await loadPosthogModule('stage.jungle-vpn.com');

      expect(mockedPosthog.init).not.toHaveBeenCalled();
    });

    it('phCapture and phIdentify are no-ops', async () => {
      const { phCapture, phIdentify } = await loadPosthogModule('stage.jungle-vpn.com');

      phCapture('checkout_started', { payment_provider: 'whop' });
      phIdentify('846');

      expect(mockedPosthog.capture).not.toHaveBeenCalled();
      expect(mockedPosthog.identify).not.toHaveBeenCalled();
    });
  });

  describe('when both the token and host are configured', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN', 'phc_test_token');
      vi.stubEnv('VITE_PUBLIC_POSTHOG_HOST', 'https://eu.i.posthog.com');
    });

    it('initialises posthog-js once with the configured token/host', async () => {
      await loadPosthogModule();

      expect(mockedPosthog.init).toHaveBeenCalledWith(
        'phc_test_token',
        expect.objectContaining({ api_host: 'https://eu.i.posthog.com' }),
      );
    });

    it('initialises with cookieless_mode "on_reject" so capture stays anonymous until consent', async () => {
      await loadPosthogModule();

      expect(mockedPosthog.init).toHaveBeenCalledWith(
        'phc_test_token',
        expect.objectContaining({ cookieless_mode: 'on_reject' }),
      );
    });

    it('phCapture forwards the event and properties', async () => {
      const { phCapture } = await loadPosthogModule();

      phCapture('checkout_started', { payment_provider: 'stripe' });

      expect(mockedPosthog.capture).toHaveBeenCalledWith('checkout_started', {
        payment_provider: 'stripe',
      });
    });

    it('phIdentify forwards the distinct id and properties', async () => {
      const { phIdentify } = await loadPosthogModule();

      phIdentify('user-1', { attribution_platform: 'web' });

      expect(mockedPosthog.identify).toHaveBeenCalledWith('user-1', {
        attribution_platform: 'web',
      });
    });

    // A guest checkout has no account yet; the payment webhook creates one and
    // links `email:{address}` to it, so identifying the browser by that id ties
    // the visit (plan choice, checkout, replay) to the buyer.
    describe('phIdentifyGuestCheckout', () => {
      it('identifies an anonymous visitor by the email they check out with, as the backend keys it', async () => {
        mockedPosthog._isIdentified.mockReturnValue(false);
        const { phIdentifyGuestCheckout } = await loadPosthogModule();

        phIdentifyGuestCheckout('  Payer@Example.COM ');

        expect(mockedPosthog.identify).toHaveBeenCalledWith('email:payer@example.com');
      });

      it('leaves a visitor who is already identified as they are', async () => {
        mockedPosthog._isIdentified.mockReturnValue(true);
        const { phIdentifyGuestCheckout } = await loadPosthogModule();

        phIdentifyGuestCheckout('payer@example.com');

        expect(mockedPosthog.identify).not.toHaveBeenCalled();
      });
    });

    it('phReset resets the posthog session', async () => {
      const { phReset } = await loadPosthogModule();

      phReset();

      expect(mockedPosthog.reset).toHaveBeenCalled();
    });

    it('phOptIn calls posthog.opt_in_capturing', async () => {
      const { phOptIn } = await loadPosthogModule();

      phOptIn();

      expect(mockedPosthog.opt_in_capturing).toHaveBeenCalled();
    });

    it('phOptOut calls posthog.opt_out_capturing', async () => {
      const { phOptOut } = await loadPosthogModule();

      phOptOut();

      expect(mockedPosthog.opt_out_capturing).toHaveBeenCalled();
    });

    // The Telegram mini app shows no consent banner: opening it counts as
    // consent, so it opts in once instead of staying pending (which sends nothing).
    describe('phGrantImpliedConsent', () => {
      it('opts in a visitor whose consent is still pending', async () => {
        mockedPosthog.get_explicit_consent_status.mockReturnValue('pending');
        const { phGrantImpliedConsent } = await loadPosthogModule('app.thejungle.pro');

        phGrantImpliedConsent();

        expect(mockedPosthog.opt_in_capturing).toHaveBeenCalledTimes(1);
      });

      it.each([
        'granted',
        'denied',
      ])('leaves a visitor whose consent is %s as it is', async (status) => {
        mockedPosthog.get_explicit_consent_status.mockReturnValue(status);
        const { phGrantImpliedConsent } = await loadPosthogModule('app.thejungle.pro');

        phGrantImpliedConsent();

        expect(mockedPosthog.opt_in_capturing).not.toHaveBeenCalled();
      });
    });

    it('phConsentStatus forwards posthog.get_explicit_consent_status', async () => {
      mockedPosthog.get_explicit_consent_status.mockReturnValue('pending');
      const { phConsentStatus } = await loadPosthogModule();

      expect(phConsentStatus()).toBe('pending');
    });

    it.each([
      'jungle-vpn.com',
      'jungle.community',
      'thejungle.pro',
      'www.thejungle.pro',
      'web.thejungle.pro',
      'app.thejungle.pro',
    ])('does not tag %s as an internal/test user', async (hostname) => {
      await loadPosthogModule(hostname);

      expect(mockedPosthog.setPersonProperties).not.toHaveBeenCalled();
    });

    it.each([
      'localhost',
      'ru-web.development-env.uk',
      'eu-web.development-env.uk',
      'eu-stage-web.thejungle.pro',
      'ru-stage-web.thejungle.pro',
    ])('tags %s traffic as an internal/test user', async (hostname) => {
      await loadPosthogModule(hostname);

      expect(mockedPosthog.setPersonProperties).toHaveBeenCalledWith({
        $internal_or_test_user: true,
      });
    });
  });
});
