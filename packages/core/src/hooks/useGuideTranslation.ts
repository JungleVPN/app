import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentLang } from '../stores';

/**
 * Subscription-page copy lives in the i18n locale files. The panel config only
 * supplies structure (apps, links, icons); its text is the fallback for content
 * the locale files don't cover yet, shown in the panel language closest to the
 * active i18n language.
 */
export const useGuideTranslation = () => {
  const { t, i18n } = useTranslation();
  const panelLang = useCurrentLang();

  const translate = useCallback(
    (key: string, fallback: string) => t(key, { defaultValue: fallback }),
    [t],
  );

  return {
    panelLang,
    translate,
    lang: i18n.resolvedLanguage ?? i18n.language,
  };
};
