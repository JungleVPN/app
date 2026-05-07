import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
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

  // Tab positions and list width, measured once after mount and stable thereafter.
  const tabPositionsRef = useRef<Partial<Record<TabValue, { left: number; width: number }>>>({});
  // Cached list width — avoids reading offsetWidth (layout reflow risk) inside handlePan.
  const listWidthRef = useRef(0);

  const indicatorX = useMotionValue(0);
  const indicatorWidth = useMotionValue(0);

  // Overlap ratio (0–1): how much of each tab the indicator currently covers.
  // Written into --tab-overlap on the button so color-mix() in CSS blends the color.
  //
  // IMPORTANT: subscribe only to indicatorX, read indicatorWidth.get() inside.
  // useTransform([indicatorX, indicatorWidth], fn) would fire the callback TWICE
  // per animation frame — once per source MotionValue — doubling DOM mutations and
  // style-recalculation work every frame. Reading .get() inside a single-source
  // transform fires it exactly once per frame, at the moment indicatorX changes.
  // indicatorWidth always changes in the same frame as indicatorX (both are driven
  // by animateIndicatorTo), so .get() always returns the current-frame value.
  const subscriptionOverlap = useTransform(indicatorX, (x) => {
    const pos = tabPositionsRef.current.subscription;
    if (!pos || pos.width === 0) return 0;
    const w = indicatorWidth.get();
    const start = Math.max(x, pos.left);
    const end = Math.min(x + w, pos.left + pos.width);
    return Math.max(0, end - start) / pos.width;
  });

  const paymentsOverlap = useTransform(indicatorX, (x) => {
    const pos = tabPositionsRef.current.payments;
    if (!pos || pos.width === 0) return 0;
    const w = indicatorWidth.get();
    const start = Math.max(x, pos.left);
    const end = Math.min(x + w, pos.left + pos.width);
    return Math.max(0, end - start) / pos.width;
  });

  const overlapValues = useMemo(
    () => ({ subscription: subscriptionOverlap, payments: paymentsOverlap }),
    [subscriptionOverlap, paymentsOverlap],
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
        icon: <IconWallet className='size-7' />,
      },
      {
        id: 'payments',
        label: t('profileTabs.payment'),
        icon: <IconPig className='size-7' />,
      },
    ],
    [t],
  );

  // Stable ref callbacks — avoids React calling cleanup+setup on every re-render.
  const tabRefCallbacks = useRef({
    subscription: (el: HTMLButtonElement | null) => {
      if (el) tabRefs.current.set('subscription', el);
      else tabRefs.current.delete('subscription');
    },
    payments: (el: HTMLButtonElement | null) => {
      if (el) tabRefs.current.set('payments', el);
      else tabRefs.current.delete('payments');
    },
  });

  useLayoutEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Called once on mount — the only place getBoundingClientRect is ever used.
  const measureAllTabs = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const listRect = list.getBoundingClientRect();
    // Cache list width so handlePan never reads offsetWidth during pointer events.
    listWidthRef.current = listRect.width;
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

  // Measure once before first paint so overlap transforms have data when
  // indicatorX.set() fires, and the indicator appears in the right place immediately.
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
      const newX = indicatorX.get() + info.delta.x;
      const currentWidth = indicatorWidth.get();
      // listWidthRef.current is cached from measureAllTabs — never reads offsetWidth
      // here which would risk a synchronous layout reflow on every pointer event.
      const clamped = Math.max(0, Math.min(newX, listWidthRef.current - currentWidth));
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

  // Stable click handlers — avoids creating new arrow functions on every render.
  const clickHandlers = useRef({
    subscription: () => handleTabClick('subscription'),
    payments: () => handleTabClick('payments'),
  });
  useLayoutEffect(() => {
    clickHandlers.current = {
      subscription: () => handleTabClick('subscription'),
      payments: () => handleTabClick('payments'),
    };
  }, [handleTabClick]);

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
          <motion.button
            key={tab.id}
            ref={tabRefCallbacks.current[tab.id]}
            type='button'
            role='tab'
            aria-selected={tab.id === activeTab}
            className={css.tab}
            // --tab-overlap drives color-mix() in CSS — no second content layer needed.
            style={{ '--tab-overlap': overlapValues[tab.id] } as React.CSSProperties}
            onClick={clickHandlers.current[tab.id]}
          >
            <span className={css.tabInner}>
              <span className={css.tabIcon}>{tab.icon}</span>
              <span className={css.tabLabel}>{tab.label}</span>
            </span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};
