import { describe, expect, it } from 'vitest';
import { isGlobalOrigin } from './scope';

const RU_DOMAINS = 'jungle.community,thejungle.pro,web.thejungle.pro';

describe('isGlobalOrigin', () => {
  it('is false when the origin host matches one of the configured RU domains', () => {
    expect(isGlobalOrigin('https://thejungle.pro', RU_DOMAINS)).toBe(false);
  });

  it('is false for a www. variant of a configured RU domain', () => {
    expect(isGlobalOrigin('https://www.thejungle.pro', RU_DOMAINS)).toBe(false);
  });

  it('is false for a configured RU domain carrying a port', () => {
    expect(isGlobalOrigin('https://thejungle.pro:8443', RU_DOMAINS)).toBe(false);
  });

  it('is false regardless of case', () => {
    expect(isGlobalOrigin('https://THEJUNGLE.PRO', RU_DOMAINS)).toBe(false);
  });

  it('matches every domain in a comma-separated PUBLIC_DOMAIN_RU list, not just the first', () => {
    expect(isGlobalOrigin('https://jungle.community', RU_DOMAINS)).toBe(false);
    expect(isGlobalOrigin('https://web.thejungle.pro', RU_DOMAINS)).toBe(false);
  });

  it('is false for a host with the `ru` prefix convention, even off the configured RU domains', () => {
    expect(isGlobalOrigin('https://ru-web.development-env.uk', RU_DOMAINS)).toBe(false);
  });

  it('is true for the production global domain', () => {
    expect(isGlobalOrigin('https://jungle-vpn.com', RU_DOMAINS)).toBe(true);
  });

  it('is true for a per-environment preview host that is not RU', () => {
    expect(isGlobalOrigin('https://eu-web.development-env.uk', RU_DOMAINS)).toBe(true);
  });

  it('is true for localhost', () => {
    expect(isGlobalOrigin('http://localhost:7080', RU_DOMAINS)).toBe(true);
  });

  it('is true for any non-`ru`-prefixed host when no RU domains are configured', () => {
    expect(isGlobalOrigin('https://thejungle.pro', undefined)).toBe(true);
  });

  it('is false for null', () => {
    expect(isGlobalOrigin(null, RU_DOMAINS)).toBe(false);
  });

  it('is false for undefined', () => {
    expect(isGlobalOrigin(undefined, RU_DOMAINS)).toBe(false);
  });

  it('is false for an empty string', () => {
    expect(isGlobalOrigin('', RU_DOMAINS)).toBe(false);
  });

  it('is false for an unparseable origin', () => {
    expect(isGlobalOrigin('not-a-url', RU_DOMAINS)).toBe(false);
  });
});
