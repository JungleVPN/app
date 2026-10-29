import { useEffect } from 'react';

/**
 * Puts `className` on <html> while the calling component is mounted.
 */
export function useDocumentClass(className: string) {
  useEffect(() => {
    document.documentElement.classList.add(className);
    return () => document.documentElement.classList.remove(className);
  }, [className]);
}
