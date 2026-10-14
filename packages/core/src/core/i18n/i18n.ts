/**
 * Shared i18next bootstrap for web and TMA. Translations are bundled as one lazily imported
 * chunk per language (not fetched from `/locales/…`) so Mini Apps and non-root deploy paths
 * always resolve strings, while visitors only download the language they use.
 */
import i18n, { type BackendModule } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { configuredDomains, currentScope, localePolicyForHost } from '../../utils';
export const DEFAULT_LOCALE = import.meta.env.PUBLIC_DEFAULT_LOCALE || 'en';
export const SUPPORTED_LOCALES = ['ru', 'en', 'ar', 'tr', 'id', 'hi', 'pt', 'es', 'ur', 'fa'] as const;

/** Persian reuses Arabic until a dedicated translation file exists. */
const localeLoaders: Record<(typeof SUPPORTED_LOCALES)[number], () => Promise<{ default: object }>> = {
  ru: () => import('./locales/ru.json'),
  en: () => import('./locales/en.json'),
  ar: () => import('./locales/ar.json'),
  tr: () => import('./locales/tr.json'),
  id: () => import('./locales/id.json'),
  hi: () => import('./locales/hi.json'),
  pt: () => import('./locales/pt.json'),
  es: () => import('./locales/es.json'),
  ur: () => import('./locales/ur.json'),
  fa: () => import('./locales/ar.json'),
};

const isSupportedLocale = (lang: string): lang is keyof typeof localeLoaders => lang in localeLoaders;

/** Each language ships as its own chunk, fetched the first time i18next asks for it. */
const localeBackend: BackendModule = {
  type: 'backend',
  init: () => {},
  read(language, _namespace, callback) {
    if (!isSupportedLocale(language)) {
      callback(null, {});
      return;
    }
    localeLoaders[language]().then(
      (module) => callback(null, module.default),
      (error) => callback(error, null),
    );
  },
};

/** RTL-ness of a language tag, e.g. `ar-EG` -> `rtl`. Backed by i18next's built-in language table. */
export function getDirection(lang: string): 'rtl' | 'ltr' {
  return i18n.dir(lang);
}

/** Keeps <html dir>/<html lang> in sync with the active i18next language. No-op during SSR. */
function syncDocumentDirection(lang: string): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const dir = getDirection(lang);
  if (html.dir !== dir) html.dir = dir;
  if (html.lang !== lang) html.lang = lang;
}

/**
 * Languages this host may serve. Detection (localStorage, then navigator) is otherwise
 * free to pick any supported language, which is how a ru-RU browser ended up seeing
 * Russian on the global domain a few ms after SSR had rendered English.
 * `null` on the Mini App and previews, where every language stays available.
 */
const allowedLocales =
  typeof window === 'undefined'
    ? null
    : localePolicyForHost(window.location.hostname, configuredDomains());

const activeLocales = allowedLocales ?? [...SUPPORTED_LOCALES];

/** Anything the host disallows falls back to the host's own first language. */
export function isLocaleAllowed(lang: string): boolean {
  return activeLocales.includes(lang);
}

/** Resolves once the detected language (and its fallback) are loaded and ready to render. */
export const i18nReady = i18n
  .use(localeBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    react: { useSuspense: false },
    fallbackLng: allowedLocales?.[0] ?? DEFAULT_LOCALE,
    supportedLngs: activeLocales,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // htmlTag excluded: index.html ships a static lang="en" attribute, which would
      // win over a previously cached/selected language on every reload.
      // path goes first everywhere: global-language routes select the language explicitly and
      // should win over a stale cached choice. It only ever matches a segment that's
      // in supportedLngs, so RU-only hosts (locked below anyway) and hosts without
      // a global-language path are unaffected.
      order: ['path', 'localStorage', 'navigator'],
      lookupFromPathIndex: 0,
      caches: ['localStorage'],
    },
  })
  .then(async () => {
    // The RU domain is Russian-only: it must always render in Russian, regardless
    // of what device detection or a previously cached selection landed on.
    if (currentScope() === 'ru') await i18n.changeLanguage('ru');
  });

i18n.on('languageChanged', syncDocumentDirection);
if (i18n.language) syncDocumentDirection(i18n.language);

/**
 * Applies a language from user metadata if it is supported.
 * Mirrors the bot's localeNegotiator: metadata lang takes priority over the
 * device-level localStorage/navigator detection that runs at cold start.
 * The RU domain overrides even a stored preference — it is Russian-only.
 */
export function applyUserLang(lang: string): void {
  const target = currentScope() === 'ru' ? 'ru' : lang;
  if (isLocaleAllowed(target)) {
    i18n.changeLanguage(target);
  }
}

export default i18n;
