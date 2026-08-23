/**
 * RemnaPanelClient.request — unwrapping the panel's `{ response }` envelope.
 *
 * Panel v3 answers DELETE /users/:id with 204 No Content, and background
 * operations with 202 Accepted, so an absent body is no longer automatically a
 * malformed reply. But "sometimes empty" must not become "silently empty for
 * everybody": DeleteUserCommand is the only endpoint this codebase calls that
 * declares no ResponseSchema, and every other caller genuinely needs a payload.
 *
 * So the caller states which it is. Handing back `undefined` cast to the
 * caller's `Data` would satisfy the compiler and then fail several frames away
 * as `Cannot read properties of undefined` — reporting it here names the URL
 * and the status instead.
 */

import 'reflect-metadata';
import type { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RemnaPanelClient, RemnaPanelError } from './remna-panel.client';

const request = vi.fn();

vi.mock('axios', () => ({
  default: { create: vi.fn(() => ({ request: (...args: unknown[]) => request(...args) })) },
}));

function makeClient() {
  const config = {
    get: vi.fn((key: string) => (key === 'REMNAWAVE_PANEL_URL' ? 'http://panel.test' : 'tok')),
  } as unknown as ConfigService;

  const client = new RemnaPanelClient(config);
  client.onModuleInit();
  // The logger is private; silencing it keeps the expected-failure cases from
  // printing stack traces over the suite output.
  const { logger } = client as unknown as { logger: Logger };
  vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  return client;
}

/** Shorthand for an axios-shaped reply. */
const reply = (status: number, data: unknown = '') => ({ status, data, statusText: 'x' });

const call = <T>(client: RemnaPanelClient, extra: { allowEmptyResponse?: boolean } = {}) =>
  client.request<T>({ method: 'get', url: '/api/thing', ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(axios.create).mockReturnValue({
    request: (...args: unknown[]) => request(...args),
  } as never);
});

describe('a reply that carries an envelope', () => {
  it('returns what is inside `response`', async () => {
    request.mockResolvedValue(reply(200, { response: { id: 7 } }));

    await expect(call(makeClient())).resolves.toEqual({ id: 7 });
  });

  it('passes a null payload through rather than treating it as missing', async () => {
    request.mockResolvedValue(reply(200, { response: null }));

    await expect(call(makeClient())).resolves.toBeNull();
  });

  it('does not discard the body of a 202 Accepted', async () => {
    // A background operation may still answer with a payload. Treating every
    // 202 as empty would throw that away and hand back undefined.
    request.mockResolvedValue(reply(202, { response: { queued: true } }));

    await expect(call(makeClient())).resolves.toEqual({ queued: true });
  });
});

describe('a reply with no body', () => {
  it('is success for a caller that expects none', async () => {
    request.mockResolvedValue(reply(204));

    await expect(call(makeClient(), { allowEmptyResponse: true })).resolves.toBeUndefined();
  });

  it('is success for an empty 202 when the caller expects none', async () => {
    request.mockResolvedValue(reply(202));

    await expect(call(makeClient(), { allowEmptyResponse: true })).resolves.toBeUndefined();
  });

  it('is an error for a caller that needs a payload — 204', async () => {
    request.mockResolvedValue(reply(204));

    await expect(call(makeClient())).rejects.toThrow(RemnaPanelError);
  });

  it('is an error for a caller that needs a payload — 202', async () => {
    request.mockResolvedValue(reply(202));

    await expect(call(makeClient())).rejects.toThrow(RemnaPanelError);
  });

  it('names the url and status so the failure is diagnosable', async () => {
    request.mockResolvedValue(reply(204));

    await expect(call(makeClient())).rejects.toThrow(/\/api\/thing.*204|204.*\/api\/thing/);
  });

  it('still rejects a 200 whose envelope is missing', async () => {
    request.mockResolvedValue(reply(200, {}));

    await expect(call(makeClient())).rejects.toThrow(RemnaPanelError);
  });

  it('accepts a 200 with no envelope when the caller allows empties', async () => {
    // Opting in means "a missing payload is fine", whatever status carried it —
    // the flag does not distinguish an empty 204 from an empty-bodied 200.
    request.mockResolvedValue(reply(200, {}));

    await expect(call(makeClient(), { allowEmptyResponse: true })).resolves.toBeUndefined();
  });
});

describe('failure statuses', () => {
  it('rejects a 404 with its status', async () => {
    request.mockResolvedValue(reply(404, { message: 'nope' }));

    await expect(call(makeClient())).rejects.toMatchObject({ status: 404 });
  });

  it('rejects a 500 with its status', async () => {
    request.mockResolvedValue(reply(500, { message: 'boom' }));

    await expect(call(makeClient())).rejects.toMatchObject({ status: 500 });
  });

  it('does not treat a 4xx as an empty success even when empties are allowed', async () => {
    request.mockResolvedValue(reply(422, {}));

    await expect(call(makeClient(), { allowEmptyResponse: true })).rejects.toMatchObject({
      status: 422,
    });
  });

  it('wraps a transport failure as a RemnaPanelError', async () => {
    request.mockRejectedValue(new Error('socket hang up'));

    await expect(call(makeClient())).rejects.toThrow(RemnaPanelError);
  });
});
