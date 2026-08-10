import { Surface } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { ErrorConnection } from '../../ErrorConnection/ErrorConnection';

const ERROR_I18N_KEYS: Record<string, string> = {
  ERR_FATCH_USER: 'main.page.component.ERR_FATCH_USER',
  ERR_GET_SUB_LINK: 'main.page.component.ERR_GET_SUB_LINK',
  ERR_PARSE_APPCONFIG: 'main.page.component.ERR_PARSE_APPCONFIG',
};

interface ErrorViewProps {
  errorCode: string;
}

export function ErrorView({ errorCode }: ErrorViewProps) {
  const { t } = useTranslation();
  const i18nKey = ERROR_I18N_KEYS[errorCode];
  const message = i18nKey ? t(i18nKey) : `${t('errors.unknown')} (${errorCode})`;

  return (
    <Surface className='my-8 max-w-4xl p-4' variant='transparent'>
      <Surface className='flex flex-col items-center gap-8' variant='transparent'>
        <h2 className='text-center text-lg font-semibold text-foreground'>{message}</h2>
        <ErrorConnection />
      </Surface>
    </Surface>
  );
}
