/**
 * Shared i18next bootstrap for web and TMA. Translations are bundled (not fetched from
 * `/locales/…`) so Mini Apps and non-root deploy paths always resolve strings.
 */
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

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

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // htmlTag excluded: index.html ships a static lang="en" attribute, which would
      // win over a previously cached/selected language on every reload.
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

i18n.on('languageChanged', syncDocumentDirection);
if (i18n.language) syncDocumentDirection(i18n.language);

/**
 * Applies a language from user metadata if it is supported.
 * Mirrors the bot's localeNegotiator: metadata lang takes priority over the
 * device-level localStorage/navigator detection that runs at cold start.
 */
export function applyUserLang(lang: string): void {
  if ((SUPPORTED_LOCALES as readonly string[]).includes(lang)) {
    i18n.changeLanguage(lang);
  }
}

export default i18n;
