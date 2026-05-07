import { isColorDark, on } from '@tma.js/sdk-react';

function applyDocumentColorSchemeFromTelegramVars(): void {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--tg-theme-bg-color')
    .trim();

  // Outside Telegram / before bindCssVars — keep a predictable dark shell for dev.
  if (!raw) {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    return;
  }

  let dark: boolean;
  try {
    dark = isColorDark(raw);
  } catch {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    return;
  }

  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

/**
 * Aligns HeroUI `dark` / `data-theme` with Telegram's actual palette so component
 * surfaces (popover, secondary buttons) match `--tg-theme-*` in both light and dark TG themes.
 */
export function bindTelegramDocumentColorScheme(): VoidFunction {
  applyDocumentColorSchemeFromTelegramVars();

  return on('theme_changed', () => {
    requestAnimationFrame(() => applyDocumentColorSchemeFromTelegramVars());
  });
}
