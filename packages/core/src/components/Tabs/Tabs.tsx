import { IconNetwork, IconShieldSearch } from '@tabler/icons-react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import IconDevices from '../../assets/icons/device-tab-icon.svg?react';
import IconPig from '../../assets/icons/payment-tab-icon.svg?react';
import { useAppRoutes } from '../../runtime';
import { useAuthStoreInfo, useNavbarStore } from '../../stores';
import { isAdminUser } from '../../utils';
import css from './Tabs.module.css';

type TabValue = 'subscription' | 'payments' | 'devices' | 'admin';

interface TabDef {
  id: TabValue;
  label: string;
  icon: React.ReactNode;
}

const BASE_TAB_VALUES: TabValue[] = ['subscription', 'payments', 'devices'];

const SPRING = { type: 'spring', stiffness: 400, damping: 35 } as const;
const PRESS_SPRING = { type: 'spring', stiffness: 500, damping: 40 } as const;

function normalizePath(p: string) {
  if (p === '/') return '/';
  return p.replace(/\/$/, '');
}

function getActiveTab(
  pathname: string,
  subscriptionPath: string,
  paymentPath: string,
  devicesPath: string,
  adminPath?: string,
): TabValue {
  const norm = normalizePath(pathname);
  if (norm === normalizePath(paymentPath)) return 'payments';
  if (norm === normalizePath(devicesPath)) return 'devices';
  if (adminPath && norm === normalizePath(adminPath)) return 'admin';
  if (norm === normalizePath(subscriptionPath)) return 'subscription';
  // Fallback: match the last URL segment against known tab IDs.
  const ALL_TAB_VALUES: TabValue[] = ['subscription', 'payments', 'devices', 'admin'];
  const segment = pathname.split('/').filter(Boolean).pop() as TabValue | undefined;
  return segment && ALL_TAB_VALUES.includes(segment) ? segment : 'subscription';
}

