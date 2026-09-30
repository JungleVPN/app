import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ar from '../../core/i18n/locales/ar.json';
import en from '../../core/i18n/locales/en.json';
import es from '../../core/i18n/locales/es.json';
import hi from '../../core/i18n/locales/hi.json';
import id from '../../core/i18n/locales/id.json';
import pt from '../../core/i18n/locales/pt.json';
import ru from '../../core/i18n/locales/ru.json';
import tr from '../../core/i18n/locales/tr.json';
import {
  FEATURES_TABS,
  FEATURES_TABS_ARIA_LABEL_KEY,
  useFeaturesTabs,
} from './featuresTabsContent';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => `translated:${key}` }),
}));

const locales = { ar, en, es, hi, id, pt, ru, tr };

const referencedKeys = (): string[] => [
  FEATURES_TABS_ARIA_LABEL_KEY,
  ...FEATURES_TABS.flatMap(({ labelKey, items }) => [
    labelKey,
    ...items.flatMap(({ titleKey, descriptionKey }) => [titleKey, descriptionKey]),
  ]),
];

const lookup = (node: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (current, segment) =>
        typeof current === 'object' && current !== null ? Reflect.get(current, segment) : undefined,
      node,
    );

describe('features tabs content', () => {
  it.each(Object.entries(locales))('%s translates every features tab string', (_, locale) => {
    const missing = referencedKeys().filter((key) => {
      const value = lookup(locale, key);
      return typeof value !== 'string' || value.trim() === '';
    });

    expect(missing).toEqual([]);
  });

  it('resolves tab labels and card copy through the active language', () => {
    const { result } = renderHook(() => useFeaturesTabs());

    expect(result.current.ariaLabel).toBe(`translated:${FEATURES_TABS_ARIA_LABEL_KEY}`);
    expect(result.current.tabs.map(({ label }) => label)).toEqual(
      FEATURES_TABS.map(({ labelKey }) => `translated:${labelKey}`),
    );
    expect(result.current.tabs.flatMap(({ items }) => items.map(({ title }) => title))).toEqual(
      FEATURES_TABS.flatMap(({ items }) => items.map(({ titleKey }) => `translated:${titleKey}`)),
    );
    expect(
      result.current.tabs.flatMap(({ items }) => items.map(({ description }) => description)),
    ).toEqual(
      FEATURES_TABS.flatMap(({ items }) =>
        items.map(({ descriptionKey }) => `translated:${descriptionKey}`),
      ),
    );
  });
});
