import { Button } from '@heroui/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRemnawaveApi } from '../../api';
import { Loading } from '../../components';
import { coreEnv, getTelegramStickerUrl } from '../../env';
import { useNavigation } from '../../hooks';
import { fetchBillingState } from '../../hooks/useSavedMethodsData';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { type IAuthState, useAuthStore, useSubscriptionInfoStore } from '../../stores';
import { Heading, Paragraph, TgsSticker } from '../../ui';
import {
  checkoutEventProperties,
  type PurchaseConversion,
  phCapture,
  takePendingCheckout,
  takePendingPurchase,
  takePendingYookassaPayment,
  trackPurchaseConversion,
} from '../../utils';

type RemnawaveApi = ReturnType<typeof useRemnawaveApi>;
type PaymentsApi = ReturnType<typeof usePaymentsApi>;

// The profile and billing are fetched once and cached, so after an in-app
// checkout they still hold the pre-payment state. The webhook that extends the
// expiry and records the subscription may land a moment after the payer does,
// so poll briefly until the expiry moves, then refetch billing.
async function refreshProfile(remnawaveApi: RemnawaveApi, paymentsApi: PaymentsApi) {
  if (!(await isSignedIn())) return;
  await pollProfile(remnawaveApi);
  await fetchBillingState(paymentsApi);
}

// The public checkout lands guests here too. They have no profile to refetch,
// and asking for one only earns a 401, so wait for the session to resolve and
// refresh signed-in visitors alone.
function isSignedIn(): Promise<boolean> {
  const signedIn = ({ authUser, tgInitDataRaw }: IAuthState) =>
    authUser !== null || tgInitDataRaw !== null;
  const current = useAuthStore.getState();
  if (!current.loading) return Promise.resolve(signedIn(current));
  return new Promise((resolve) => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.loading) return;
      unsubscribe();
      resolve(signedIn(state));
    });
  });
}

async function pollProfile(remnawaveApi: RemnawaveApi) {
  const cachedExpiry = useSubscriptionInfoStore.getState().subscription?.user.expiresAt;
  for (let attempt = 0; attempt < 5; attempt++) {
    const user = await remnawaveApi.getMe().catch(() => null);
    const fresh =
      user && (await remnawaveApi.getSubscriptionInfoByShortUuid(user.shortUuid).catch(() => null));
    if (user) useAuthStore.getState().actions.setRmnUser(user);
    if (fresh) {
      useSubscriptionInfoStore.getState().actions.setSubscriptionInfo({ subscription: fresh });
    }
    if (fresh && fresh.user.expiresAt !== cachedExpiry) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

/**
 * The outcome Whop appends when an off-site step, such as some 3D Secure
 * checks, sends the payer back here — which it does whatever happened.
 */
function readWhopReturn(): { paymentId: string; status: string } | null {
  const params = new URLSearchParams(window.location.search);
  const paymentId = params.get('payment');
  const status = params.get('status');
  return paymentId && status ? { paymentId, status } : null;
}

const WHOP_FULFILMENT_POLL_MS = 1000;
const WHOP_FULFILMENT_POLL_ATTEMPTS = 30;

/**
 * Whether our webhook fulfilled a Whop payment as the payer's first
 * subscription. The webhook may land after the payer does, so ask until it
 * has; a payment never fulfilled in the wait is not reported.
 */
async function isFirstWhopPayment(paymentsApi: PaymentsApi, paymentId: string) {
  for (let attempt = 0; attempt < WHOP_FULFILMENT_POLL_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, WHOP_FULFILMENT_POLL_MS));
    const status = await paymentsApi.getPublicWhopPaymentStatus(paymentId).catch(() => null);
    if (status?.fulfilled) return status.firstPayment;
  }
  return false;
}

const WHOP_UNPAID_STATUSES: ReadonlySet<string> = new Set(['failed', 'canceled']);
const YOOKASSA_UNPAID_STATUSES: ReadonlySet<string> = new Set(['canceled', 'pending']);