export const Navbar = () => {
  const { profileSubscriptionPath, profilePaymentPath, profileDevicesPath, profileAdminPath } =
    useAppRoutes();
  const { isVisible } = useNavbarStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { tgUser, authUser } = useAuthStoreInfo();

  const isAdmin = isAdminUser(tgUser, authUser);

  const TAB_VALUES = useMemo<TabValue[]>(
    () => (isAdmin ? [...BASE_TAB_VALUES, 'admin'] : BASE_TAB_VALUES),
    [isAdmin],
  );

  const activeTab = getActiveTab(
    pathname,
    profileSubscriptionPath,
    profilePaymentPath,
    profileDevicesPath,
    profileAdminPath,
  );

  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<TabValue, HTMLButtonElement>>(new Map());
  const activeTabRef = useRef(activeTab);
  const isDraggingRef = useRef(false);
  const didInitRef = useRef(false);
  const pendingAnimationRef = useRef<TabValue | null>(null);
  const lastPanEndTimeRef = useRef(0);

  const tabPositionsRef = useRef<Partial<Record<TabValue, { left: number; width: number }>>>({});
  const listWidthRef = useRef(0);

  const barScale = useMotionValue(1);

  const indicatorX = useMotionValue(0);
  const indicatorWidth = useMotionValue(0);

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

  const devicesOverlap = useTransform(indicatorX, (x) => {
    const pos = tabPositionsRef.current.devices;
    if (!pos || pos.width === 0) return 0;
    const w = indicatorWidth.get();
    const start = Math.max(x, pos.left);
    const end = Math.min(x + w, pos.left + pos.width);
    return Math.max(0, end - start) / pos.width;
  });

  const adminOverlap = useTransform(indicatorX, (x) => {
    const pos = tabPositionsRef.current.admin;
    if (!pos || pos.width === 0) return 0;
    const w = indicatorWidth.get();
    const start = Math.max(x, pos.left);
    const end = Math.min(x + w, pos.left + pos.width);
    return Math.max(0, end - start) / pos.width;
  });

  const overlapValues = useMemo(
    () => ({
      subscription: subscriptionOverlap,
      payments: paymentsOverlap,
      devices: devicesOverlap,
      admin: adminOverlap,
    }),
    [subscriptionOverlap, paymentsOverlap, devicesOverlap, adminOverlap],
  );

  const tabPaths = useMemo(
    () =>
      ({
        subscription: profileSubscriptionPath,
        payments: profilePaymentPath,
        devices: profileDevicesPath,
        admin: profileAdminPath,
      }) satisfies Record<TabValue, string>,
    [profileSubscriptionPath, profilePaymentPath, profileDevicesPath, profileAdminPath],
  );

  const tabs = useMemo<TabDef[]>(
    () => [
      {
        id: 'subscription',
        label: t('profileTabs.subscription'),
        icon: <IconNetwork stroke={1.5} className='size-7' />,
      },
      {
        id: 'payments',
        label: t('profileTabs.payment'),
        icon: <IconPig className='size-7' />,
      },
      {
        id: 'devices',
        label: t('profileTabs.devices'),
        icon: <IconDevices className='size-7' />,
      },
      ...(isAdmin
        ? [
            {
              id: 'admin' as const,
              label: t('profileTabs.admin', 'Admin'),
              icon: <IconShieldSearch stroke={1.5} className='size-7' />,
            },
          ]
        : []),
    ],
    [t, isAdmin],
  );

  const tabRefCallbacks = useRef<Record<TabValue, (el: HTMLButtonElement | null) => void>>({
    subscription: (el) => {
      if (el) tabRefs.current.set('subscription', el);
      else tabRefs.current.delete('subscription');
    },
    payments: (el) => {
      if (el) tabRefs.current.set('payments', el);
      else tabRefs.current.delete('payments');
    },
    devices: (el) => {
      if (el) tabRefs.current.set('devices', el);
      else tabRefs.current.delete('devices');
    },
    admin: (el) => {
      if (el) tabRefs.current.set('admin', el);
      else tabRefs.current.delete('admin');
    },
  });

  useLayoutEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const measureAllTabs = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const listRect = list.getBoundingClientRect();
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
  }, [TAB_VALUES]);

  const animateIndicatorTo = useCallback(
    (id: TabValue, instant = false) => {
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

  useLayoutEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    measureAllTabs();
    animateIndicatorTo(activeTabRef.current, true);
  }, [animateIndicatorTo, measureAllTabs]);

  useLayoutEffect(() => {
    if (isDraggingRef.current) return;
    if (pendingAnimationRef.current === activeTab) {
      pendingAnimationRef.current = null;
      return;
    }
    animateIndicatorTo(activeTab);
  }, [activeTab, animateIndicatorTo]);

  const findNearestTab = useCallback(
    (centerX: number): TabValue => {
      let nearest: TabValue = 'subscription';
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
    },
    [TAB_VALUES],
  );

  const handleBarPressIn = useCallback(() => {
    animate(barScale, 1.02, PRESS_SPRING);
  }, [barScale]);

  const handleBarPressOut = useCallback(() => {
    animate(barScale, 1, PRESS_SPRING);
  }, [barScale]);

  const handlePanStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handlePan = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
      const newX = indicatorX.get() + info.delta.x;
      const currentWidth = indicatorWidth.get();
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
    pendingAnimationRef.current = nearest;
    animateIndicatorTo(nearest);
    if (nearest !== activeTabRef.current) {
      navigate(tabPaths[nearest]);
    }
  }, [indicatorX, indicatorWidth, findNearestTab, navigate, tabPaths, animateIndicatorTo]);

  const handleTabClick = useCallback(
    (id: TabValue) => {
      if (isDraggingRef.current) return;
      if (Date.now() - lastPanEndTimeRef.current < 150) return;
      pendingAnimationRef.current = id;
      animateIndicatorTo(id);
      navigate(tabPaths[id]);
    },
    [navigate, tabPaths, animateIndicatorTo],
  );

  const clickHandlers = useRef<Record<TabValue, () => void>>({
    subscription: () => handleTabClick('subscription'),
    payments: () => handleTabClick('payments'),
    devices: () => handleTabClick('devices'),
    admin: () => handleTabClick('admin'),
  });
  useLayoutEffect(() => {
    clickHandlers.current = {
      subscription: () => handleTabClick('subscription'),
      payments: () => handleTabClick('payments'),
      devices: () => handleTabClick('devices'),
      admin: () => handleTabClick('admin'),
    };
  }, [handleTabClick]);

  return createPortal(
    <motion.div
      className={css.root}
      style={{ scale: barScale }}
      initial={false}
      animate={{ y: isVisible ? 0 : 'calc(100% + 24px)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      onPointerDown={handleBarPressIn}
      onPointerUp={handleBarPressOut}
      onPointerCancel={handleBarPressOut}
    >
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

        {tabs.map((tab, index) => {
          return (
            <motion.button
              key={tab.id}
              ref={tabRefCallbacks.current[tab.id]}
              type='button'
              role='tab'
              aria-selected={index === 0 || tab.id === activeTab}
              className={css.tab}
              style={{ '--tab-overlap': overlapValues[tab.id] } as React.CSSProperties}
              onClick={clickHandlers.current[tab.id]}
            >
              <span className={css.tabInner}>
                <span className={css.tabIcon}>{tab.icon}</span>
                <span className={css.tabLabel}>{tab.label}</span>
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </motion.div>,
    document.body,
  );
};
