import { backButton, type User } from '@tma.js/sdk-react';
import { type SyntheticEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRemnawaveApi } from '../../api';
import { useNavigation } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { useAuthStoreActions, useAuthStoreInfo, usePlatformStore } from '../../stores';
import {
  analytics,
  captureReferral,
  clearReferral,
  getAttribution,
  getReferral,
  initUser,
  validateEmail,
} from '../../utils';

export function useGetSubscriptionPage() {
  const { profileSubscriptionPath } = useAppRoutes();
  const remnawaveApi = useRemnawaveApi();
  const navigate = useNavigation();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const { authUser, rmnUser, tgUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();
  const { platformType } = usePlatformStore();

  // Re-run on every landing, not just app boot: an invited user can leave this
  // page before signing up (header Login, OTP confirm, the no-account redirect
  // back here) and land again with `?ref=` re-attached via withReferralParam.
  // captureReferral() is first-touch-guarded, so this is a no-op once stored.
  useEffect(() => {
    captureReferral();
  }, []);

  // Redirect away from the setup page if the user is already resolved —
  // covers both the web flow (authUser + rmnUser) and the TMA flow (tgUser + rmnUser).
  useEffect(() => {
    if (rmnUser && (authUser || tgUser)) navigate(profileSubscriptionPath);
    if (platformType === 'telegram') {
      backButton.hide();
    }
  }, [authUser, tgUser, rmnUser, navigate, profileSubscriptionPath, platformType]);

  // Fire once when an unauthenticated visitor lands on this page.
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!rmnUser) {
      analytics.initialPageViewed(platformType === 'telegram' ? 'telegram' : 'web');
    }
  }, []);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (error) {
      setHasError(false);
      setError('');
    }
  };

  const validateEmailInput = (): string | null => {
    if (!email.trim()) return t('getSubscription.error_empty_email');
    if (!validateEmail(email)) return t('getSubscription.error_invalid_email');
    return null;
  };

  // TMA flow — look up by email, link the Telegram identity, then land on the portal.
  //
  // If an account exists (e.g. a web user who already signed up): attach this telegramId
  // so future logins resolve via Telegram without asking for email again.
  //
  // If no account exists yet: create one with both email and telegramId so the user
  // can access their subscription from both Telegram and the web.
  const submitTelegramUser = async (tgUser: User) => {
    const telegramId = Number(tgUser.id);
    const existingUser = await initUser(remnawaveApi, { email, telegramId });

    if (existingUser) {
      const linked = await remnawaveApi.updateUser({ uuid: existingUser.uuid, telegramId, email });
      setRmnUser(linked ?? null);
      if (tgUser.language_code) {
        const existing = await remnawaveApi.getUserMetadata(existingUser.uuid);
        if (!existing?.lang) {
          await remnawaveApi.upsertUserMetadata(existingUser.uuid, { lang: tgUser.language_code });
        }
      }
      analytics.login('telegram');
    } else {
      const newUser = await remnawaveApi.createUser({
        email,
        telegramId,
        attribution: getAttribution() ?? undefined,
        inviterId: getReferral() ?? undefined,
      });
      setRmnUser(newUser ?? null);
      if (newUser && tgUser.language_code) {
        await remnawaveApi.upsertUserMetadata(newUser.uuid, { lang: tgUser.language_code });
      }
      clearReferral();
      analytics.signUp('telegram');
    }
    navigate(profileSubscriptionPath);
  };

  // Web flow — look up or create by email, then navigate to the public subscription page.
  const submitWebUser = async () => {
    const existingUser = await initUser(remnawaveApi, { email });
    if (existingUser) {
      analytics.login('web');
      navigate(`/subscription/${existingUser.shortUuid}`);
      return;
    }
    const newUser = await remnawaveApi.createUser({
      email,
      attribution: getAttribution() ?? undefined,
      inviterId: getReferral() ?? undefined,
    });
    clearReferral();
    analytics.signUp('web');
    navigate(`/subscription/${newUser?.shortUuid}`);
  };

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    setError('');
    setHasError(false);

    const validationError = validateEmailInput();
    if (validationError) {
      setError(validationError);
      setHasError(true);
      return;
    }

    setIsLoading(true);
    try {
      if (tgUser) {
        await submitTelegramUser(tgUser);
      } else {
        await submitWebUser();
      }
    } catch {
      setError(t('getSubscription.error_failed_to_create'));
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    email,
    error,
    hasError,
    isLoading,
    handleEmailChange,
    handleSubmit,
  };
}
