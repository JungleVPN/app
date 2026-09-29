import { useCallback } from 'react';
import { type NavigateOptions, type To, useLocation, useNavigate } from 'react-router';
import { localizePath } from '../utils/domain';

interface NavigationOptions extends NavigateOptions {
  target?: 'self' | 'blank';
}

export function useNavigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

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

      navigate(typeof to === 'string' ? localizePath(to, pathname) : to, options);
    },
    [navigate, pathname],
  );
}
