import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import IconPig from '../../assets/icons/payment-tab-icon.svg?react';
import IconWallet from '../../assets/icons/wallet-icon.svg?react';
import { useAppRoutes } from '../../runtime';
import css from './Tabs.module.css';

type TabValue = 'subscription' | 'payments';

interface TabDef {
  id: TabValue;
  label: string;
  icon: React.ReactNode;
}

const TAB_VALUES: TabValue[] = ['subscription', 'payments'];

const SPRING = { type: 'spring', stiffness: 400, damping: 35 } as const;

function normalizePath(p: string) {
  if (p === '/') return '/';
  return p.replace(/\/$/, '');
}

function getActiveTab(pathname: string, subscriptionPath: string, paymentPath: string): TabValue {
  const norm = normalizePath(pathname) || '/';
  const pay = normalizePath(paymentPath);
  const sub = normalizePath(subscriptionPath);
  if (norm === pay) return 'payments';
  if (norm === sub || (sub === '/' && norm === '/')) return 'subscription';
  const segment = pathname.split('/').filter(Boolean).pop() as TabValue | undefined;
  return segment && TAB_VALUES.includes(segment) ? segment : 'subscription';
}

export const Navbar = () => {
  const { profileSubscriptionPath, profilePaymentPath } = useAppRoutes();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeTab = getActiveTab(pathname, profileSubscriptionPath, profilePaymentPath);

  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<TabValue, HTMLButtonElement>>(new Map());
  const activeTabRef = useRef(activeTab);
  const isDraggingRef = useRef(false);
  const didInitRef = useRef(false);
  // Tracks a tab whose animation was already started by a direct interaction so
  // the useLayoutEffect doesn't restart it from scratch after the React render.
  const pendingAnimationRef = useRef<TabValue | null>(null);
  // Timestamp of the last pan end — used to suppress the synthetic onClick that
  // fires after pointerup on a drag release, which would otherwise restart the
  // spring animation mid-flight.
  const lastPanEndTimeRef = useRef(0);

  // Tab positions relative to the list, measured once after mount and stable thereafter.
  const tabPositionsRef = useRef<Partial<Record<TabValue, { left: number; width: number }>>>({});

  const indicatorX = useMotionValue(0);
  const indicatorWidth = useMotionValue(0);

  // Each tab has an accent-coloured overlay layer whose clip-path is computed
  // from how much the indicator overlaps with it.
  //
  // inset(0 clipRight 0 clipLeft):
  //   clipLeft  = pixels of the tab's left edge NOT under the indicator
  //   clipRight = pixels of the tab's right edge NOT under the indicator
  //
  // Result: only the overlapping region shows in accent colour.
  // `round 4rem` makes the clip follow the pill shape of the indicator.
  // The 4px vertical inset matches the indicator's top: 4px offset so the
  // rounded corners sit at the same position as the actual indicator pill.
  const clipPathSubscription = useTransform(indicatorX, (x) => {
    const pos = tabPositionsRef.current.subscription;
    if (!pos) return 'inset(0 100% 0 0 round 4rem)';
    const iw = indicatorWidth.get();
    const clipLeft = Math.max(0, x - pos.left);
    const clipRight = Math.max(0, pos.left + pos.width - (x + iw));
    if (clipLeft + clipRight >= pos.width) return 'inset(0 100% 0 0 round 4rem)';
    return `inset(4px ${clipRight}px 4px ${clipLeft}px round 4rem)`;
  });

  const clipPathPayments = useTransform(indicatorX, (x) => {
    const pos = tabPositionsRef.current.payments;
    if (!pos) return 'inset(0 100% 0 0 round 4rem)';
    const iw = indicatorWidth.get();
    const clipLeft = Math.max(0, x - pos.left);
    const clipRight = Math.max(0, pos.left + pos.width - (x + iw));
    if (clipLeft + clipRight >= pos.width) return 'inset(0 100% 0 0 round 4rem)';
    return `inset(4px ${clipRight}px 4px ${clipLeft}px round 4rem)`;
  });

  const clipPaths = useMemo(
    () => ({ subscription: clipPathSubscription, payments: clipPathPayments }),
    [clipPathSubscription, clipPathPayments],
  );

  const tabPaths = useMemo(
    () =>
      ({
        subscription: profileSubscriptionPath,
        payments: profilePaymentPath,
      }) satisfies Record<TabValue, string>,
    [profileSubscriptionPath, profilePaymentPath],
  );

  const tabs = useMemo<TabDef[]>(
    () => [
      {
        id: 'subscription',
        label: t('profileTabs.subscription'),
        icon: <IconWallet className='size-9' />,
      },
      {
        id: 'payments',
        label: t('profileTabs.payment'),
        icon: <IconPig className='size-9' />,
      },
    ],
    [t],
  );

  useLayoutEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Only called once during the initial layout effect — never during animation.
  const measureAllTabs = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const listRect = list.getBoundingClientRect();
    for (const id of TAB_VALUES) {
      const el = tabRefs.current.get(id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      tabPositionsRef.current[id] = {
        left: rect.left - listRect.left,
        width: rect.width,
      };
    }
  }, []);

  const animateIndicatorTo = useCallback(
    (id: TabValue, instant = false) => {
      // Read from the cached positions — never forces a layout reflow.
      const pos = tabPositionsRef.current[id];
      if (!pos) return;
      if (instant) {
        indicatorX.set(pos.left);
        indicatorWidth.set(pos.width);
      } else {
        animate(indicatorX, pos.left, SPRING);
        animate(indicatorWidth, pos.width, SPRING);
      }
    },
    [indicatorX, indicatorWidth],
  );

  // Measure once before first paint so clip-path transforms have data
  // when indicatorX.set() fires, and the indicator appears in the right place immediately.
  // activeTabRef.current is used instead of activeTab so the deps are stable
  // (both callbacks have stable identity) and the effect genuinely runs once.
  useLayoutEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    measureAllTabs();
    animateIndicatorTo(activeTabRef.current, true);
  }, [animateIndicatorTo, measureAllTabs]);

  useLayoutEffect(() => {
    if (isDraggingRef.current) return;
    if (pendingAnimationRef.current === activeTab) {
      // Animation already started by handleTabClick / handlePanEnd — don't restart it.
      pendingAnimationRef.current = null;
      return;
    }
    // External navigation (back/forward button, programmatic navigate elsewhere).
    animateIndicatorTo(activeTab);
  }, [activeTab, animateIndicatorTo]);

  const findNearestTab = useCallback((centerX: number): TabValue => {
    let nearest: TabValue = TAB_VALUES[0];
    let minDist = Number.POSITIVE_INFINITY;
    for (const id of TAB_VALUES) {
      const pos = tabPositionsRef.current[id];
      if (!pos) continue;
      const dist = Math.abs(centerX - (pos.left + pos.width / 2));
      if (dist < minDist) {
        minDist = dist;
        nearest = id;
      }
    }
    return nearest;
  }, []);

  const handlePanStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handlePan = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
      const list = listRef.current;
      if (!list) return;
      const newX = indicatorX.get() + info.delta.x;
      const currentWidth = indicatorWidth.get();
      const clamped = Math.max(0, Math.min(newX, list.offsetWidth - currentWidth));
      indicatorX.set(clamped);
    },
    [indicatorX, indicatorWidth],
  );

  const handlePanEnd = useCallback(() => {
    isDraggingRef.current = false;
    lastPanEndTimeRef.current = Date.now();
    const currentX = indicatorX.get();
    const currentWidth = indicatorWidth.get();
    const nearest = findNearestTab(currentX + currentWidth / 2);
    // Animate first — navigate() triggers a React render which would otherwise
    // restart the spring mid-flight via useLayoutEffect.
    pendingAnimationRef.current = nearest;
    animateIndicatorTo(nearest);
    if (nearest !== activeTabRef.current) {
      navigate(tabPaths[nearest]);
    }
  }, [indicatorX, indicatorWidth, findNearestTab, navigate, tabPaths, animateIndicatorTo]);

  const handleTabClick = useCallback(
    (id: TabValue) => {
      if (isDraggingRef.current) return;
      // Suppress the synthetic onClick that fires right after a drag release —
      // pointerup ends the pan but still produces a click event on the element
      // underneath, which would restart the spring animation mid-flight.
      if (Date.now() - lastPanEndTimeRef.current < 150) return;
      // Start animation immediately — before navigate() triggers a React render.
      pendingAnimationRef.current = id;
      animateIndicatorTo(id);
      navigate(tabPaths[id]);
    },
    [navigate, tabPaths, animateIndicatorTo],
  );

  return (
    <div className={css.root}>
      <motion.div
        ref={listRef}
        role='tablist'
        aria-label={t('profileTabs.ariaLabel')}
        className={css.list}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
      >
        {/* Sliding pill — sits behind tab content */}
        <motion.div
          aria-hidden
          className={css.indicator}
          style={{ x: indicatorX, width: indicatorWidth }}
        />

        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
              else tabRefs.current.delete(tab.id);
            }}
            type='button'
            role='tab'
            aria-selected={tab.id === activeTab}
            className={css.tab}
            onClick={() => handleTabClick(tab.id)}
          >
            {/* Base layer — default colour, always fully visible */}
            <span className={css.tabInner}>
              <span className={css.tabIcon}>{tab.icon}</span>
              <span className={css.tabLabel}>{tab.label}</span>
            </span>

            {/* Accent layer — clipped to only the region the indicator covers */}
            <motion.span
              aria-hidden
              className={css.tabInnerActive}
              style={{ clipPath: clipPaths[tab.id] }}
            >
              <span className={css.tabIcon}>{tab.icon}</span>
              <span className={css.tabLabel}>{tab.label}</span>
            </motion.span>
          </button>
        ))}
      </motion.div>
    </div>
  );
};
