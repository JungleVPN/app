/**
 * Type-safe wrapper around localStorage.
 * Falls back gracefully when storage is unavailable (e.g. in Telegram WebView).
 */
export function createStorage(prefix: string) {
  function getKey(key: string): string {
    return `${prefix}:${key}`;
  }

  function isAvailable(): boolean {
    try {
      const testKey = `${prefix}:__test__`;
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  return {
    get<T>(key: string, fallback: T): T {
      if (!isAvailable()) return fallback;
      try {
        const raw = localStorage.getItem(getKey(key));
        return raw ? (JSON.parse(raw) as T) : fallback;
      } catch {
        return fallback;
      }
    },

    set<T>(key: string, value: T): void {
      if (!isAvailable()) return;
      try {
        localStorage.setItem(getKey(key), JSON.stringify(value));
      } catch {
        // Storage full or unavailable — fail silently
      }
    },

    remove(key: string): void {
      if (!isAvailable()) return;
      localStorage.removeItem(getKey(key));
    },

    clear(): void {
      if (!isAvailable()) return;
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(`${prefix}:`));
      for (const key of keys) {
        localStorage.removeItem(key);
      }
    },
  };
}

export type Storage = ReturnType<typeof createStorage>;
