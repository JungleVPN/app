import { Button, Chip, Description, FieldError, Form, Input, TextField } from '@heroui/react';
import { IconArrowRight, IconCheck, IconMail } from '@tabler/icons-react';
import { type SyntheticEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useRemnawaveApi } from '../../api';
import { coreEnv } from '../../env';
import { useAppRoutes } from '../../runtime';
import { useAuthStoreInfo } from '../../stores';
import { Block } from '../../ui';
import { initUser, validateEmail } from '../../utils';

import styles from './getSubscription.module.css';

export default function GetSubscriptionPage() {
  const { allowedAmounts } = coreEnv;
  const { subscriptionPortalPath } = useAppRoutes();
  const remnawaveApi = useRemnawaveApi();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const { authUser, rmnUser } = useAuthStoreInfo();

  useEffect(() => {
    if (authUser && rmnUser) navigate(subscriptionPortalPath);
  }, [authUser, navigate, subscriptionPortalPath, rmnUser]);

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
      const user = await initUser(remnawaveApi, { email });

      if (!user) {
        const newUser = await remnawaveApi.createUser({ email });
        navigate(`/subscription/${newUser?.shortUuid}`);
        return;
      }
      navigate(`/subscription/${user?.shortUuid}`);
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
        <Block>
          <div className='flex flex-col gap-2'>
            <p className='text-base font-medium text-foreground'>
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
                <Description>{t('getSubscription.email_description')}</Description>
              )}
            </TextField>
          </div>
        </Block>

        <Block>
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
