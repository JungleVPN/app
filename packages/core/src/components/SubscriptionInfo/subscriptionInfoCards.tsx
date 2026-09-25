import { Surface } from '@heroui/react';
import {
  IconArrowsUpDown,
  IconCalendar,
  IconCheck,
  IconUserScan,
  IconX,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../../stores';
import { Block, Grid, GridItem, Paragraph } from '../../ui';
import { formatExpiryDate } from '../../utils';
import classes from './subscriptionInfoCards.module.css';

type ColorVariant = 'blue' | 'cyan' | 'green' | 'orange' | 'red' | 'teal' | 'violet' | 'yellow';

const iconColorClasses: Record<ColorVariant, string> = {
  blue: classes.iconBlue,
  cyan: classes.iconCyan,
  green: classes.iconGreen,
  teal: classes.iconTeal,
  red: classes.iconRed,
  yellow: classes.iconYellow,
  orange: classes.iconOrange,
  violet: classes.iconViolet,
};

interface CardItemProps {
  color: ColorVariant;
  icon: ReactNode;
  label: string;
  value: string;
}

const CardItem = ({ icon, label, value, color }: CardItemProps) => {
  return (
    <Surface className={classes.cardItem} variant='transparent'>
      <div className='flex flex-nowrap items-start gap-2'>
        <Surface
          className={`flex size-9 shrink-0 items-center justify-center rounded-md ${iconColorClasses[color]}`}
          variant='secondary'
        >
          {icon}
        </Surface>
        <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
          <Paragraph>{label}</Paragraph>
          <Paragraph>{value}</Paragraph>
        </div>
      </div>
    </Surface>
  );
};

export const SubscriptionInfoCards = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;
  const subscription = useSubscription();

  const { user } = subscription;

  const isActive = user.userStatus === 'ACTIVE';
  const statusText = isActive
    ? t('subscriptionPage.info.active')
    : t('subscriptionPage.info.inactive');

  const bandwidthValue =
    user.trafficLimit === '0'
      ? `${user.trafficUsed} / ∞`
      : `${user.trafficUsed} / ${user.trafficLimit}`;

  return (
    <Block>
      <Grid className='z-[3]'>
        <GridItem size={{ base: 12, sm: 6 }}>
          <CardItem
            color='blue'
            icon={<IconUserScan size={18} />}
            label={t('subscriptionPage.info.name')}
            value={user.username}
          />
        </GridItem>

        <GridItem size={{ base: 12, sm: 6 }}>
          <CardItem
            color={isActive ? 'green' : 'red'}
            icon={isActive ? <IconCheck size={18} /> : <IconX size={18} />}
            label={t('subscriptionPage.info.status')}
            value={statusText}
          />
        </GridItem>

        <GridItem size={{ base: 12, sm: 6 }}>
          <CardItem
            color='orange'
            icon={<IconCalendar size={18} />}
            label={t('subscriptionPage.info.expires')}
            value={formatExpiryDate({ date: user.expiresAt, lang, t })}
          />
        </GridItem>

        <GridItem size={{ base: 12, sm: 6 }}>
          <CardItem
            color='cyan'
            icon={<IconArrowsUpDown size={18} />}
            label={t('subscriptionPage.info.bandwidth')}
            value={bandwidthValue}
          />
        </GridItem>
      </Grid>
    </Block>
  );
};
