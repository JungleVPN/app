import { initData, User } from '@tma.js/sdk-react';
import { useAnalyticsApi } from '@workspace/core/api';
import { useAuthStoreActions } from '@workspace/core/stores';
import { type ReactNode, useEffect } from 'react';

/**
 * Telegram-only: initData → shared auth store. Backend validates raw initData on requests.
 */
export function TmaAuthProvider({ children }: { children: ReactNode }) {
  const { setTgUser, setTgInitDataRaw, setLoading } = useAuthStoreActions();
  const analyticsApi = useAnalyticsApi();

  useEffect(() => {
    try {
      const user = initData.user();
      const raw = initData.raw();

      if (raw) {
        setTgInitDataRaw(raw);
      }

      if (user) {
        setTgUser(user as unknown as User);
        // userId/email are not yet resolved at init time — enrichment happens later.
        analyticsApi.trackTmaOpened({ telegramId: Number(user.id), email: null, userId: null });
      }
    } catch {
      // Not inside Telegram (local dev).
    } finally {
      setLoading(false);
    }
  }, [setTgUser, setTgInitDataRaw, setLoading, analyticsApi]);

  return <>{children}</>;
}
