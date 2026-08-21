import { Button, Dropdown, Label } from '@heroui/react';
import type { TSubscriptionPageLanguageCode } from '@remnawave/subscription-page-types';
import { IconWorld } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useRemnawaveApi } from '../../api';
import { useAuthStore, usePlatformStore, useSubscriptionConfigStoreActions } from '../../stores';
import { isRuDomain } from '../../utils';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const { platformType } = usePlatformStore();
  const { setLanguage } = useSubscriptionConfigStoreActions();
  const remnawaveApi = useRemnawaveApi();
  const rmnUser = useAuthStore((s) => s.rmnUser);

  const isRu = isRuDomain();

  const handleLanguageChange = async (newLocale: string) => {
    await i18n.changeLanguage(newLocale);
    setLanguage(newLocale as TSubscriptionPageLanguageCode);
    if (rmnUser?.uuid) {
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
          {isRu ||
            (platformType === 'telegram' && (
              <Dropdown.Item id='ru' textValue={t('languages.nativeRu')}>
                <Label>{t('languages.nativeRu')}</Label>
              </Dropdown.Item>
            ))}
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
