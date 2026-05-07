import { Button, Disclosure } from '@heroui/react';
import {
  IconArrowsUpDown,
  IconCalendar,
  IconCheck,
  IconUserScan,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from '../../hooks';
import { useSubscription } from '../../stores';
import { formatDate, getExpirationTextUtil } from '../../utils';
import { InfoBlock } from '../InfoBlock/InfoBlock';

export const SubscriptionInfoCollapsed = () => {
  const { t, currentLang, baseTranslations } = useTranslation();
  const subscription = useSubscription();
  const [isExpanded, setIsExpanded] = useState(false);

  const { user } = subscription;

  return (
    <Disclosure isExpanded={isExpanded} onExpandedChange={setIsExpanded}>
      <Disclosure.Heading>
        <Button
          className='h-auto w-full justify-between gap-2 px-4 py-2'
          slot='trigger'
          variant='primary'
        >
          <span className='flex min-w-0 flex-1 items-center gap-2'>
            <span className='flex min-w-0 flex-1 flex-col items-start gap-0'>
              <span className='truncate text-sm font-semibold text-foreground'>
                {user.username}
              </span>
              <span className='truncate text-xs'>
                {getExpirationTextUtil(user.expiresAt, currentLang, baseTranslations)}
              </span>
            </span>
          </span>
          <Disclosure.Indicator />
        </Button>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body className='px-2 pb-2'>
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
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
};
