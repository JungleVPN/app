/**
 * UserService — user lookups against panel v3's `/api/users/stream`.
 *
 * Panel v3 removed the by-telegram-id / by-email endpoints. The replacement is
 * the cursor-paginated stream endpoint, which filters *server-side* on exact
 * equality (`users.telegram_id = $1`, `users.email = $1`). The admin table's
 * `GET /api/users` endpoint is deliberately NOT used here: its telegramId filter
 * is `CAST(telegram_id AS TEXT) LIKE '%value%'` regardless of filter mode, so it
 * would match 123456 for a lookup of 12345 — an authentication hazard, since
 * these lookups back ClientUserGuard.
 */

import 'reflect-metadata';
import type { ConfigService } from '@nestjs/config';
import { GetUsersStreamCommand } from '@workspace/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsClientService } from '../analytics/analytics-client.service';
import { type RemnaPanelClient, RemnaPanelError } from '../common/remna-panel.client';
import { UserService } from './user.service';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));

type StreamPage = {
  users: unknown[];
  nextCursor: string | null;
  hasMore: boolean;
};

const page = (overrides: Partial<StreamPage> = {}): StreamPage => ({
  users: [],
  nextCursor: null,
  hasMore: false,
  ...overrides,
});

const users = (...ids: number[]) => ids.map((id) => ({ id, username: `u${id}` }));

function makeService(pages: unknown[] = [page()]) {
  const queue = [...pages];
  const request = vi.fn().mockImplementation(async () => queue.shift() ?? page());

  const service = new UserService(
    { request } as unknown as RemnaPanelClient,
    { get: vi.fn((_k: string, fallback?: unknown) => fallback) } as unknown as ConfigService,
    { track: vi.fn() } as unknown as AnalyticsClientService,
  );

  return { service, request };
}

/**
 * The query of the nth panel request, run through the panel's *own* schema.
 *
 * Comparing against a hand-written string would only prove the implementation
 * agrees with whoever wrote the test. Parsing proves the panel would accept
 * what we send: a renamed, retyped, or misspelled field drops out as
 * `undefined` and fails the assertion the moment @remnawave/backend-contract is
 * bumped — rather than at the next login in production.
 */
function parsedQueryOf(request: ReturnType<typeof vi.fn>, call = 0) {
  const { url } = request.mock.calls[call][0] as { url: string };
  const raw = Object.fromEntries(new URLSearchParams(url.slice(url.indexOf('?') + 1)));
  return GetUsersStreamCommand.RequestQuerySchema.parse(raw);
}

beforeEach(() => vi.clearAllMocks());

