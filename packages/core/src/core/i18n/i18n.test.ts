import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Reproduces the reported bug: a Russian-locale browser visiting the global domain
 * saw English from SSR and then flipped to Russian once i18next's detector ran.
 */
async function bootI18n({ hostname, language }: { hostname: string; language: string }) {
  vi.stubEnv('PUBLIC_DOMAIN_RU', 'jungle.community,thejungle.pro');
  vi.stubEnv('PUBLIC_DOMAIN_EU', 'jungle-vpn.com');
  Object.defineProperty(window, 'location', {
    value: { hostname },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(navigator, 'language', { value: language, configurable: true });
  Object.defineProperty(navigator, 'languages', { value: [language], configurable: true });

  vi.resetModules();
  const { default: i18n } = await import('./i18n');
  await vi.waitFor(() => expect(i18n.isInitialized).toBe(true));
  return i18n;
}

describe('language resolution per domain', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps the global domain in English for a Russian browser', async () => {
    const i18n = await bootI18n({ hostname: 'jungle-vpn.com', language: 'ru-RU' });
    expect(i18n.resolvedLanguage).toBe('en');
  });

  it('ignores a stale Russian choice cached on the global domain', async () => {
    localStorage.setItem('i18nextLng', 'ru');
    const i18n = await bootI18n({ hostname: 'jungle-vpn.com', language: 'en-GB' });
    expect(i18n.resolvedLanguage).toBe('en');
  });

  it('serves Russian on the RU domain for an English browser', async () => {
    const i18n = await bootI18n({ hostname: 'www.thejungle.pro', language: 'en-GB' });
    expect(i18n.resolvedLanguage).toBe('ru');
  });

  it('leaves the Mini App host unrestricted', async () => {
    const i18n = await bootI18n({ hostname: 'app.thejungle.pro', language: 'ru-RU' });
    expect(i18n.resolvedLanguage).toBe('ru');
  });
});
