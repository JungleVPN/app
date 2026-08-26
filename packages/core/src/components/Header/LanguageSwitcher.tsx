import { Button, Dropdown, Label } from '@heroui/react';
import type { TSubscriptionPageLanguageCode } from '@remnawave/subscription-page-types';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { useRemnawaveApi } from '../../api';
import { isLocaleAllowed } from '../../core/i18n';
import { useNavigation } from '../../hooks';
import { useAuthStore, useSubscriptionConfigStoreActions } from '../../stores';
import { isLandingPath } from '../../utils';

const LANGUAGE_FLAGS: Record<string, string> = {
  ar: '🇦🇪',
  en: '🇬🇧',
};

/** `en` has no prefix (`/`), every other supported language routes as `/<lang>`. */
function pathForLocale(locale: string): string {
  return locale === 'en' ? '/' : `/${locale}`;
}

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const { setLanguage } = useSubscriptionConfigStoreActions();
  const remnawaveApi = useRemnawaveApi();
  const rmnUser = useAuthStore((s) => s.rmnUser);
  const location = useLocation();
  const navigate = useNavigation();

  const handleLanguageChange = async (newLocale: string) => {
    await i18n.changeLanguage(newLocale);
    setLanguage(newLocale as TSubscriptionPageLanguageCode);
    if (rmnUser?.id) {
      await remnawaveApi.upsertMyMetadata({ lang: newLocale });
    }
    // Only the landing page is mirrored in the URL (/, /en, /ar) — elsewhere the
    // language switch stays purely client-side and the path is left alone.
    if (isLandingPath(location.pathname)) {
      navigate(pathForLocale(newLocale), { replace: true });
    }
  };

  return (
    <Dropdown>
      <Button className='min-w-10 text-lg p-0 uppercase' variant='tertiary' size='md'>
        <span aria-hidden='true'>{LANGUAGE_FLAGS[i18n.language] ?? LANGUAGE_FLAGS.en}</span>
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu
          onAction={(key) => {
            handleLanguageChange(String(key));
          }}
        >
          {isLocaleAllowed('en') && (
            <Dropdown.Item id='en' textValue={t('languages.nativeEn')}>
              <span aria-hidden='true'>{LANGUAGE_FLAGS.en}</span>
              <Label>{t('languages.nativeEn')}</Label>
            </Dropdown.Item>
          )}
          {isLocaleAllowed('ar') && (
            <Dropdown.Item id='ar' textValue={t('languages.nativeAr')}>
              <span aria-hidden='true'>{LANGUAGE_FLAGS.ar}</span>
              <Label>{t('languages.nativeAr')}</Label>
            </Dropdown.Item>
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
