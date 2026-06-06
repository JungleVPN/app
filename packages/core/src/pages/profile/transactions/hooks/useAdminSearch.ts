import type { AdminPaymentDto } from '@workspace/types';
import { useCallback, useState } from 'react';
import { usePaymentsApi } from '../../../../runtime';

interface UseAdminSearchState {
  query: string;
  results: AdminPaymentDto[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}

interface UseAdminSearchActions {
  setQuery: (q: string) => void;
  handleSearch: () => Promise<void>;
}

export function useAdminSearch(): UseAdminSearchState & UseAdminSearchActions {
  const paymentsApi = usePaymentsApi();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminPaymentDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await paymentsApi.searchPayments(q);
      setResults(data);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, paymentsApi]);

  return { query, results, isLoading, error, hasSearched, setQuery, handleSearch };
}
