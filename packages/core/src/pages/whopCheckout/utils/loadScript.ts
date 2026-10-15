const loaded = new Map<string, Promise<void>>();

interface LoadScriptOptions {
  /**
   * Whether the script already ran, loaded by something other than this
   * function — such as a wallet SDK Whop's own code pulled in — so it is not
   * loaded and run a second time.
   */
  isLoaded?: () => boolean;
}

/** Adds `src` to the page once; every caller shares the one load. A failed load can be retried. */
export function loadScript(src: string, { isLoaded }: LoadScriptOptions = {}): Promise<void> {
  if (isLoaded?.()) return Promise.resolve();

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
