import { Button, Chip, Spinner, Tabs } from '@heroui/react';
import { Page } from '@workspace/core';
import { Key, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FeaturesCard, Loading } from '../../../components';
import { useNavigation, usePlans } from '../../../hooks';
import { useAppRoutes } from '../../../runtime';
import { usePlatformStore } from '../../../stores';
import { Block } from '../../../ui';
import { formatPlanPrice, isRuDomain, phCapture } from '../../../utils';
import { useSavedPayment } from '../payment/hooks/useSavedPayment';

export default function PlansPage() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const { profilePaymentPath } = useAppRoutes();
  const { platformType } = usePlatformStore();
  const plans = usePlans();
  const isRu = isRuDomain();
  const isTelegram = platformType === 'telegram';
  const [selectedMonths, setSelectedMonths] = useState<number | null>(null);

  const { hasActiveMethod, savedMethods } = useSavedPayment();
  const isLoading = savedMethods === null;

  useEffect(() => {
    if (hasActiveMethod) {
      navigate(profilePaymentPath);
    }
  });

  const sortedPlans = [...plans].sort((a, b) => b.months - a.months);
  const activeMonths = selectedMonths ?? sortedPlans[0]?.months ?? null;

  const handleSelectionChange = (key: Key) => {
    setSelectedMonths(Number(key));
  };

  const handleSubmit = () => {
    const plan = sortedPlans.find((p) => p.months === activeMonths) ?? sortedPlans[0];
    if (!plan) return;
    phCapture('plan_selected', { months: plan.months });
    navigate(profilePaymentPath, {
      state: {
        selectedPlan: {
          months: plan.months,
          priceEur: parseFloat(plan.priceEur),
          priceRub: parseFloat(plan.priceRub),
        },
      },
    });
  };

  if (hasActiveMethod || isLoading) return <Loading />;

  return (
    <Page title={t('plans.pageTitle')}>
      <Block
        className='rounded-4xl p-2'
        variant={'default'}
        description={t('plans.pageDescription')}
      >
        {sortedPlans.length === 0 ? (
          <div className='flex justify-center p-8'>
            <Spinner color='accent' size='lg' />
          </div>
        ) : (
          <Tabs
            orientation='vertical'
            selectedKey={activeMonths !== null ? String(activeMonths) : undefined}
            onSelectionChange={handleSelectionChange}
            className='w-full'
          >
            <Tabs.ListContainer className='w-full'>
              <Tabs.List aria-label={t('plans.tabsAriaLabel')} className='w-full gap-2 p-0'>
                {sortedPlans.map((plan) => {
                  const pricing = isRu || isTelegram ? plan.rub : plan.eur;
                  const label = t('plans.month', { count: plan.months });

                  return (
                    <Tabs.Tab
                      key={plan.months}
                      id={String(plan.months)}
                      className='h-auto w-full rounded-2xl px-4 py-3 text-start'
                    >
                      <div className='flex w-full items-center justify-between'>
                        <div className='flex flex-col gap-1'>
                          <div className='flex items-center gap-2'>
                            <span className='font-semibold'>{label}</span>
                            {pricing.discountPercent > 0 && (
                              <Chip color='accent' size='sm' variant='soft'>
                                <Chip.Label>-{pricing.discountPercent}%</Chip.Label>
                              </Chip>
                            )}
                          </div>
                          {pricing.discountPercent > 0 && pricing.fullTotal && (
                            <div className='flex items-center gap-1.5 text-sm text-muted'>
                              <span>{formatPlanPrice(pricing.total, isRu || isTelegram)}</span>
                              <span className='line-through'>
                                {formatPlanPrice(pricing.fullTotal, isRu || isTelegram)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className='text-end'>
                          <div className='text-lg font-bold text-primary'>
                            {formatPlanPrice(pricing.monthly, isRu || isTelegram)}
                          </div>
                          <div className='text-xs text-muted'>{t('plans.perMonth')}</div>
                        </div>
                      </div>
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  );
                })}
              </Tabs.List>
            </Tabs.ListContainer>

            {sortedPlans.map((plan) => (
              <Tabs.Panel key={plan.months} id={String(plan.months)} className='hidden'>
                {null}
              </Tabs.Panel>
            ))}
          </Tabs>
        )}
        <Button
          fullWidth
          size='lg'
          className='mt-4'
          onPress={handleSubmit}
          isDisabled={sortedPlans.length === 0}
        >
          {t('plans.continueButton')}
        </Button>
      </Block>
      <div className={'mt-4'}>
        <FeaturesCard title={t('common.features.title')} />
      </div>
    </Page>
  );
}
