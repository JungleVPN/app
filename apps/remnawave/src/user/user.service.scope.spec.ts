/**
 * UserService — the user's scope (RU vs. global storefront).
 *
 * A user's scope is a durable fact about where they signed up, and it is stored on
 * the panel user's metadata under `scope`. It is deliberately not re-derived from
 * squads on every read: squad membership answers "which nodes may you use", changes
 * for reasons that have nothing to do with billing, and reading it as a storefront
 * sent a paying RU customer a link to the global domain.
 *
 * Legacy users carry no `scope` yet, so the first read derives one from their squads
 * and writes it back — after which the squads are never consulted again.
 */

import 'reflect-metadata';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsClientService } from '../analytics/analytics-client.service';
import type { RemnaPanelClient } from '../common/remna-panel.client';
import { UserService } from './user.service';

vi.mock('axios', () => ({ default: { post: vi.fn().mockResolvedValue({ data: {} }) } }));

const RU_SQUAD = 'squad-ru';
const OTHER_SQUAD = 'squad-admin';

type PanelCall = { url: string; method: string; body?: unknown };

/**
 * A panel whose metadata and user reads are scripted, and whose writes are recorded.
 * Requests are dispatched the way the real panel routes them: by URL and method.
 */
function makePanel({
  metadata,
  squads = [RU_SQUAD],
  metadataFails = false,
}: {
  metadata?: Record<string, unknown> | null;
  squads?: string[];
  metadataFails?: boolean;
}) {
  const calls: PanelCall[] = [];

  const request = vi.fn(async (call: PanelCall) => {
    calls.push(call);

    if (call.url.includes('metadata')) {
      if (metadataFails) throw new Error('panel down');
      const isRead = call.method.toLowerCase() === 'get';
      if (isRead) return metadata === null ? null : { metadata: metadata ?? {} };
      return { metadata: (call.body as { metadata: unknown }).metadata };
    }

    return {
      id: 1,
      telegramId: 555,
      activeInternalSquads: squads.map((uuid) => ({ uuid, name: uuid })),
    };
  });

  const panelClient = { request } as unknown as RemnaPanelClient;

  const configService = {
    get: vi.fn((key: string, fallback?: unknown) =>
      key === 'RU_INTERNAL_SQUAD' ? RU_SQUAD : fallback,
    ),
    getOrThrow: vi.fn(() => RU_SQUAD),
  } as unknown as ConfigService;

  const service = new UserService(
    panelClient,
    configService,
    { track: vi.fn() } as unknown as AnalyticsClientService,
  );

  const metadataWrites = () =>
    calls.filter((c) => c.url.includes('metadata') && c.method.toLowerCase() !== 'get');

  return { service, calls, metadataWrites };
}

describe('UserService.getUserScope', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the scope stored on the user', async () => {
    const { service } = makePanel({ metadata: { lang: 'en', scope: 'ru' } });

    expect(await service.getUserScope(1)).toBe('ru');
  });

  it('returns a stored global scope', async () => {
    const { service } = makePanel({ metadata: { scope: 'global' } });

    expect(await service.getUserScope(1)).toBe('global');
  });

  // The stored value is the whole point: squads must not get a second vote.
  it('does not consult squads when a scope is stored', async () => {
    const { service, calls } = makePanel({ metadata: { scope: 'ru' }, squads: [OTHER_SQUAD] });

    await service.getUserScope(1);

    expect(calls.every((call) => call.url.includes('metadata'))).toBe(true);
  });

  it('derives the scope from squads for a legacy user with no stored scope', async () => {
    const { service } = makePanel({ metadata: { lang: 'en' }, squads: [RU_SQUAD] });

    expect(await service.getUserScope(1)).toBe('ru');
  });

  it("derives 'global' for a legacy user holding a squad other than RU", async () => {
    const { service } = makePanel({ metadata: {}, squads: [OTHER_SQUAD] });

    expect(await service.getUserScope(1)).toBe('global');
  });

  it('derives a scope for a legacy user with no metadata at all', async () => {
    const { service } = makePanel({ metadata: null, squads: [RU_SQUAD] });

    expect(await service.getUserScope(1)).toBe('ru');
  });

  it('writes the derived scope back so it is never derived twice', async () => {
    const { service, metadataWrites } = makePanel({ metadata: { lang: 'en' }, squads: [RU_SQUAD] });

    await service.getUserScope(1);

    expect(metadataWrites()).toHaveLength(1);
    expect(metadataWrites()[0].body).toEqual({ metadata: { lang: 'en', scope: 'ru' } });
  });

  // A value we do not recognise is no better than none: re-derive rather than trust it.
  it('re-derives when the stored scope is not a scope we know', async () => {
    const { service } = makePanel({ metadata: { scope: 'eu' }, squads: [OTHER_SQUAD] });

    expect(await service.getUserScope(1)).toBe('global');
  });
});

describe('UserService.setUserScope', () => {
  beforeEach(() => vi.clearAllMocks());

  // The panel REPLACES a user's metadata on upsert, so a blind write would drop
  // every other key — `lang` above all, which drives the language of their e-mail.
  it('preserves the metadata the user already has', async () => {
    const { service, metadataWrites } = makePanel({ metadata: { lang: 'ru', foo: 'bar' } });

    await service.setUserScope(1, 'global');

    expect(metadataWrites()[0].body).toEqual({
      metadata: { lang: 'ru', foo: 'bar', scope: 'global' },
    });
  });

  it('overwrites a scope the user already carries', async () => {
    const { service, metadataWrites } = makePanel({ metadata: { lang: 'en', scope: 'ru' } });

    await service.setUserScope(1, 'global');

    expect(metadataWrites()[0].body).toEqual({ metadata: { lang: 'en', scope: 'global' } });
  });

  it('writes just the scope for a user with no metadata', async () => {
    const { service, metadataWrites } = makePanel({ metadata: null });

    await service.setUserScope(1, 'ru');

    expect(metadataWrites()[0].body).toEqual({ metadata: { scope: 'ru' } });
  });
});

describe('UserService.createUser — stamping the scope', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stamps a web signup on an RU domain as ru', async () => {
    const { service, metadataWrites } = makePanel({ metadata: {} });

    await service.createUser({ email: 'a@b.c', origin: 'https://ru-web.jungle.test' });

    expect(metadataWrites()[0].body).toEqual({ metadata: { scope: 'ru' } });
  });

  it('stamps a web signup on the global domain as global', async () => {
    const { service, metadataWrites } = makePanel({ metadata: {} });

    await service.createUser({ email: 'a@b.c', origin: 'https://jungle-vpn.com' });

    expect(metadataWrites()[0].body).toEqual({ metadata: { scope: 'global' } });
  });

  // Best-effort, like the referral notification: an account must exist even if the
  // panel refuses the metadata write.
  it('still creates the account when the scope cannot be stamped', async () => {
    const { service } = makePanel({ metadata: {}, metadataFails: true });

    await expect(
      service.createUser({ email: 'a@b.c', origin: 'https://jungle-vpn.com' }),
    ).resolves.toMatchObject({ id: 1 });
  });
});
