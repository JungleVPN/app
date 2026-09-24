import {
  IconAffiliateFilled,
  IconHeartFilled,
  IconPlaneFilled,
  IconShieldCheckFilled,
  type TablerIcon,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import AroundTheWorldIcon from '../../assets/icons/around-the-world-icon.svg?react';
import { Container } from '../../ui';
import { Heading } from '../../ui/Heading';
import { Paragraph } from '../../ui/Paragraph';

type Feature = {
  key: string;
  icon: TablerIcon;
};

const LEFT_FEATURES: readonly Feature[] = [
  { key: 'everywhere', icon: IconHeartFilled },
  { key: 'travel', icon: IconPlaneFilled },
];

const RIGHT_FEATURES: readonly Feature[] = [
  { key: 'wifi', icon: IconAffiliateFilled },
  { key: 'private', icon: IconShieldCheckFilled },
];

/**
 * The column a feature sits in. Tailwind only sees class names it can read in
 * the source, so both variants are spelled out rather than built from `side`.
 */
const SIDE_CLASSES = {
  left: { text: 'lg:text-end', icon: 'lg:self-end' },
  right: { text: 'lg:text-start', icon: 'lg:self-start' },
} as const;

type Side = keyof typeof SIDE_CLASSES;

function FeatureItem({ feature, side }: { feature: Feature; side: Side }) {
  const { t } = useTranslation();
  const { key, icon: Icon } = feature;
  const classes = SIDE_CLASSES[side];

  return (
    <li className={`flex flex-col gap-3 text-center ${classes.text}`}>
      <span
        className={`flex size-11 items-center justify-center self-center rounded-xl bg-[#1a1a1a]/5 text-[#1a1a1a] ${classes.icon}`}
      >
        <Icon size={22} stroke={2} aria-hidden='true' />
      </span>

      <Heading as='h3'>{t(`landing.locations.world.${key}.title`)}</Heading>
      <Paragraph className={'text-muted'}>
        {t(`landing.locations.world.${key}.description`)}
      </Paragraph>
    </li>
  );
}

export function AroundTheWorldSection() {
  const { t } = useTranslation();

  return (
    <section className='flex flex-col gap-12'>
      <Container maxWidth='md' className='flex flex-col items-center gap-4 text-center'>
        <Heading as='h2'>{t('landing.locations.world.title')}</Heading>
        <Paragraph>{t('landing.locations.world.subtitle')}</Paragraph>
      </Container>

      <Container className='grid items-center gap-10 lg:grid-cols-[1fr_minmax(0,20rem)_1fr] lg:gap-16'>
        <ul className='flex flex-col gap-16 lg:gap-32'>
          {LEFT_FEATURES.map((feature) => (
            <FeatureItem key={feature.key} feature={feature} side='left' />
          ))}
        </ul>

        <AroundTheWorldIcon className={'h-70 md:h-100 m-auto'} />

        <ul className='flex flex-col gap-16 lg:gap-32'>
          {RIGHT_FEATURES.map((feature) => (
            <FeatureItem key={feature.key} feature={feature} side='right' />
          ))}
        </ul>
      </Container>
    </section>
  );
}
