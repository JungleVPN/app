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
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

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
