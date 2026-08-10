import { Alert, Button, Chip, Form, Input, Label, Surface, TextField } from '@heroui/react';
import { IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';
import { useAuthStore } from '../../stores';
import { Block } from '../../ui';
import css from './login.module.css';
import { useLogin } from './useLogin';

export default function LoginPage() {
  const { t } = useTranslation();
  const { email, setEmail, loading, error, message, handleSubmit } = useLogin();
  const authUser = useAuthStore((state) => state.authUser);
  const authLoading = useAuthStore((state) => state.loading);

  if (!authLoading && authUser) {
    return <Navigate to='/profile/subscription' replace />;
  }

  const features = [
    t('getSubscription.feature_devices'),
    t('getSubscription.feature_traffic'),
    t('getSubscription.feature_support'),
  ];

  return (
    <div className='mt-24 max-w-sm flex flex-col gap-3'>
      <Surface variant='transparent'>
        <Block className={'p-4'}>
          <h1 className={`text-center text-2xl font-semibold ${css.title}`}>{t('login.title')}</h1>

          <div className='mt-2 flex flex-col gap-4'>
            {(message || error) && (
              <Alert status={message?.includes('Check email') ? 'success' : 'danger'}>
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{error || message}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            <Form className='flex flex-col gap-4' onSubmit={(e) => void handleSubmit(e)}>
              <TextField isRequired name='email' type='email'>
                <Label>{t('login.email_label')}</Label>
                <Input
                  className={css.input}
                  placeholder={t('login.email_placeholder')}
                  value={email}
                  variant='secondary'
                  onChange={(e) => setEmail(e.target.value)}
                />
              </TextField>
              <Button fullWidth isPending={loading} type='submit'>
                {t('login.submit')}
              </Button>
            </Form>
          </div>
        </Block>
      </Surface>

      <Block className={'p-4'} description={t('login.trial_card_description')}>
        <div className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1'>
            <Chip color='success' size='sm' className={'w-fit'} variant='soft'>
              <Chip.Label>{t('getSubscription.discount')}</Chip.Label>
            </Chip>
            <p className='text-sm font-medium'>{t('login.trial_card_title')}</p>
          </div>
          <div className='flex flex-col gap-2'>
            {features.map((feature) => (
              <div key={feature} className='flex items-center gap-2'>
                <div className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full'>
                  <IconCheck size={12} stroke={3} />
                </div>
                <p className='text-sm '>{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </Block>
    </div>
  );
}
