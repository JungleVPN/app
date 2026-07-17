import type { AdminPaymentDto } from '@workspace/types';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { usePaymentsApi } from '../../../../../runtime';

interface UseTransactionDetailsResult {
  payment: AdminPaymentDto | null;
  isLoading: boolean;
  error: string | null;
}

export function useTransactionDetails(): UseTransactionDetailsResult {
  const { paymentId } = useParams<{ paymentId: string }>();
  const paymentsApi = usePaymentsApi();

  const [payment, setPayment] = useState<AdminPaymentDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) return;

    setIsLoading(true);
    setError(null);

    paymentsApi
      .searchPayments(paymentId)
      .then((results) => {
        const found = results[0] ?? null;
        setPayment(found);
        if (!found) setError('Payment not found');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load payment'))
      .finally(() => setIsLoading(false));
  }, [paymentId, paymentsApi]);

  return { payment, isLoading, error };
}
