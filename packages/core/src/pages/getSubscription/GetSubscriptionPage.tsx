import { Button, Chip, Description, FieldError, Form, Input, TextField } from '@heroui/react';
import { IconArrowRight, IconCheck, IconMail } from '@tabler/icons-react';
import { backButton } from '@tma.js/sdk-react';
import { type SyntheticEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useRemnawaveApi } from '../../api';
import { coreEnv } from '../../env';
import { useAppRoutes } from '../../runtime';
import { useAuthStoreActions, useAuthStoreInfo, usePlatformStore } from '../../stores';
import { Block } from '../../ui';
import { initUser, validateEmail } from '../../utils';
import styles from './getSubscription.module.css';

export default function GetSubscriptionPage() {
  const { allowedAmounts } = coreEnv;
  const { profileSubscriptionPath } = useAppRoutes();
  const remnawaveApi = useRemnawaveApi();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const { authUser, rmnUser, tgUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();
  const { platformType } = usePlatformStore();

  // Redirect away from the setup page if the user is already resolved —
  // covers both the web flow (authUser + rmnUser) and the TMA flow (tgUser + rmnUser).
  useEffect(() => {
    if (rmnUser && (authUser || tgUser)) navigate(profileSubscriptionPath);
    if (platformType === 'telegram') {
      backButton.hide();
    }
  }, [authUser, tgUser, rmnUser, navigate, profileSubscriptionPath, platformType]);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    setError('');
    setHasError(false);

    if (!email.trim()) {
      setError(t('getSubscription.error_empty_email'));
      setHasError(true);
      return;
    }

    if (!validateEmail(email)) {
      setError(t('getSubscription.error_invalid_email'));
      setHasError(true);
      return;
    }

    setIsLoading(true);
    try {
      if (tgUser) {
        // TMA flow — look up by email, link the Telegram identity, then land on the portal.
        //
        // If an account exists (e.g. a web user who already signed up): attach this telegramId
        // so future logins resolve via Telegram without asking for email again.
        //
        // If no account exists yet: create one with both email and telegramId so the user
        // can access their subscription from both Telegram and the web.
        const telegramId = Number(tgUser.id);
        const existingUser = await initUser(remnawaveApi, { email, telegramId });

        if (existingUser) {
          const linked = await remnawaveApi.updateUser({
            uuid: existingUser.uuid,
            telegramId,
            email,
          });
          setRmnUser(linked ?? null);
        } else {
          const newUser = await remnawaveApi.createUser({ email, telegramId });
          setRmnUser(newUser ?? null);
        }
        navigate(profileSubscriptionPath);
      } else {
        // Web flow — look up or create by email, then navigate to the public subscription page.
        const existingUser = await initUser(remnawaveApi, { email });
        if (existingUser) {
          navigate(`/subscription/${existingUser.shortUuid}`);
          return;
        }
        const newUser = await remnawaveApi.createUser({ email });
        navigate(`/subscription/${newUser?.shortUuid}`);
      }
    } catch {
      setError(t('getSubscription.error_failed_to_create'));
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    t('getSubscription.feature_devices'),
    t('getSubscription.feature_traffic'),
    t('getSubscription.feature_support'),
  ];

  return (
    <Form className={styles.form}>
      <div className='mx-auto flex max-w-5xl flex-col gap-3'>
        <div className='flex flex-col gap-2'>
          <p className='text-base font-medium text-foreground ml-4'>
            {t('getSubscription.enter_email')}
          </p>
          <TextField isInvalid={hasError} isRequired name='email' id={'email'} type='email'>
            <div className='relative w-full'>
              <span className={styles.inputIcon}>
                <IconMail size={20} stroke={1.5} />
              </span>
              <Input
                autoComplete='email'
                className={styles.input}
                placeholder={t('getSubscription.email_placeholder')}
                value={email}
                variant='secondary'
                onChange={(v) => {
                  setEmail(v.target.value);
                  if (error) {
                    setHasError(false);
                    setError('');
                  }
                }}
              />
            </div>

            {hasError ? (
              <FieldError>{error}</FieldError>
            ) : (
              <Description className={'ml-4'}>{t('getSubscription.email_description')}</Description>
            )}
          </TextField>
        </div>

        <Block className={'p-4'}>
          <div className={styles.orderSummary}>
            <p className={styles.summaryTitle}>{t('getSubscription.order_summary')}</p>

            <div className={styles.itemRow}>
              <div className={styles.itemLabel}>
                <div className='flex flex-col gap-0.5'>
                  <p className={styles.itemName}>{t('getSubscription.item_name')}</p>
                  <Chip color='accent' size='sm' className={'w-fit'} variant='soft'>
                    <Chip.Label>{t('getSubscription.discount')}</Chip.Label>
                  </Chip>
                </div>
              </div>
              <div className={styles.priceColumn}>
                <p className={styles.currentPrice}>0 ₽</p>
                <p className={styles.oldPrice}>{allowedAmounts} ₽</p>
              </div>
            </div>

            <div className={styles.divider} />

            <Button className={'w-full'} isPending={isLoading} type='submit' onClick={handleSubmit}>
              {t('getSubscription.submit_button')}
              <IconArrowRight size={20} stroke={2} />
            </Button>

            <div className='flex flex-col gap-4'>
              <p className={styles.featuresTitle}>{t('getSubscription.features_title')}</p>
              <div className={styles.featuresList}>
                {features.map((feature) => (
                  <div key={feature} className={styles.featureItem}>
                    <div className={styles.featureIcon}>
                      <IconCheck size={18} stroke={3} />
                    </div>
                    <p className='text-sm text-foreground/80'>{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Block>
      </div>
    </Form>
  );
}
