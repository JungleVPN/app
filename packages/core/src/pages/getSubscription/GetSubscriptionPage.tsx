import { Button, Chip, Description, FieldError, Form, Input, TextField } from '@heroui/react';
import { IconArrowRight, IconCheck, IconMail } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Loading } from '../../components';
import { Block } from '../../ui';
import styles from './getSubscription.module.css';
import { useGetSubscriptionPage } from './useGetSubscriptionPage';

export default function GetSubscriptionPage() {
  const { t } = useTranslation();
  const { email, error, hasError, isLoading, isConnecting, handleEmailChange, handleSubmit } =
    useGetSubscriptionPage();

  if (isConnecting) return <Loading />;

  const features = [
    t('getSubscription.feature_devices'),
    t('getSubscription.feature_traffic'),
    t('getSubscription.feature_support'),
  ];

  return (
    <Form className={styles.form}>
      <div className='flex max-w-5xl flex-col gap-3'>
        <div className='flex flex-col gap-2'>
          <p className='text-base font-medium ms-4'>{t('getSubscription.enter_email')}</p>
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
                onChange={(v) => handleEmailChange(v.target.value)}
              />
            </div>

            {hasError ? (
              <FieldError>{error}</FieldError>
            ) : (
              <Description className={'ms-4'}>{t('getSubscription.email_description')}</Description>
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
                  <Chip color='warning' size='sm' className={'w-fit'} variant='secondary'>
                    <Chip.Label>{t('getSubscription.discount')}</Chip.Label>
                  </Chip>
                </div>
              </div>
              <div className={styles.priceColumn}>
                <p className={styles.currentPrice}>0 ₽</p>
              </div>
            </div>

            <div className={styles.divider} />

            <Button className={'w-full'} isPending={isLoading} type='submit' onClick={handleSubmit}>
              {t('getSubscription.submit_button')}
              <IconArrowRight size={20} stroke={2} className='rtl:-scale-x-100' />
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
