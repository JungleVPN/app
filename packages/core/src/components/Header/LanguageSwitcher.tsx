import { Button, Dropdown, Label } from '@heroui/react';
import type { TSubscriptionPageLanguageCode } from '@remnawave/subscription-page-types';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { useRemnawaveApi } from '../../api';
import { useAuthStore, usePlatformStore, useSubscriptionConfigStoreActions } from '../../stores';
import { isRuDomain } from '../../utils';

const LANDING_DOMAINS: Record<string, string | undefined> = {
  ru: import.meta.env.PUBLIC_DOMAIN_RU ? `https://${import.meta.env.PUBLIC_DOMAIN_RU}` : undefined,
  en: import.meta.env.PUBLIC_DOMAIN_EU ? `https://${import.meta.env.PUBLIC_DOMAIN_EU}` : undefined,
  ar: import.meta.env.PUBLIC_DOMAIN_AR ? `https://${import.meta.env.PUBLIC_DOMAIN_AR}` : undefined,
};

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const { setLanguage } = useSubscriptionConfigStoreActions();
  const remnawaveApi = useRemnawaveApi();
  const rmnUser = useAuthStore((s) => s.rmnUser);
  const { pathname } = useLocation();
  const { platformType } = usePlatformStore();

  const handleLanguageChange = async (newLocale: string) => {
    const isLanding = pathname === '/';
    const targetDomain = LANDING_DOMAINS[newLocale];

    if (isLanding && platformType === 'web' && targetDomain) {
      window.location.href = targetDomain;
      return;
    }

    await i18n.changeLanguage(newLocale);
    setLanguage(newLocale as TSubscriptionPageLanguageCode);
    if (rmnUser?.uuid) {
      await remnawaveApi.upsertMyMetadata({ lang: newLocale });
    }
  };

  const LANGUAGE_LABELS: Record<string, string> = {
    ru: 'RU',
    en: 'EN',
    ar: 'AR',
  };

  const displayCode = LANGUAGE_LABELS[i18n.language] ?? i18n.language?.split('-')[0].toUpperCase();

  return (
    <Dropdown>
      <Button className='min-w-10 uppercase' variant='tertiary' size='md'>
        {displayCode}
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu
          onAction={(key) => {
            handleLanguageChange(String(key));
          }}
        >
          {isRuDomain() && (
            <Dropdown.Item id='ru' textValue={t('languages.nativeRu')}>
              <Label>{t('languages.nativeRu')}</Label>
            </Dropdown.Item>
          )}
          <Dropdown.Item id='en' textValue={t('languages.nativeEn')}>
            <Label>{t('languages.nativeEn')}</Label>
          </Dropdown.Item>
          <Dropdown.Item id='ar' textValue={t('languages.nativeAr')}>
            <Label>{t('languages.nativeAr')}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
