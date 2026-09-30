import { Button } from '@heroui/react';
import { Trans, useTranslation } from 'react-i18next';
import InviteArtwork from '../../assets/icons/invite-icon.svg?react';
import { useNavigation, usePlans } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { Heading, Paragraph } from '../../ui';

export function TrialPeriodBanner() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const { getSubscriptionPath } = useAppRoutes();

  const plans = usePlans();

  const plan = plans.find((plan) => plan.isTrial);
  if (!plan) return null;
  return (
    <section>
      <div className='flex flex-col items-center gap-10 overflow-hidden rounded-4xl bg-linear-to-r from-purple-400 to-yellow-400 px-8 py-12 md:flex-row md:justify-between md:px-16 md:py-16'>
        <div className='flex flex-col items-center gap-8 text-center md:items-start md:text-start'>
          <Heading as='h2' className={'text-white text-2xl'}>
            <Trans
              i18nKey='landing.trialPeriodBanner.title'
              values={{
                days: plan.days,
                price: plan.planPricing.total,
                currency: plan.planPricing.currencyCode,
              }}
              components={{
                hl: (
                  <span className='inline-block whitespace-nowrap rounded-xl bg-white px-3 py-0.5 text-black' />
                ),
              }}
            />
          </Heading>
          <Paragraph className={'text-white'}>{t('landing.cta.subtitle')}</Paragraph>
          <Button
            size='lg'
            className='bg-white text-black font-semibold shadow-lg w-2/4'
            onClick={() => navigate(getSubscriptionPath(plan.planId))}
          >
            {t('common.cta')}
          </Button>
        </div>

        <InviteArtwork className='h-56 w-full max-w-sm' />
      </div>
    </section>
  );
}
