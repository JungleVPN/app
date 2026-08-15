/**
 * True when the app is being served from the RU domain (PUBLIC_DOMAIN_RU).
 * Used to switch pricing/payment UI to RUB-only behavior for that domain.
 */
export function isRuDomain(): boolean {
  return (
    typeof window !== 'undefined' && window.location.hostname === import.meta.env.PUBLIC_DOMAIN_RU
  );
}
