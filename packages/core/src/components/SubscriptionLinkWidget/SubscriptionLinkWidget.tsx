import { Button } from '@heroui/react';
import { IconLink } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useAuthStore, useNavbarStore, useSubscriptionLinkDialogStore } from '../../stores';

export const SubscriptionLinkWidget = () => {
  const { setNavbarVisible } = useNavbarStore();
  const { authUser } = useAuthStore();
  const qrState = useSubscriptionLinkDialogStore();

  useEffect(() => {
    if (qrState.isOpen) {
      setNavbarVisible(false);
    } else {
      setNavbarVisible(true);
    }
  }, [setNavbarVisible, qrState.isOpen]);

  return (
    <>
      {authUser && (
        <Button isIconOnly size='md' variant='tertiary' onPress={qrState.open}>
          <IconLink />
        </Button>
      )}
    </>
  );
};
