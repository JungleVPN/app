import { Button, Chip, Tabs } from '@heroui/react';
import { Page } from '@workspace/core';
import type { Key } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../../hooks';
import { useAppRoutes } from '../../../runtime';
import { Block } from '../../../ui';

type Plan = {
  months: number;
  priceEur: number;
  priceRub: number;
  discount: number;
};

const BASE_MONTHLY_PRICE_EUR = 6;

const PLANS: Plan[] = [
  { months: 12, priceEur: 43.2, priceRub: 1440, discount: 40 },
  { months: 6,  priceEur: 26.4, priceRub: 882,  discount: 27 },
  { months: 3,  priceEur: 15,   priceRub: 501,  discount: 17 },
  { months: 1,  priceEur: 6,    priceRub: 200,  discount: 0  },
];

function formatPrice(price: number): string {
  if (Number.isInteger(price)) return `€${price}`;
  return `€${price.toFixed(2)}`;
}

export default function PlansPage() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const { profilePaymentPath } = useAppRoutes();
  const [selectedMonths, setSelectedMonths] = useState(12);

  const handleSelectionChange = (key: Key) => {
    setSelectedMonths(Number(key));
  };

  const handleSubmit = () => {
    const plan = PLANS.find((p) => p.months === selectedMonths) ?? PLANS[0];
    navigate(profilePaymentPath, {
      state: { selectedPlan: { months: plan.months, priceEur: plan.priceEur, priceRub: plan.priceRub } },
    });
  };

  return (
    <Page title={t('plans.pageTitle')}>
      <Block
        className='rounded-4xl p-2'
        variant={'default'}
        description={t('plans.pageDescription')}
      >
        <Tabs
          orientation='vertical'
          selectedKey={String(selectedMonths)}
          onSelectionChange={handleSelectionChange}
          className='w-full'
        >
          <Tabs.ListContainer className='w-full'>
            <Tabs.List aria-label={t('plans.tabsAriaLabel')} className='w-full gap-2 p-0'>
              {PLANS.map((plan) => {
                const monthlyPrice = plan.priceEur / plan.months;
                const fullPrice = BASE_MONTHLY_PRICE_EUR * plan.months;
                const label = t('plans.month', { count: plan.months });

                return (
                  <Tabs.Tab
                    key={plan.months}
                    id={String(plan.months)}
                    className='h-auto w-full rounded-2xl px-4 py-3 text-left'
                  >
                    <div className='flex w-full items-center justify-between'>
                      <div className='flex flex-col gap-1'>
                        <div className='flex items-center gap-2'>
                          <span className='font-semibold'>{label}</span>
                          {plan.discount > 0 && (
                            <Chip color='accent' size='sm' variant='soft'>
                              <Chip.Label>-{plan.discount}%</Chip.Label>
                            </Chip>
                          )}
                        </div>
                        {plan.discount > 0 && (
                          <div className='flex items-center gap-1.5 text-sm text-muted'>
                            <span>{formatPrice(plan.priceEur)}</span>
                            <span className='line-through'>{formatPrice(fullPrice)}</span>
                          </div>
                        )}
                      </div>
                      <div className='text-right'>
                        <div className='text-lg font-bold text-primary'>
                          {formatPrice(parseFloat(monthlyPrice.toFixed(2)))}
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

          {PLANS.map((plan) => (
            <Tabs.Panel key={plan.months} id={String(plan.months)} className='hidden'>
              {null}
            </Tabs.Panel>
          ))}
        </Tabs>
        <Button fullWidth size='lg' className='mt-4' onPress={handleSubmit}>
          {t('plans.continueButton')}
        </Button>
      </Block>
    </Page>
  );
}
