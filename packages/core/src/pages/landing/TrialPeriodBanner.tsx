import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import InviteArtwork from '../../assets/icons/invite-icon.svg?react';
import { useNavigation, usePlans } from '../../hooks';
import { planSlug } from '../getSubscription/planSlug';

export function TrialPeriodBanner() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const handleCtaClick = (days: number) => navigate(`/payment/${planSlug(days)}`);

  const plans = usePlans();

  const plan = plans.find((plan) => plan.isTrial);
  if (!plan) return null;
  return (
    <section id='cta'>
      <div className='relative flex items-center overflow-hidden p-8 rounded-3xl bg-linear-to-r  from-purple-400 to-yellow-400 py-16 text-center shadow-xl'>
        <div className='relative flex flex-col justify-start items-start gap-6'>
          <div className='flex flex-col justify-start gap-3'>
            <h2 className='text-xl font-bold tracking-tight text-white text-start md:text-3xl'>
              {t('landing.trialPeriodBanner.title', {
                days: plan.days,
                price: plan.planPricing.total,
                currency: plan.planPricing.currencyCode,
              })}
            </h2>
            <p className='text-base text-start text-white/80 lg:text-md'>
              {t('landing.cta.subtitle')}
            </p>
          </div>

          <Button
            size='lg'
            className='bg-white text-black font-semibold shadow-lg w-2/4'
            onClick={() => handleCtaClick(plan.days)}
          >
            {t('common.cta')}
          </Button>
        </div>
        <InviteArtwork />
      </div>
    </section>
  );
}
