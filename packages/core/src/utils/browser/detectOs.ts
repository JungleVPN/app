/** Client-side OS hint for subscription install guides. */
export function detectOs(): 'android' | 'ios' | 'linux' | 'macos' | 'windows' | 'undetermined' {
  if (typeof navigator === 'undefined') {
    return 'undetermined';
  }
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/i.test(ua)) return 'ios';
  if (/Win/i.test(ua)) return 'windows';
  if (/Mac/i.test(ua)) return 'macos';
  if (/Linux/i.test(ua)) return 'linux';
  return 'undetermined';
}
