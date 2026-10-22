import { useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router';

/** `useLayoutEffect` warns during SSR, where layout effects never run anyway. */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Resets the scroll position whenever the pathname changes.
 *
 * React Router keeps the window scroll position across client-side navigations, so
 * following a CTA from halfway down the landing page opened /pricing mid-page. Keyed on
 * the pathname only, so in-page anchors (#pricing, #partnership) keep their scroll.
 *
 * It has to be a layout effect: a passive effect runs after the browser has painted,
 * so the new page flashed at the old scroll offset before jumping to the top.
 *
 * Back and forward (POP) navigations are left alone, so returning to a page keeps the
 * position it was left at — the same rule PrivacyPolicyPage already applied.
 */
export function useScrollToTopOnNavigate() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useIsomorphicLayoutEffect(() => {
    if (navigationType === 'POP') return;

    const root = document.getElementById('root');
    if (root && root.scrollHeight > root.clientHeight) root.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, navigationType]);
}
