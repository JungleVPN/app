import type { TSubscriptionPageLanguageCode } from '@workspace/types';
import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useRemnawaveApi } from '../api';
import { Navbar } from '../components';
import { SubscriptionLinkDialog } from '../components/SubscriptionLinkWidget/SubscriptionLinkDialog';
import { applyUserLang } from '../core/i18n';
import { useNavigation, useSavedMethodsData, useSubscriptionData, useToltCapture } from '../hooks';
import { TermsDialog } from '../pages/profile/payment/components/TermsDialog';
import { useAppRoutes, usePaymentsApi } from '../runtime';
import {
  useAuthStore,
  useAuthStoreActions,
  useAuthStoreInfo,
  usePlatformStore,
  useSubscriptionConfigStoreActions,
} from '../stores';
import { Container } from '../ui';
import { captureReferral, isGlobalOrigin, phIdentify } from '../utils';

export function ProfileLayout() {
  const navigate = useNavigation();
  const remnawaveApi = useRemnawaveApi();
  const { tgUser, authUser, rmnUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();
  const { platformType } = usePlatformStore();
  const { getConnectEmailPath, publicPlansPath } = useAppRoutes();
  const paymentsApi = usePaymentsApi();
  const { setLanguage } = useSubscriptionConfigStoreActions();
  // Hand any affiliate attribution to the backend as soon as the user is known.
  // It lives only in this browser session, but the payment it should credit may
  // settle days later — or be a renewal with no browser involved at all.
  // Self-guarded: no-ops without a referral or once already captured.
  useToltCapture(rmnUser?.id, paymentsApi);

  // Re-capture on every profile-route entry: an invited user can land here
  // after an auth redirect before they've created an account.
  // captureReferral() is first-touch-guarded, so this is a no-op once the
  // cookie is set.
  useEffect(() => {
    captureReferral();
  }, []);

  // Locks html/body scroll in favor of an inner #root scroll container — see
  // the `.scroll-lock` rule in globals.css for why the fixed bottom
  // tab bar needs this. Scoped to this layout so other routes scroll natively.
  useEffect(() => {
    document.documentElement.classList.add('scroll-lock');
    return () => document.documentElement.classList.remove('scroll-lock');
  }, []);

  // Resolve the remnawave user from the available auth identity.
  //
  // Web:  looks up by email (authUser.email); redirects to getConnectEmailPath if not found.
  // TMA:  looks up by telegramId (tgUser.id);  redirects to getConnectEmailPath if not found.
  //
  // A RU miss is the start of the free trial: getConnectEmailPath auto-connects the
  // account, which the panel opens with TRIAL_PERIOD_IN_DAYS of access.
  //
  // Global domains are the exception: there an account only exists once a payment has
  // settled, so "not found" is the ordinary state of a logged-in visitor who has not
  // subscribed yet. Sending them to getConnectEmailPath would bounce them straight back
  // (it no longer creates accounts for global users) — ProfileSubscriptionPage offers
  // them a plan instead.
  //
  // Guard: skip the API call if rmnUser is already in the store — this avoids a
  // redundant lookup when the user just came through ConnectEmailPage, which
  // already resolved and stored the user before navigating here.
  useEffect(() => {
    if (useAuthStore.getState().rmnUser) return;
    if (authUser?.email || tgUser?.id) {
      remnawaveApi
        .getMe()
        .then((user) => {
          setRmnUser(user ?? null);
          if (user) {
            // Ties this browser's anonymous distinct_id to the canonical userId, so
            // client-side events (plan_selected, subscription_viewed, ...) merge into
            // the same PostHog person as backend-dispatched events (payment_succeeded).
            phIdentify(String(user.id));
          } else if (!isGlobalOrigin()) {
            navigate(getConnectEmailPath);
          } else navigate(publicPlansPath);
        })
        .catch(console.error);
    }
  }, [
    authUser?.email,
    remnawaveApi,
    setRmnUser,
    tgUser?.id,
    navigate,
    getConnectEmailPath,
    publicPlansPath,
  ]);

  useEffect(() => {
    if (!rmnUser) return;
    remnawaveApi
      .getMyMetadata()
      .then((meta) => {
        const currentLang = (
          platformType === 'telegram' && tgUser?.language_code
            ? tgUser.language_code
            : (meta?.lang ?? navigator.language.split('-')[0])
        ) as TSubscriptionPageLanguageCode;

        applyUserLang(currentLang);
        setLanguage(currentLang);

        if (currentLang !== meta?.lang) {
          remnawaveApi.upsertMyMetadata({ lang: currentLang }).catch(console.error);
        }
      })
      .catch(console.error);
  }, [
    platformType,
    remnawaveApi.getMyMetadata,
    remnawaveApi.upsertMyMetadata,
    rmnUser,
    setLanguage,
    tgUser?.language_code,
  ]);

  useSubscriptionData(rmnUser?.shortUuid);
  useSavedMethodsData(rmnUser?.id);

  return (
    <>
      <Container
        maxWidth={'sm'}
        className={`${platformType === 'web' ? 'pt-32 pb-22' : 'pt-4 pb-22'}`}
      >
        <Outlet />
      </Container>
      {rmnUser && <Navbar />}
      <SubscriptionLinkDialog />
      <TermsDialog />
    </>
  );
}
