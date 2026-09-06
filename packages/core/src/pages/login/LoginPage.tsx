import { Alert, Button, Form, Input, Label, Spinner, Surface, TextField } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';
import { FeaturesCard } from '../../components';
import { useAuthStore } from '../../stores';
import { Block, Container } from '../../ui';
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

  return (
    <Container maxWidth={'sm'} className='mt-24 w-full flex flex-col gap-3'>
      <Surface variant='transparent'>
        <Block className={'p-4'}>
          <h1 className={`text-center text-xl font-semibold ${css.title}`}>{t('login.title')}</h1>

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
                {({ isPending }) => (
                  <>
                    {isPending ? <Spinner color='current' size='sm' /> : null}
                    {t('login.submit')}
                  </>
                )}
              </Button>
            </Form>
          </div>
        </Block>
      </Surface>

      <div className={'mt-4'}>
        <FeaturesCard
          title={t('common.features.title')}
          badge={t('getSubscription.discount')}
          description={t('login.trial_card_description')}
        />
      </div>
    </Container>
  );
}
