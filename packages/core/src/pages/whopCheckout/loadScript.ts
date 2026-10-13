const loaded = new Map<string, Promise<void>>();

/** Adds `src` to the page once; every caller shares the one load. A failed load can be retried. */
export function loadScript(src: string): Promise<void> {
  const existing = loaded.get(src);
  if (existing) return existing;

  const load = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => {
      loaded.delete(src);
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    });
    document.head.appendChild(script);
  });
  loaded.set(src, load);
  return load;
}
