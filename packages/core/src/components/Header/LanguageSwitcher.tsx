import { Button, Dropdown, Label } from '@heroui/react';
import type { TSubscriptionPageLanguageCode } from '@remnawave/subscription-page-types';
import { IconWorld } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useRemnawaveApi } from '../../api';
import { isLocaleAllowed } from '../../core/i18n';
import { useAuthStore, useSubscriptionConfigStoreActions } from '../../stores';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const { setLanguage } = useSubscriptionConfigStoreActions();
  const remnawaveApi = useRemnawaveApi();
  const rmnUser = useAuthStore((s) => s.rmnUser);

  const handleLanguageChange = async (newLocale: string) => {
    await i18n.changeLanguage(newLocale);
    setLanguage(newLocale as TSubscriptionPageLanguageCode);
    if (rmnUser?.id) {
      await remnawaveApi.upsertMyMetadata({ lang: newLocale });
    }
  };

  return (
    <Dropdown>
      <Button className='min-w-10 uppercase' variant='tertiary' size='md'>
        <IconWorld stroke={1.5} />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu
          onAction={(key) => {
            handleLanguageChange(String(key));
          }}
        >
          {isLocaleAllowed('ru') && (
            <Dropdown.Item id='ru' textValue={t('languages.nativeRu')}>
              <Label>{t('languages.nativeRu')}</Label>
            </Dropdown.Item>
          )}
          {isLocaleAllowed('en') && (
            <Dropdown.Item id='en' textValue={t('languages.nativeEn')}>
              <Label>{t('languages.nativeEn')}</Label>
            </Dropdown.Item>
          )}
          {isLocaleAllowed('ar') && (
            <Dropdown.Item id='ar' textValue={t('languages.nativeAr')}>
              <Label>{t('languages.nativeAr')}</Label>
            </Dropdown.Item>
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