describe('UserService.getUserByTgId', () => {
  it('asks the panel to filter by telegramId rather than filtering client-side', async () => {
    const { service, request } = makeService([page({ users: users(4821) })]);

    await service.getUserByTgId(555111);

    expect(request).toHaveBeenCalledTimes(1);
    const query = parsedQueryOf(request);
    expect(query.telegramId).toBe(555111);
    expect(query.cursor).toBeUndefined();
  });

  it('asks for exactly two rows — small enough for a login, wide enough to spot a duplicate', async () => {
    const { service, request } = makeService([page({ users: users(4821) })]);

    await service.getUserByTgId(555111);

    // Not `<= 2`: one row would make the ambiguity warning below unreachable,
    // and an absent `size` would silently fall back to the panel's default 250.
    expect(parsedQueryOf(request).size).toBe(2);
  });

  it('returns the matched users', async () => {
    const { service } = makeService([page({ users: users(4821) })]);

    await expect(service.getUserByTgId(555111)).resolves.toEqual([{ id: 4821, username: 'u4821' }]);
  });

  it('returns null when no user carries that telegramId', async () => {
    const { service } = makeService([page()]);

    await expect(service.getUserByTgId(555111)).resolves.toBeNull();
  });

  it('returns null without calling the panel when telegramId is not a number', async () => {
    const { service, request } = makeService();

    await expect(service.getUserByTgId('abc' as never)).resolves.toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('returns null without calling the panel when telegramId is absent', async () => {
    const { service, request } = makeService();

    await expect(service.getUserByTgId(undefined)).resolves.toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('returns null when the panel answers 404', async () => {
    const { service, request } = makeService();
    request.mockRejectedValueOnce(new RemnaPanelError('nope', 404));

    await expect(service.getUserByTgId(555111)).resolves.toBeNull();
  });

  it('rethrows panel failures that are not a 404', async () => {
    const { service, request } = makeService();
    request.mockRejectedValueOnce(new RemnaPanelError('panel down', 502));

    await expect(service.getUserByTgId(555111)).rejects.toThrow('panel down');
  });
});

describe('UserService.getUserByEmail', () => {
  it('asks the panel to filter by email rather than filtering client-side', async () => {
    const { service, request } = makeService([page({ users: users(4821) })]);

    await service.getUserByEmail('jim@example.com');

    expect(request).toHaveBeenCalledTimes(1);
    expect(parsedQueryOf(request).email).toBe('jim@example.com');
  });

  it('asks for exactly two rows — small enough for a login, wide enough to spot a duplicate', async () => {
    const { service, request } = makeService([page({ users: users(4821) })]);

    await service.getUserByEmail('jim@example.com');

    expect(parsedQueryOf(request).size).toBe(2);
  });

  it('returns null when no user carries that address', async () => {
    const { service } = makeService([page()]);

    await expect(service.getUserByEmail('nobody@example.com')).resolves.toBeNull();
  });

  it('returns null without calling the panel for a malformed address', async () => {
    const { service, request } = makeService();

    await expect(service.getUserByEmail('not-an-email')).resolves.toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('returns null without calling the panel for an empty address', async () => {
    const { service, request } = makeService();

    await expect(service.getUserByEmail('')).resolves.toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('warns when one address resolves to more than one account', async () => {
    // Callers authenticate users[0]; an ambiguous address must not do that silently.
    const { service } = makeService([page({ users: users(4821, 9002) })]);
    const warn = vi.spyOn(service.logger, 'warn').mockImplementation(() => undefined);

    await service.getUserByEmail('shared@example.com');

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('shared@example.com'));
  });

  it('does not warn for the ordinary single match', async () => {
    const { service } = makeService([page({ users: users(4821) })]);
    const warn = vi.spyOn(service.logger, 'warn').mockImplementation(() => undefined);

    await service.getUserByEmail('jim@example.com');

    expect(warn).not.toHaveBeenCalled();
  });

  it('returns null when the panel answers 404', async () => {
    const { service, request } = makeService();
    request.mockRejectedValueOnce(new RemnaPanelError('nope', 404));

    await expect(service.getUserByEmail('jim@example.com')).resolves.toBeNull();
  });
});

describe('UserService.getAllUsers', () => {
  it('follows nextCursor across pages and concatenates every user', async () => {
    const { service, request } = makeService([
      page({ users: users(1, 2), nextCursor: '2', hasMore: true }),
      page({ users: users(3, 4), nextCursor: '4', hasMore: true }),
      page({ users: users(5) }),
    ]);

    const all = await service.getAllUsers();

    expect(all.map((u) => u.id)).toEqual([1, 2, 3, 4, 5]);
    expect(request).toHaveBeenCalledTimes(3);
    expect(parsedQueryOf(request, 0).cursor).toBeUndefined();
    expect(parsedQueryOf(request, 1).cursor).toBe(2);
    expect(parsedQueryOf(request, 2).cursor).toBe(4);
  });

  it('requests the largest page the contract allows', async () => {
    const { service, request } = makeService([page({ users: users(1) })]);

    await service.getAllUsers();

    // Also pins the ceiling: the schema's .max(1000) makes an over-large page throw.
    expect(parsedQueryOf(request).size).toBe(1000);
  });

  it('sends no identity filters', async () => {
    const { service, request } = makeService([page({ users: users(1) })]);

    await service.getAllUsers();

    const query = parsedQueryOf(request);
    expect(query.telegramId).toBeUndefined();
    expect(query.email).toBeUndefined();
  });

  it('stops on an empty page even when the panel still claims hasMore', async () => {
    const { service, request } = makeService([
      page({ users: users(1), nextCursor: '1', hasMore: true }),
      page({ users: [], nextCursor: '2', hasMore: true }),
    ]);

    const all = await service.getAllUsers();

    expect(all.map((u) => u.id)).toEqual([1]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('stops when the cursor fails to advance', async () => {
    const { service, request } = makeService([
      page({ users: users(1), nextCursor: '7', hasMore: true }),
      page({ users: users(2), nextCursor: '7', hasMore: true }),
    ]);

    const all = await service.getAllUsers();

    expect(all.map((u) => u.id)).toEqual([1, 2]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('stops when hasMore is true but no cursor comes back', async () => {
    const { service, request } = makeService([
      page({ users: users(1), nextCursor: null, hasMore: true }),
    ]);

    await service.getAllUsers();

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('treats a page with no users array as the end of the stream', async () => {
    const { service, request } = makeService([{ nextCursor: null, hasMore: false }]);

    await expect(service.getAllUsers()).resolves.toEqual([]);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('treats an entirely absent body as the end of the stream', async () => {
    const { service, request } = makeService([undefined]);

    await expect(service.getAllUsers()).resolves.toEqual([]);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
