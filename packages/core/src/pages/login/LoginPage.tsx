import { Alert, Button, Form, Input, Label, Surface, TextField } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Block } from '../../ui';
import css from './login.module.css';
import { useLogin } from './useLogin';

export default function LoginPage() {
  const { t } = useTranslation();
  const { email, setEmail, loading, error, message, handleSubmit } = useLogin();

  return (
    <Surface className='mx-auto mt-24 max-w-sm' variant='transparent'>
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
  );
}
