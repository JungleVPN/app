import { Surface } from '@heroui/react';
import {
  IconArrowsUpDown,
  IconCalendar,
  IconCheck,
  IconUserScan,
  IconX,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from '../../hooks';
import { useSubscription } from '../../stores';
import { Block } from '../../ui';
import { formatDate } from '../../utils';
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
          <p className={`${classes.label} text-xs font-medium uppercase text-muted`}>{label}</p>
          <p className={`${classes.value} text-sm font-semibold text-foreground`}>{value}</p>
        </div>
      </div>
    </Surface>
  );
};

export const SubscriptionInfoCards = () => {
  const { t, currentLang, baseTranslations } = useTranslation();
  const subscription = useSubscription();

  const { user } = subscription;

  const isActive = user.userStatus === 'ACTIVE';
  const statusText = isActive ? t(baseTranslations.active) : t(baseTranslations.inactive);

  const bandwidthValue =
    user.trafficLimit === '0'
      ? `${user.trafficUsed} / ∞`
      : `${user.trafficUsed} / ${user.trafficLimit}`;

  return (
    <Block>
      <div className='z-[3] grid grid-cols-1 gap-2 sm:grid-cols-2'>
        <CardItem
          color='blue'
          icon={<IconUserScan size={18} />}
          label={t(baseTranslations.name)}
          value={user.username}
        />

        <CardItem
          color={isActive ? 'green' : 'red'}
          icon={isActive ? <IconCheck size={18} /> : <IconX size={18} />}
          label={t(baseTranslations.status)}
          value={statusText}
        />

        <CardItem
          color='orange'
          icon={<IconCalendar size={18} />}
          label={t(baseTranslations.expires)}
          value={formatDate(user.expiresAt, currentLang, baseTranslations)}
        />

        <CardItem
          color='cyan'
          icon={<IconArrowsUpDown size={18} />}
          label={t(baseTranslations.bandwidth)}
          value={bandwidthValue}
        />
      </div>
    </Block>
  );
};
