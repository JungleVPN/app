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

    it('phOptIn and phOptOut are no-ops, and consent is reported as granted', async () => {
      vi.stubEnv('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN', '');
      vi.stubEnv('VITE_PUBLIC_POSTHOG_HOST', '');
      const { phOptIn, phOptOut, phConsentStatus } = await loadPosthogModule();

      phOptIn();
      phOptOut();

      expect(mockedPosthog.opt_in_capturing).not.toHaveBeenCalled();
      expect(mockedPosthog.opt_out_capturing).not.toHaveBeenCalled();
      expect(phConsentStatus()).toBe('granted');
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

    it('phConsentStatus forwards posthog.get_explicit_consent_status', async () => {
      mockedPosthog.get_explicit_consent_status.mockReturnValue('pending');
      const { phConsentStatus } = await loadPosthogModule();

      expect(phConsentStatus()).toBe('pending');
    });

    it.each(['jungle-vpn.com', 'jungle.community'])(
      'does not tag %s as an internal/test user',
      async (hostname) => {
        await loadPosthogModule(hostname);

        expect(mockedPosthog.setPersonProperties).not.toHaveBeenCalled();
      },
    );

    it.each([
      'localhost',
      'ru-web.development-env.uk',
      'eu-web.development-env.uk',
      'thejungle.pro',
      'www.thejungle.pro',
      'web.thejungle.pro',
      'app.thejungle.pro',
    ])('tags %s traffic as an internal/test user', async (hostname) => {
      await loadPosthogModule(hostname);

      expect(mockedPosthog.setPersonProperties).toHaveBeenCalledWith({
        $internal_or_test_user: true,
      });
    });
  });
});
