import { describe, expect, it } from 'vitest';
import { isGlobalOrigin, isGlobalSquadUser } from './scope';

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

describe('isGlobalSquadUser', () => {
  const RU = '6f40164a-51d0-432a-8fa3-3e1311e13757';
  const GLOBAL = 'd16313a3-6330-4868-bf8b-bce4911d31e7';

  const userIn = (...uuids: (string | null)[]) => ({
    activeInternalSquads: uuids.map((uuid) => ({ uuid, name: 'squad' })),
  });

  it('is false for a user whose only squad is the RU one', () => {
    expect(isGlobalSquadUser(userIn(RU), RU)).toBe(false);
  });

  it('is true for a user in the global squad', () => {
    expect(isGlobalSquadUser(userIn(GLOBAL), RU)).toBe(true);
  });

  // Extra squads mean extra access: only a user confined to the RU squad is an
  // RU-storefront user.
  it('is true when the RU squad is one of several the user belongs to', () => {
    expect(isGlobalSquadUser(userIn(GLOBAL, RU), RU)).toBe(true);
  });

  it('compares squad uuids case-insensitively', () => {
    expect(isGlobalSquadUser(userIn(RU.toUpperCase()), RU)).toBe(false);
  });

  it('is true when the user has no squads', () => {
    expect(isGlobalSquadUser(userIn(), RU)).toBe(true);
  });

  it('ignores squad entries without a uuid', () => {
    expect(isGlobalSquadUser(userIn(null, GLOBAL), RU)).toBe(true);
    expect(isGlobalSquadUser(userIn(null, RU), RU)).toBe(false);
  });
});
