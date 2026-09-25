import { Card } from '@heroui/react';
import {
  IconArrowsUpDown,
  IconCalendar,
  IconCheck,
  IconUserScan,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../../stores';
import { Grid, GridItem } from '../../ui';
import { formatExpiryDate, getExpirationText } from '../../utils';
import { InfoBlock } from '../InfoBlock/InfoBlock';

export const SubscriptionInfoExpanded = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;
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
                {getExpirationText({ expireAt: user.expiresAt, lang, t })}
              </Card.Description>
            </div>
          </div>
        </div>

        <Grid>
          <GridItem size={{ base: 12, sm: 6 }}>
            <InfoBlock
              color='blue'
              icon={<IconUserScan size={16} />}
              title={t('subscriptionPage.info.name')}
              value={user.username}
            />
          </GridItem>

          <GridItem size={{ base: 12, sm: 6 }}>
            <InfoBlock
              color={user.userStatus === 'ACTIVE' ? 'green' : 'red'}
              icon={user.userStatus === 'ACTIVE' ? <IconCheck size={16} /> : <IconX size={16} />}
              title={t('subscriptionPage.info.status')}
              value={
                user.userStatus === 'ACTIVE'
                  ? t('subscriptionPage.info.active')
                  : t('subscriptionPage.info.inactive')
              }
            />
          </GridItem>

          <GridItem size={{ base: 12, sm: 6 }}>
            <InfoBlock
              color='red'
              icon={<IconCalendar size={16} />}
              title={t('subscriptionPage.info.expires')}
              value={formatExpiryDate({ date: user.expiresAt, lang, t })}
            />
          </GridItem>

          <GridItem size={{ base: 12, sm: 6 }}>
            <InfoBlock
              color='yellow'
              icon={<IconArrowsUpDown size={16} />}
              title={t('subscriptionPage.info.bandwidth')}
              value={`${user.trafficUsed} / ${user.trafficLimit === '0' ? '∞' : user.trafficLimit}`}
            />
          </GridItem>
        </Grid>
      </Card.Content>
    </Card>
  );
};
