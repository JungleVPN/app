import { initData, User } from '@tma.js/sdk-react';
import { useAuthStoreActions } from '@workspace/core/stores';
import { type ReactNode, useEffect } from 'react';

/**
 * Telegram-only: initData → shared auth store. Backend validates raw initData on requests.
 */
export function TmaAuthProvider({ children }: { children: ReactNode }) {
  const { setTgUser, setTgInitDataRaw, setLoading } = useAuthStoreActions();

  useEffect(() => {
    try {
      const user = initData.user();
      const raw = initData.raw();

      if (raw) {
        setTgInitDataRaw(raw);
      }

      // tma_opened is reported by ProfileLayout once the account lookup settles,
      // so it can carry the userId.
      if (user) {
        setTgUser(user as unknown as User);
      }
    } catch {
      // Not inside Telegram (local dev).
    } finally {
      setLoading(false);
    }
  }, [setTgUser, setTgInitDataRaw, setLoading]);

  return <>{children}</>;
}
