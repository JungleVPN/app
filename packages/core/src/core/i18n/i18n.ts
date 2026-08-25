/**
 * Shared i18next bootstrap for web and TMA. Translations are bundled (not fetched from
 * `/locales/…`) so Mini Apps and non-root deploy paths always resolve strings.
 */
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { configuredDomains, isRuDomain, localePolicyForHost } from '../../utils';
import ar from './locales/ar.json';
import en from './locales/en.json';
import ru from './locales/ru.json';

export const DEFAULT_LOCALE = import.meta.env.PUBLIC_DEFAULT_LOCALE || 'en';
export const SUPPORTED_LOCALES = ['ru', 'en', 'ar', 'fa'] as const;

/** zh/fa reuse English until dedicated files exist */
const resources = {
  ru: { translation: ru },
  en: { translation: en },
  ar: { translation: ar },
  fa: { translation: ar },
} as const;

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

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: allowedLocales?.[0] ?? DEFAULT_LOCALE,
    supportedLngs: activeLocales,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // htmlTag excluded: index.html ships a static lang="en" attribute, which would
      // win over a previously cached/selected language on every reload.
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })
  .then(() => {
    // The RU domain is Russian-only: it must always render in Russian, regardless
    // of what device detection or a previously cached selection landed on.
    if (isRuDomain()) i18n.changeLanguage('ru');
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
  const target = isRuDomain() ? 'ru' : lang;
  if (isLocaleAllowed(target)) {
    i18n.changeLanguage(target);
  }
}

export default i18n;
