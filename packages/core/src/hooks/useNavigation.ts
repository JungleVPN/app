import { useCallback } from 'react';
import { type NavigateOptions, type To, useNavigate } from 'react-router';
import { withReferralParam } from '../utils';

interface NavigationOptions extends NavigateOptions {
  target?: 'self' | 'blank';
}
/**
 * Drop-in replacement for react-router's `useNavigate()` that transparently
 * re-attaches a captured `?ref=` to every string path navigated to. Centralizes
 * what would otherwise be a `withReferralParam(...)` call at every call site.
 */
export function useNavigation() {
  const navigate = useNavigate();

  return useCallback(
    (to: To | number, options?: NavigationOptions) => {
      if (typeof to === 'number') {
        navigate(to);
        return;
      }

      if (options?.target === 'blank') {
        open(to.toString(), '_blank', 'noopener,noreferrer');
        return;
      }

      navigate(typeof to === 'string' ? withReferralParam(to) : to, options);
    },
    [navigate],
  );
}
