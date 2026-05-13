import { Surface } from '@heroui/react';
import { SubscriptionView } from '../../components';
import { useSubscriptionPage } from './useSubscriptionPage';

export default function SubscriptionPage() {
  const { shortUuid, error } = useSubscriptionPage();

  if (!shortUuid) return null;

  return (
    <Surface variant='transparent'>
      <SubscriptionView shortUuid={shortUuid} error={error} />
    </Surface>
  );
}
