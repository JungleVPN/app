import { useCallback } from 'react';
import type { createPaymentsApi } from '../api';
import { useAsync } from './use-async';

type PaymentsApi = ReturnType<typeof createPaymentsApi>;

/**
 * Creates a new YooKassa payment session.
 * On success `execute` returns a `PaymentSession` with a redirect `url`.
 *
 * Usage:
 *   const { isLoading, execute } = useCreatePaymentSession(paymentsApi);
 *   const session = await execute(dto);
 *   if (session) window.location.href = session.url;
 */
export function useCreatePaymentSession(api: PaymentsApi) {
  const fn = useCallback(
    (dto: Parameters<PaymentsApi['createYookassaSession']>[0]) => api.createYookassaSession(dto),
    [api],
  );
  return useAsync(fn);
}

/**
 * Deletes a saved payment method by id.
 * Call `execute(userId, id)`, then refetch the methods list on success.
 */
export function useDeleteSavedMethod(api: PaymentsApi) {
  const fn = useCallback((userId: string, id: string) => api.deleteSavedMethod(userId, id), [api]);
  return useAsync(fn);
}

/**
 * Requests a Telegram Stars invoice link from the backend.
 * Returns { invoiceLink } on success — open it with WebApp.openInvoice().
 */
export function useCreateTelegramStarsInvoice(api: PaymentsApi) {
  const fn = useCallback(
    (dto: Parameters<PaymentsApi['createTelegramStarsInvoice']>[0]) =>
      api.createTelegramStarsInvoice(dto),
    [api],
  );
  return useAsync(fn);
}
