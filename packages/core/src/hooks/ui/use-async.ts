import { useCallback, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

/**
 * Generic hook for managing async operations with loading/error states.
 * Use this as a building block for data fetching hooks.
 */
// ToDo move to router actions
export function useAsync<T, Args extends unknown[] = []>(asyncFn: (...args: Args) => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const mountedRef = useRef(true);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await asyncFn(...args);
        if (mountedRef.current) {
          setState({ data, error: null, isLoading: false });
        }
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (mountedRef.current) {
          setState({ data: null, error, isLoading: false });
        }
        return null;
      }
    },
    [asyncFn],
  );

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false });
  }, []);

  return { ...state, execute, reset };
}
