import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Reproduces the reported bug: a Russian-locale browser visiting the global domain
 * saw English from SSR and then flipped to Russian once i18next's detector ran.
 */
async function bootI18n({
  hostname,
  language,
  pathname = '/',
}: {
  hostname: string;
  language: string;
  pathname?: string;
}) {
  vi.stubEnv('PUBLIC_DOMAIN_RU', 'jungle.community,thejungle.pro');
  vi.stubEnv('PUBLIC_DOMAIN_GLOBAL', 'jungle-vpn.com');
  Object.defineProperty(window, 'location', {
    value: { hostname, pathname },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(navigator, 'language', { value: language, configurable: true });
  Object.defineProperty(navigator, 'languages', { value: [language], configurable: true });

  vi.resetModules();
  const { default: i18n, i18nReady } = await import('../i18n');
  await i18nReady;
  return i18n;
}

async function bootI18nWithReadiness(options: Parameters<typeof bootI18n>[0]) {
  await bootI18n(options);
  return import('../i18n');
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

describe('global domain path routing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('serves English at the root path when the browser has no preference for an allowed language', async () => {
    const i18n = await bootI18n({ hostname: 'jungle-vpn.com', language: 'fr-FR', pathname: '/' });
    expect(i18n.resolvedLanguage).toBe('en');
  });

  it('serves English on the /en path even when the browser prefers Arabic', async () => {
    const i18n = await bootI18n({ hostname: 'jungle-vpn.com', language: 'ar', pathname: '/en' });
    expect(i18n.resolvedLanguage).toBe('en');
  });

  it('serves Arabic on the /ar path', async () => {
    const i18n = await bootI18n({ hostname: 'jungle-vpn.com', language: 'en-GB', pathname: '/ar' });
    expect(i18n.resolvedLanguage).toBe('ar');
  });

  it('serves Turkish on the /tr path', async () => {
    const i18n = await bootI18n({ hostname: 'jungle-vpn.com', language: 'en-GB', pathname: '/tr' });
    expect(i18n.resolvedLanguage).toBe('tr');
  });

  it('serves Indonesian on the /id path', async () => {
    const i18n = await bootI18n({ hostname: 'jungle-vpn.com', language: 'en-GB', pathname: '/id' });
    expect(i18n.resolvedLanguage).toBe('id');
  });

  it('serves Hindi on the /hi path', async () => {
    const i18n = await bootI18n({ hostname: 'jungle-vpn.com', language: 'en-GB', pathname: '/hi' });
    expect(i18n.resolvedLanguage).toBe('hi');
  });

  it('serves Portuguese on the /pt path', async () => {
    const i18n = await bootI18n({ hostname: 'jungle-vpn.com', language: 'en-GB', pathname: '/pt' });
    expect(i18n.resolvedLanguage).toBe('pt');
  });

  it('serves Spanish on the /es path', async () => {
    const i18n = await bootI18n({ hostname: 'jungle-vpn.com', language: 'en-GB', pathname: '/es' });
    expect(i18n.resolvedLanguage).toBe('es');
  });

  it('lets the URL path win over a previously cached choice', async () => {
    localStorage.setItem('i18nextLng', 'en');
    const i18n = await bootI18n({ hostname: 'jungle-vpn.com', language: 'en-GB', pathname: '/ar' });
    expect(i18n.resolvedLanguage).toBe('ar');
  });

  it('still forces Russian on the RU domain regardless of the path', async () => {
    const i18n = await bootI18n({
      hostname: 'www.thejungle.pro',
      language: 'en-GB',
      pathname: '/ar',
    });
    expect(i18n.resolvedLanguage).toBe('ru');
  });

  it('applies path routing on unrestricted hosts too (e.g. localhost during development)', async () => {
    const i18n = await bootI18n({ hostname: 'localhost', language: 'en-GB', pathname: '/ar' });
    expect(i18n.resolvedLanguage).toBe('ar');
  });
});

describe('on-demand locale loading', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('downloads only the active language on the global domain', async () => {
    const { default: i18n, i18nReady } = await bootI18nWithReadiness({
      hostname: 'jungle-vpn.com',
      language: 'en-GB',
      pathname: '/ar',
    });
    await i18nReady;

    expect(i18n.hasResourceBundle('ar', 'translation')).toBe(true);
    expect(i18n.hasResourceBundle('ru', 'translation')).toBe(false);
    expect(i18n.hasResourceBundle('tr', 'translation')).toBe(false);
  });

  it('has the active language translated by the time readiness resolves', async () => {
    const { default: i18n, i18nReady } = await bootI18nWithReadiness({
      hostname: 'www.thejungle.pro',
      language: 'en-GB',
    });
    await i18nReady;

    expect(i18n.t('landing.bento.subtitle')).not.toBe('landing.bento.subtitle');
    expect(i18n.hasResourceBundle('ru', 'translation')).toBe(true);
  });

  it('loads a language the first time it is switched to', async () => {
    const { default: i18n, i18nReady } = await bootI18nWithReadiness({
      hostname: 'localhost',
      language: 'en-GB',
    });
    await i18nReady;
    expect(i18n.hasResourceBundle('es', 'translation')).toBe(false);

    await i18n.changeLanguage('es');

    expect(i18n.hasResourceBundle('es', 'translation')).toBe(true);
    expect(i18n.resolvedLanguage).toBe('es');
  });

  it('serves Persian from the Arabic translations', async () => {
    const { default: i18n, i18nReady } = await bootI18nWithReadiness({
      hostname: 'localhost',
      language: 'en-GB',
    });
    await i18nReady;

    await i18n.changeLanguage('fa');

    const { default: arabic } = await import('../locales/ar.json');
    expect(i18n.t('landing.bento.subtitle')).toBe(arabic.landing.bento.subtitle);
  });
});
