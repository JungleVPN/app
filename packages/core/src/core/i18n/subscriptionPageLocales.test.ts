import { describe, expect, it } from 'vitest';
import ar from './locales/ar.json';
import en from './locales/en.json';
import es from './locales/es.json';
import hi from './locales/hi.json';
import id from './locales/id.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import tr from './locales/tr.json';

function leafKeys(node: unknown, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null) return [prefix];
  return Object.entries(node).flatMap(([key, value]) =>
    leafKeys(value, prefix ? `${prefix}.${key}` : key),
  );
}

const locales = { ar, en, es, hi, id, pt, ru, tr };

describe('subscription page translations', () => {
  it.each(Object.entries(locales))('%s has every subscriptionPage key English has', (_, locale) => {
    expect(leafKeys(locale.subscriptionPage).sort()).toEqual(leafKeys(en.subscriptionPage).sort());
  });
});
