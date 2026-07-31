import { backButton, type User } from '@tma.js/sdk-react';
import { type SyntheticEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnalyticsApi, useRemnawaveApi } from '../../api';
import { useNavigation } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { useAuthStoreActions, useAuthStoreInfo, usePlatformStore } from '../../stores';
import {
  analytics,
  captureReferral,
  clearAttribution,
  clearReferral,
  getAttribution,
  getReferral,
  validateEmail,
} from '../../utils';

export function useGetSubscriptionPage() {
  const { profileSubscriptionPath, authGateRedirectPath } = useAppRoutes();
  const remnawaveApi = useRemnawaveApi();
  const analyticsApi = useAnalyticsApi();
  const navigate = useNavigation();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const { authUser, rmnUser, tgUser, loading } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();
  const { platformType } = usePlatformStore();
  const connectingRef = useRef(false);

  // Re-run on every landing: if the user arrives directly at /subscribe with
  // a ?ref= param, capture it. First-touch-guarded — no-op once the cookie
  // is set.
  useEffect(() => {
    captureReferral();
  }, []);

  // Navigation side-effects based on auth + account state:
  //   - Already resolved → subscription page
  //   - Web, auth resolved, no session → login gate (email verified via magic link first)
  //   - TMA → hide back button
  useEffect(() => {
    if (rmnUser && (authUser || tgUser)) {
      navigate(profileSubscriptionPath);
      return;
    }
    if (platformType === 'web' && !loading && !authUser) {
      navigate(authGateRedirectPath);
      return;
    }
    if (platformType === 'telegram') {
      backButton.hide();
    }
  }, [
    authUser,
    tgUser,
    rmnUser,
    loading,
    navigate,
    profileSubscriptionPath,
    authGateRedirectPath,
    platformType,
  ]);

  // Web auto-connect: once Supabase auth resolves and there's still no remnawave
  // account, create it automatically using the verified JWT email — no form input
  // needed since the email was already collected during magic-link login.
  // connectingRef guards against double-invocation from React Strict Mode or
  // multiple onAuthStateChange fires before rmnUser lands in the store.
  useEffect(() => {
    if (platformType !== 'web' || !authUser || rmnUser || connectingRef.current) return;
    connectingRef.current = true;

    remnawaveApi
      .connectEmail('', { inviterId: getReferral() ?? undefined })
      .then((user) => {
        if (!user) return;
        setRmnUser(user);
        const attribution = getAttribution();
        if (attribution) analyticsApi.trackUserCreated(user, attribution);
        clearReferral();
        clearAttribution();
        navigate(`/profile/subscription`);
      })
      .catch((err) => {
        connectingRef.current = false;
        console.error(err);
      });
  }, [platformType, authUser, rmnUser, remnawaveApi, analyticsApi, navigate, setRmnUser]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional fire-once
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
    const user = await remnawaveApi.connectEmail(email, {
      inviterId: getReferral() ?? undefined,
    });

    setRmnUser(user ?? null);

    if (user) {
      if (tgUser.language_code) {
        await remnawaveApi.upsertMyMetadata({ lang: tgUser.language_code });
      }
      const attribution = getAttribution();
      if (attribution) analyticsApi.trackUserCreated(user, attribution);
      clearReferral();
      clearAttribution();
    }

    navigate(profileSubscriptionPath);
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
      }
    } catch {
      setError(t('getSubscription.error_failed_to_create'));
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const isConnecting = platformType === 'web' && !!authUser && !rmnUser;

  return {
    email,
    error,
    hasError,
    isLoading,
    isConnecting,
    handleEmailChange,
    handleSubmit,
  };
}
