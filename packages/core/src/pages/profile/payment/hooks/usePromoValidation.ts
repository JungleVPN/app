import type { PromoErrorCode } from '@workspace/types';
import { useCallback } from 'react';
import { usePaymentsApi } from '../../../../runtime';
import { useAlertStore, useAuthStoreInfo } from '../../../../stores';

/** Maps a server promo error code to a localized alert message key. */
const PROMO_ALERT_KEYS: Record<PromoErrorCode, string> = {
  invalid: 'payment.promo.alert.invalid',
  not_active_yet: 'payment.promo.alert.notActiveYet',
  expired: 'payment.promo.alert.expired',
  not_eligible: 'payment.promo.alert.notEligible',
  not_new_user: 'payment.promo.alert.notNewUser',
  limit_reached: 'payment.promo.alert.limitReached',
  already_used: 'payment.promo.alert.alreadyUsed',
};

const FALLBACK_KEY = 'payment.promo.alert.invalid';

/**
 * Validates a promo code against the backend and drives the promo alert store.
 *
 * Keeps the alert connected to the single server-side validation flow (reused
 * via /promo/validate) without duplicating the messages: the server returns a
 * stable `code`, the client maps it to a localized key.
 */
export function usePromoValidation() {
  const { rmnUser } = useAuthStoreInfo();
  const paymentsApi = usePaymentsApi();
  const { show: showAlert, clear: clearAlert } = useAlertStore();

  /** Returns true when the code is empty or valid; false (and shows an alert) otherwise. */
  const validatePromo = useCallback(
    async (promoCode: string): Promise<boolean> => {
      const code = promoCode.trim();
      if (!code) {
        clearAlert();
        return true;
      }
      if (!rmnUser) return false;

      try {
        const result = await paymentsApi.validatePromo({
          code,
          userId: rmnUser.uuid,
          userStatus: rmnUser.status,
        });

        if (result.valid) {
          clearAlert();
          return true;
        }

        console.debug('[promo] validate response:', result);
        showAlert(result.code ? PROMO_ALERT_KEYS[result.code] : FALLBACK_KEY);
        return false;
      } catch (err) {
        console.debug('[promo] validate threw:', err);
        showAlert(FALLBACK_KEY);
        return false;
      }
    },
    [rmnUser, paymentsApi, showAlert, clearAlert],
  );

  return { validatePromo };
}
