import { backButton } from '@tma.js/sdk-react';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { useBackButtonStoreActions, usePlatformStore } from '../stores';
import { useNavigation } from './useNavigation';

/**
 * Registers a back action for the duration of the component's lifetime.
 *
 * On Telegram it drives the native Telegram back button; on web the same
 * action is published to the back-button store, where `Page` picks it up and
 * renders an in-page back button. Both platforms share one handler, so their
 * behaviour cannot drift.
 *
 * Platform check and listener cleanup are handled internally — always safe
 * to call unconditionally:
 *
 *   useBackButton();                              // navigates to URL parent segment
 *   useBackButton(() => doSomethingCustom());     // custom handler
 *
 * Default behaviour strips the last path segment:
 *   /profile/devices/extra  →  /profile/devices
 *   /profile/transactions/123  →  /profile/transactions
 *
 * This is reliable regardless of memory-router history depth, deep-links,
 * or how many times the user has switched tabs.
 */
export function useBackButton(onBack?: () => void) {
  const navigate = useNavigation();
  const { pathname } = useLocation();
  const { platformType } = usePlatformStore();
  const { setOnBack, clearOnBack } = useBackButtonStoreActions();

  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  // Derive parent path once on mount — stable for the lifetime of the page.
  const parentPath = pathname.split('/').slice(0, -1).join('/') || '/';

  useEffect(() => {
    const handler = () => {
      if (onBackRef.current) {
        onBackRef.current();
      } else {
        navigate(parentPath, { replace: true });
      }
    };

    setOnBack(handler);

    if (platformType === 'telegram') {
      backButton.show();
      backButton.onClick(handler);
    }

    return () => {
      clearOnBack(handler);
      if (platformType === 'telegram') {
        backButton.offClick(handler);
        backButton.hide();
      }
    };
  }, [platformType, navigate, parentPath, setOnBack, clearOnBack]);
}
