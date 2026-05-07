import { Card } from '@heroui/react';
import {
  IconArrowsUpDown,
  IconCalendar,
  IconCheck,
  IconUserScan,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from '../../hooks';
import { useSubscription } from '../../stores';
import { formatDate, getExpirationTextUtil } from '../../utils';
import { InfoBlock } from '../InfoBlock/InfoBlock';

export const SubscriptionInfoExpanded = () => {
  const { t, currentLang, baseTranslations } = useTranslation();
  const subscription = useSubscription();

  const { user } = subscription;

  return (
    <Card className='z-[3] overflow-hidden border border-divider' variant='default'>
      <Card.Content className='gap-3 p-2'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex min-w-0 flex-1 items-center gap-2'>
            <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
              <Card.Title className='truncate text-base'>{user.username}</Card.Title>
              <Card.Description
                className={
                  user.daysLeft === 0 ? 'font-semibold text-danger' : 'font-semibold text-muted'
                }
              >
                {getExpirationTextUtil(user.expiresAt, currentLang, baseTranslations)}
              </Card.Description>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2'>
          <InfoBlock
            color='blue'
            icon={<IconUserScan size={16} />}
            title={t(baseTranslations.name)}
            value={user.username}
          />

          <InfoBlock
            color={user.userStatus === 'ACTIVE' ? 'green' : 'red'}
            icon={user.userStatus === 'ACTIVE' ? <IconCheck size={16} /> : <IconX size={16} />}
            title={t(baseTranslations.status)}
            value={
              user.userStatus === 'ACTIVE'
                ? t(baseTranslations.active)
                : t(baseTranslations.inactive)
            }
          />

          <InfoBlock
            color='red'
            icon={<IconCalendar size={16} />}
            title={t(baseTranslations.expires)}
            value={formatDate(user.expiresAt, currentLang, baseTranslations)}
          />

          <InfoBlock
            color='yellow'
            icon={<IconArrowsUpDown size={16} />}
            title={t(baseTranslations.bandwidth)}
            value={`${user.trafficUsed} / ${user.trafficLimit === '0' ? '∞' : user.trafficLimit}`}
          />
        </div>
      </Card.Content>
    </Card>
  );
};
