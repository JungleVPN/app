import { useCallback } from 'react';
import { type NavigateOptions, type To, useNavigate } from 'react-router';

interface NavigationOptions extends NavigateOptions {
  target?: 'self' | 'blank';
}

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

      navigate(to, options);
    },
    [navigate],
  );
}
