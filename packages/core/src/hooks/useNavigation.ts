import { useCallback } from 'react';
import { type NavigateOptions, type To, useNavigate } from 'react-router';
import { withReferralParam } from '../utils';

/**
 * Drop-in replacement for react-router's `useNavigate()` that transparently
 * re-attaches a captured `?ref=` to every string path navigated to. Centralizes
 * what would otherwise be a `withReferralParam(...)` call at every call site.
 */
export function useNavigation() {
  const navigate = useNavigate();

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        navigate(to);
        return;
      }

      navigate(typeof to === 'string' ? withReferralParam(to) : to, options);
    },
    [navigate],
  );
}