/**
 * What the payer came back from: whether it went unpaid, and — settled
 * separately, as Whop's answer can lag behind the payer — whether it is the
 * payer's first purchase, the only kind reported to Google Ads.
 */
type ReturnCheck = { unpaid: boolean; firstPayment: Promise<boolean> };

/**
 * Whop's off-site steps and YooKassa return the payer here whether they paid
 * or not, so their outcome is asked for; a checkout that completed in the app
 * only leaves a purchase behind for a first payment. A status that cannot be
 * read stays optimistic and goes unreported.
 */
async function checkReturn(
  paymentsApi: PaymentsApi,
  purchase: PurchaseConversion | null,
): Promise<ReturnCheck> {
  const yookassaPaymentId = takePendingYookassaPayment();
  const whopReturn = readWhopReturn();

  if (whopReturn) {
    const reportable =
      whopReturn.status === 'succeeded' && purchase?.transactionId === whopReturn.paymentId;
    return {
      unpaid: WHOP_UNPAID_STATUSES.has(whopReturn.status),
      firstPayment: reportable
        ? isFirstWhopPayment(paymentsApi, whopReturn.paymentId)
        : Promise.resolve(false),
    };
  }

  if (!yookassaPaymentId)
    return { unpaid: false, firstPayment: Promise.resolve(purchase !== null) };

  const payment = await paymentsApi
    .getPublicYookassaPaymentStatus(yookassaPaymentId)
    .catch(() => null);
  return {
    unpaid: payment !== null && YOOKASSA_UNPAID_STATUSES.has(payment.status),
    firstPayment: Promise.resolve(payment?.status === 'succeeded' && payment.firstPayment),
  };
}

export default function SubscriptionSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const { profileSubscriptionPath, paymentFailPath } = useAppRoutes();
  const paymentsApi = usePaymentsApi();
  const remnawaveApi = useRemnawaveApi();
  const successStickerUrl = getTelegramStickerUrl(coreEnv.successStickerFileId);
  const [outcome, setOutcome] = useState<'checking' | 'paid' | 'unpaid'>('checking');

  useEffect(() => {
    const purchase = takePendingPurchase();
    void checkReturn(paymentsApi, purchase).then(({ unpaid, firstPayment }) => {
      setOutcome(unpaid ? 'unpaid' : 'paid');
      // An unpaid checkout is left for `/payment/fail` to report.
      if (unpaid) return;
      const checkout = takePendingCheckout();
      void firstPayment.then((first) => {
        if (first && purchase) trackPurchaseConversion(purchase);
        if (checkout) {
          phCapture('purchase_completed', {
            ...checkoutEventProperties(checkout),
            first_payment: first,
          });
        }
      });
    });
  }, [paymentsApi]);

  useEffect(() => {
    if (outcome === 'unpaid') navigate(paymentFailPath, { replace: true });
    if (outcome === 'paid') void refreshProfile(remnawaveApi, paymentsApi);
  }, [outcome, navigate, paymentFailPath, remnawaveApi, paymentsApi]);

  if (outcome !== 'paid') return <Loading />;
  return (
    <main className='flex min-h-full flex-1 flex-col items-center px-6 pt-16 pb-10 sm:justify-center sm:pt-10'>
      <div className='flex w-full max-w-md flex-1 flex-col items-center sm:flex-none'>
        <div className='flex flex-1 flex-col items-center justify-center gap-10 sm:flex-none sm:gap-12'>
          {successStickerUrl && (
            <TgsSticker className='h-48 w-48 sm:h-56 sm:w-56' src={successStickerUrl} />
          )}

          <div className='flex flex-col items-center gap-3 text-center'>
            <Heading>{t('subscriptionSuccess.title')}</Heading>
            <Paragraph>{t('subscriptionSuccess.description')}</Paragraph>
          </div>
        </div>

        <Button
          fullWidth
          className='mt-12 sm:mt-10'
          size='lg'
          onPress={() => navigate(profileSubscriptionPath, { replace: true })}
        >
          {t('subscriptionSuccess.connect')}
        </Button>
      </div>
    </main>
  );
}
