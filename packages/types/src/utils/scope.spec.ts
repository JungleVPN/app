import { describe, expect, it } from 'vitest';
import {
  isGlobalOrigin,
  isGlobalSquadUser,
  scopeForOrigin,
  scopeFromSquads,
  scopeHost,
} from './scope';

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

describe('scopeForOrigin', () => {
  it("is 'ru' for a configured RU domain", () => {
    expect(scopeForOrigin('https://thejungle.pro', RU_DOMAINS)).toBe('ru');
  });

  it("is 'ru' for a host using the `ru` prefix convention", () => {
    expect(scopeForOrigin('https://ru-web.development-env.uk', RU_DOMAINS)).toBe('ru');
  });

  it("is 'global' for the production global domain", () => {
    expect(scopeForOrigin('https://jungle-vpn.com', RU_DOMAINS)).toBe('global');
  });

  it("is 'global' for a non-RU preview host", () => {
    expect(scopeForOrigin('https://eu-web.development-env.uk', RU_DOMAINS)).toBe('global');
  });

  it("is 'global' for localhost", () => {
    expect(scopeForOrigin('http://localhost:7080', RU_DOMAINS)).toBe('global');
  });

  // Preserves the caller-visible behaviour of isGlobalOrigin, which answered
  // "not global" whenever there was no usable host to judge.
  it("is 'ru' when there is no usable origin", () => {
    expect(scopeForOrigin(null, RU_DOMAINS)).toBe('ru');
    expect(scopeForOrigin(undefined, RU_DOMAINS)).toBe('ru');
    expect(scopeForOrigin('', RU_DOMAINS)).toBe('ru');
    expect(scopeForOrigin('not-a-url', RU_DOMAINS)).toBe('ru');
  });
});

describe('scopeHost', () => {
  const DOMAINS = { ru: RU_DOMAINS, global: 'jungle-vpn.com,eu.jungle-vpn.com' };

  it("returns the first RU domain for the 'ru' scope", () => {
    expect(scopeHost('ru', DOMAINS)).toBe('jungle.community');
  });

  it("returns the first global domain for the 'global' scope", () => {
    expect(scopeHost('global', DOMAINS)).toBe('jungle-vpn.com');
  });

  it('normalizes the host it returns', () => {
    expect(scopeHost('ru', { ru: 'WWW.TheJungle.PRO:8443', global: 'jungle-vpn.com' })).toBe(
      'thejungle.pro',
    );
  });

  // A link must never be built from the raw comma-separated env value.
  it('falls back to the global domain when the RU list is empty', () => {
    expect(scopeHost('ru', { ru: '', global: 'jungle-vpn.com' })).toBe('jungle-vpn.com');
    expect(scopeHost('ru', { ru: undefined, global: 'jungle-vpn.com' })).toBe('jungle-vpn.com');
  });

  it('is null when neither list has a usable host', () => {
    expect(scopeHost('global', { ru: RU_DOMAINS, global: '' })).toBe(null);
    expect(scopeHost('ru', { ru: '', global: undefined })).toBe(null);
  });
});

describe('scopeFromSquads', () => {
  const RU = '6f40164a-51d0-432a-8fa3-3e1311e13757';
  const GLOBAL = 'd16313a3-6330-4868-bf8b-bce4911d31e7';
  const ADMIN = '255bc730-3953-476d-a6b9-aeed91f79df7';
  const SQUADS = { ru: RU, global: GLOBAL };

  const userIn = (...uuids: (string | null)[]) => ({
    activeInternalSquads: uuids.map((uuid) => ({ uuid, name: 'squad' })),
  });

  it("is 'ru' for a user in the RU squad", () => {
    expect(scopeFromSquads(userIn(RU), SQUADS)).toBe('ru');
  });

  /**
   * Holding the RU squad is what makes someone an RU user. Extra squads grant extra
   * node access and say nothing about the storefront.
   *
   * The earlier rule — RU only for a user confined to the RU squad — is what sent a
   * paying RU customer a "manage subscription" link to the global domain. A survey of
   * all 2,534 panel users before the scope backfill showed how far that reached:
   *
   *     2429  Jungle Lake (RU only)          → ru
   *       50  Global only                    → global
   *       44  Jungle Lake + Test             → the old rule said global. Wrong.
   *        4  ADMIN + Global + Jungle Lake + Test
   *        2  ADMIN + Jungle Lake + Test     → wrong under the old rule
   *        2  ADMIN only                     → no storefront squad
   *        2  no squads at all               → no storefront squad
   *        1  Checker only                   → no storefront squad
   *
   * 52 users — 2% of the base — would have been permanently stamped with the bug the
   * stored scope exists to fix, and a stamp is exactly what nothing can correct later.
   */
  it("is 'ru' for a user who holds the RU squad alongside others", () => {
    expect(scopeFromSquads(userIn(RU, 'test-squad'), SQUADS)).toBe('ru');
    expect(scopeFromSquads(userIn(ADMIN, RU, 'test-squad'), SQUADS)).toBe('ru');
    expect(scopeFromSquads(userIn(ADMIN, GLOBAL, RU), SQUADS)).toBe('ru');
  });

  it("is 'global' for a user in the global squad and not the RU one", () => {
    expect(scopeFromSquads(userIn(GLOBAL), SQUADS)).toBe('global');
    expect(scopeFromSquads(userIn(ADMIN, GLOBAL), SQUADS)).toBe('global');
  });

  it('compares squad uuids case-insensitively', () => {
    expect(scopeFromSquads(userIn(RU.toUpperCase()), SQUADS)).toBe('ru');
    expect(scopeFromSquads(userIn(GLOBAL.toUpperCase()), SQUADS)).toBe('global');
  });

  /**
   * Null means "do not guess". An access-only or squadless user has no storefront
   * recorded anywhere, and a guess written into metadata is afterwards
   * indistinguishable from a recorded fact.
   *
   * The five such users in the survey above were all service accounts or abandoned
   * signups; the backfill left every one of them unstamped and reported their ids.
   * Callers show them the global storefront — the one that serves anyone — without
   * storing that choice.
   */
  it('is null for a user carrying neither storefront squad', () => {
    expect(scopeFromSquads(userIn(ADMIN), SQUADS)).toBe(null);
    expect(scopeFromSquads(userIn(), SQUADS)).toBe(null);
    expect(scopeFromSquads(userIn(null), SQUADS)).toBe(null);
  });

  it('is null for no user at all', () => {
    expect(scopeFromSquads(null, SQUADS)).toBe(null);
  });
});
