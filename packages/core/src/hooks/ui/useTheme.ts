import { useCallback, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'jungleVPN-theme';

function getInitialTheme(): Theme {
  if (import.meta.env.SSR) return 'light';
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return 'light';
}

function applyTheme(theme: Theme) {
  if (import.meta.env.SSR) return;
  const html = document.documentElement;
  html.setAttribute('data-no-transition', '');
  html.classList.remove('light', 'dark');
  html.classList.add(theme);
  html.setAttribute('data-theme', theme);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      html.removeAttribute('data-no-transition');
    });
  });
}

let currentTheme: Theme = getInitialTheme();
const listeners = new Set<() => void>();

function setTheme(theme: Theme) {
  currentTheme = theme;
  if (!import.meta.env.SSR) localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return currentTheme;
}

applyTheme(currentTheme);

function getServerSnapshot(): Theme {
  return 'light';
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = useCallback(() => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, toggleTheme };
}
