import type { AdminPaymentDto } from '@workspace/types';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { usePaymentsApi } from '../../../runtime';
import { useAuthStoreInfo } from '../../../stores';
import { getAdminId } from '../../../utils';

interface UseAdminPaymentDetailsResult {
  payment: AdminPaymentDto | null;
  isLoading: boolean;
  error: string | null;
  paymentId: string | undefined;
}

export function useAdminPaymentDetails(): UseAdminPaymentDetailsResult {
  const { paymentId } = useParams<{ paymentId: string }>();
  const paymentsApi = usePaymentsApi();
  const { tgUser, authUser } = useAuthStoreInfo();

  const [payment, setPayment] = useState<AdminPaymentDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) return;

    const adminId = getAdminId(tgUser, authUser);
    if (!adminId) {
      setError('No admin identity available');
      return;
    }

    setIsLoading(true);
    setError(null);

    paymentsApi
      .searchPayments(paymentId, adminId)
      .then((results) => {
        setPayment(results[0] ?? null);
        if (!results[0]) setError('Payment not found');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load payment'))
      .finally(() => setIsLoading(false));
  }, [paymentId, paymentsApi, tgUser, authUser]);

  return { payment, isLoading, error, paymentId };
}
