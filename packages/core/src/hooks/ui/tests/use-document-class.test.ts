/**
 * useDocumentClass — puts a class on <html> while a page is mounted, so
 * page-specific rules that must target html/body (Safari reads their
 * background to tint its toolbar) apply only on that page.
 */
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useDocumentClass } from '../use-document-class';

const html = () => document.documentElement;

describe('useDocumentClass', () => {
  afterEach(() => {
    html().className = '';
  });

  it('adds the class to <html> while mounted', () => {
    renderHook(() => useDocumentClass('landing-dark'));

    expect(html().classList.contains('landing-dark')).toBe(true);
  });

  it('removes the class from <html> on unmount', () => {
    const { unmount } = renderHook(() => useDocumentClass('landing-dark'));

    unmount();

    expect(html().classList.contains('landing-dark')).toBe(false);
  });

  it('leaves other <html> classes in place', () => {
    html().classList.add('dark');
    const { unmount } = renderHook(() => useDocumentClass('landing-dark'));

    unmount();

    expect(html().classList.contains('dark')).toBe(true);
  });
});
