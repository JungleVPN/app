import { backButton } from '@tma.js/sdk-react';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { usePlatformStore } from '../stores';

/**
 * Shows the Telegram back button and wires up a click handler for the
 * duration of the component's lifetime.
 *
 * Platform check and listener cleanup are handled internally — always safe
 * to call unconditionally:
 *
 *   useBackButton();                              // navigates to URL parent segment
 *   useBackButton(() => doSomethingCustom());     // custom handler
 *
 * Default behaviour strips the last path segment:
 *   /profile/devices/extra  →  /profile/devices
 *   /profile/admin/123      →  /profile/admin
 *
 * This is reliable regardless of memory-router history depth, deep-links,
 * or how many times the user has switched tabs.
 *
 * On non-Telegram platforms the hook is a no-op.
 */
export function useBackButton(onBack?: () => void) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { platformType } = usePlatformStore();

  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  // Derive parent path once on mount — stable for the lifetime of the page.
  const parentPath = pathname.split('/').slice(0, -1).join('/') || '/';

  useEffect(() => {
    if (platformType !== 'telegram') return;

    const handler = () => {
      if (onBackRef.current) {
        onBackRef.current();
      } else {
        navigate(parentPath, { replace: true });
      }
    };

    backButton.show();
    backButton.onClick(handler);
    return () => {
      backButton.offClick(handler);
      backButton.hide();
    };
  }, [platformType, navigate, parentPath]);
}
