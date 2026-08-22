import type { AdminPaymentDto } from '@workspace/types';
import { useEffect, useState } from 'react';
import { usePaymentsApi } from '../../../../../runtime';
import { useAuthStoreInfo } from '../../../../../stores';

interface UseUserTransactionsResult {
  transactions: AdminPaymentDto[];
  isLoading: boolean;
  error: string | null;
}

export function useUserTransactions(): UseUserTransactionsResult {
  const paymentsApi = usePaymentsApi();
  const { rmnUser } = useAuthStoreInfo();

  const [transactions, setTransactions] = useState<AdminPaymentDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rmnUser?.id) return;

    setIsLoading(true);
    setError(null);

    paymentsApi
      .getMyTransactions()
      .then(setTransactions)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load transactions'))
      .finally(() => setIsLoading(false));
  }, [rmnUser?.id, paymentsApi]);

  return { transactions, isLoading, error };
}
