import 'reflect-metadata';
import * as process from 'node:process';
import { YooKassaConnector } from '@payments/providers/yookassa/helpers/yookassa.connector';
import { YooKassaErr } from '@payments/providers/yookassa/helpers/yookassa.errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The connector builds its axios instance in the constructor, so the module is
// mocked rather than the instance: every construction in this file hands back
// the same stubbed `request`, and the config it was built with is captured for
// assertions about auth, timeouts and status handling.
const { mockRequest, createdConfigs } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
  createdConfigs: [] as any[],
}));

vi.mock('axios', () => {
  const axiosDefault = {
    create: (config: any) => {
      createdConfigs.push(config);
      return { request: mockRequest };
    },
    // A real AxiosError carries a symbol tag; the fixtures below use a plain
    // marker so they can be written as object literals.
    isAxiosError: (err: any) => Boolean(err?.isAxiosError),
  };
  return { default: axiosDefault, isAxiosError: axiosDefault.isAxiosError };
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

const apiErrorBody = (overrides: Record<string, unknown> = {}) => ({
  type: 'error',
  id: 'err-1',
  code: 'invalid_request',
  description: 'Bad request',
  ...overrides,
});

const networkError = () => ({ isAxiosError: true, message: 'ECONNRESET', response: undefined });

const axiosErrorWithStatus = (status: number) => ({
  isAxiosError: true,
  message: `Request failed with status ${status}`,
  response: { status },
});

/** Build a connector against a specific env snapshot. */
const makeConnector = (env: Record<string, string | undefined>): YooKassaConnector => {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const connector = new YooKassaConnector();
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return connector;
};

/** Fast connector: retries still happen, but the backoff sleeps for 0 ms. */
const makeFastConnector = (maxRetries = 3) =>
  makeConnector({
    YOOKASSA_URL: 'https://api.yookassa.test/v3/payments',
    YOOKASSA_SHOP_ID: 'shop-1',
    YOOKASSA_API_KEY: 'key-1',
    YOOKASSA_TIMEOUT_MS: '5000',
    YOOKASSA_MAX_RETRIES: String(maxRetries),
    YOOKASSA_RETRY_DELAY_MS: '0',
  });

describe('YooKassaConnector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createdConfigs.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Construction ───────────────────────────────────────────────────────────

  describe('construction', () => {
    it('configures the client from the environment', () => {
      makeConnector({
        YOOKASSA_URL: 'https://api.yookassa.test/v3/payments',
        YOOKASSA_SHOP_ID: 'shop-1',
        YOOKASSA_API_KEY: 'key-1',
        YOOKASSA_TIMEOUT_MS: '7500',
        YOOKASSA_MAX_RETRIES: '3',
        YOOKASSA_RETRY_DELAY_MS: '0',
      });

      expect(createdConfigs[0]).toMatchObject({
        baseURL: 'https://api.yookassa.test/v3/payments',
        timeout: 7500,
        headers: { 'Content-Type': 'application/json' },
        auth: { username: 'shop-1', password: 'key-1' },
      });
    });

    it('falls back to a 30 s timeout when none is configured', () => {
      makeConnector({ YOOKASSA_TIMEOUT_MS: undefined });

      expect(createdConfigs[0].timeout).toBe(30_000);
    });

    // Empty credentials rather than `undefined` keep axios from sending a
    // malformed Authorization header when the shop is not configured yet.
    it('sends empty credentials rather than undefined when the shop is not configured', () => {
      makeConnector({ YOOKASSA_SHOP_ID: undefined, YOOKASSA_API_KEY: undefined });

      expect(createdConfigs[0].auth).toEqual({ username: '', password: '' });
    });

    it('treats an empty shop id or api key as absent', () => {
      makeConnector({ YOOKASSA_SHOP_ID: '', YOOKASSA_API_KEY: '' });

      expect(createdConfigs[0].auth).toEqual({ username: '', password: '' });
    });

    // Non-2xx must reach our own error mapping instead of being thrown by axios.
    it('accepts every HTTP status so error bodies reach our own mapping', () => {
      makeConnector({});

      expect(createdConfigs[0].validateStatus(500)).toBe(true);
      expect(createdConfigs[0].validateStatus(404)).toBe(true);
      expect(createdConfigs[0].validateStatus(200)).toBe(true);
    });

    it('defaults the retry budget when neither retry variable is configured', async () => {
      const connector = makeConnector({
        YOOKASSA_MAX_RETRIES: undefined,
        YOOKASSA_RETRY_DELAY_MS: undefined,
      });
      vi.useFakeTimers();

      mockRequest.mockResolvedValue({ status: 500, data: apiErrorBody({ code: 'server_error' }) });

      const pending = connector.request('GET', '/pay_1').catch((err) => err);
      await vi.runAllTimersAsync();
      await pending;

      // Default budget is 3 retries on top of the initial attempt.
      expect(mockRequest).toHaveBeenCalledTimes(4);
    });
  });

  // ── Request shape ──────────────────────────────────────────────────────────

  describe('request shape', () => {
    it('returns the response body on success', async () => {
      const connector = makeFastConnector();
      mockRequest.mockResolvedValue({ status: 200, data: { id: 'pay_1', status: 'succeeded' } });

      await expect(connector.request('GET', '/pay_1')).resolves.toEqual({
        id: 'pay_1',
        status: 'succeeded',
      });
    });

    it('treats any 2xx as success', async () => {
      const connector = makeFastConnector();
      mockRequest.mockResolvedValue({ status: 299, data: { id: 'pay_1' } });

      await expect(connector.request('GET', '/pay_1')).resolves.toEqual({ id: 'pay_1' });
    });

    // YooKassa deduplicates POSTs by Idempotence-Key, so every create must carry
    // one even when the caller does not supply it.
    it('generates an Idempotence-Key for POSTs that do not carry one', async () => {
      const connector = makeFastConnector();
      mockRequest.mockResolvedValue({ status: 200, data: { id: 'pay_1' } });

      await connector.request('POST', '/', { amount: { value: '100.00', currency: 'RUB' } });

      const { headers, method, url, data } = mockRequest.mock.calls[0][0];
      expect(method).toBe('POST');
      expect(url).toBe('/');
      expect(data).toEqual({ amount: { value: '100.00', currency: 'RUB' } });
      expect(headers['Idempotence-Key']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('generates a distinct Idempotence-Key per POST', async () => {
      const connector = makeFastConnector();
      mockRequest.mockResolvedValue({ status: 200, data: {} });

      await connector.request('POST', '/', {});
      await connector.request('POST', '/', {});

      expect(mockRequest.mock.calls[0][0].headers['Idempotence-Key']).not.toBe(
        mockRequest.mock.calls[1][0].headers['Idempotence-Key'],
      );
    });

    it('forwards a caller-supplied Idempotence-Key unchanged', async () => {
      const connector = makeFastConnector();
      mockRequest.mockResolvedValue({ status: 200, data: {} });

      await connector.request('POST', '/', {}, 'caller-key');

      expect(mockRequest.mock.calls[0][0].headers['Idempotence-Key']).toBe('caller-key');
    });

    it('does not send an Idempotence-Key on GET, which is already idempotent', async () => {
      const connector = makeFastConnector();
      mockRequest.mockResolvedValue({ status: 200, data: {} });

      await connector.request('GET', '/pay_1');

      expect(mockRequest.mock.calls[0][0].headers).toEqual({});
    });

    // The same header object is reused across retries; a retried POST must keep
    // the key it started with or YooKassa would create a second payment.
    it('reuses the same Idempotence-Key across retries of one POST', async () => {
      const connector = makeFastConnector(1);
      mockRequest
        .mockResolvedValueOnce({ status: 500, data: apiErrorBody() })
        .mockResolvedValueOnce({ status: 200, data: { id: 'pay_1' } });

      await connector.request('POST', '/', {});

      expect(mockRequest.mock.calls[0][0].headers['Idempotence-Key']).toBe(
        mockRequest.mock.calls[1][0].headers['Idempotence-Key'],
      );
    });
  });

  // ── Client errors ──────────────────────────────────────────────────────────

  describe('4xx responses', () => {
    it('throws a YooKassaErr built from the API error body without retrying', async () => {
      const connector = makeFastConnector();
      mockRequest.mockResolvedValue({
        status: 400,
        data: apiErrorBody({ parameter: 'amount.value' }),
      });

      const err = await connector.request('POST', '/', {}).catch((e) => e);

      expect(err).toBeInstanceOf(YooKassaErr);
      expect(err).toMatchObject({
        id: 'err-1',
        code: 'invalid_request',
        description: 'Bad request',
        parameter: 'amount.value',
        httpStatus: 400,
      });
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('does not retry a 404', async () => {
      const connector = makeFastConnector();
      mockRequest.mockResolvedValue({
        status: 404,
        data: apiErrorBody({ code: 'not_found', description: 'Payment not found' }),
      });

      await expect(connector.request('GET', '/pay_missing')).rejects.toMatchObject({
        code: 'not_found',
        httpStatus: 404,
      });
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('does not retry a 499, the top of the client-error range', async () => {
      const connector = makeFastConnector();
      mockRequest.mockResolvedValue({ status: 499, data: apiErrorBody() });

      await expect(connector.request('GET', '/pay_1')).rejects.toBeInstanceOf(YooKassaErr);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });
  });

  // ── Unexpected response bodies ─────────────────────────────────────────────

  describe('unexpected error bodies', () => {
    it('synthesizes an error from an HTML/string body', async () => {
      const connector = makeFastConnector();
      mockRequest.mockResolvedValue({ status: 502, data: '<html>Bad Gateway</html>' });
      vi.useFakeTimers();

      const pending = connector.request('GET', '/pay_1').catch((e) => e);
      await vi.runAllTimersAsync();
      const err = await pending;

      expect(err).toBeInstanceOf(YooKassaErr);
      expect(err).toMatchObject({
        id: 'unknown',
        code: 'http_502',
        description: '<html>Bad Gateway</html>',
        parameter: undefined,
        httpStatus: 502,
      });
    });

    it('serializes a non-error JSON body into the description', async () => {
      const connector = makeFastConnector();
      mockRequest.mockResolvedValue({ status: 400, data: { unexpected: true } });

      const err = await connector.request('GET', '/pay_1').catch((e) => e);

      expect(err).toMatchObject({ code: 'http_400', description: '{"unexpected":true}' });
    });

    it('handles a null body', async () => {
      const connector = makeFastConnector();
      mockRequest.mockResolvedValue({ status: 400, data: null });

      const err = await connector.request('GET', '/pay_1').catch((e) => e);

      expect(err).toMatchObject({ code: 'http_400', description: 'null' });
    });

    // A body is only trusted as an API error when every discriminating field is
    // the right shape — otherwise it is stringified as an unknown payload.
    it.each([
      ['a wrong type discriminator', { type: 'failure', id: 'x', code: 'y' }],
      ['a non-string id', { type: 'error', id: 123, code: 'y' }],
      ['a non-string code', { type: 'error', id: 'x', code: 456 }],
      ['a missing id', { type: 'error', code: 'y' }],
    ])('does not trust %s as an API error body', async (_label, body) => {
      const connector = makeFastConnector();
      mockRequest.mockResolvedValue({ status: 400, data: body });

      const err = await connector.request('GET', '/pay_1').catch((e) => e);

      expect(err).toMatchObject({ id: 'unknown', code: 'http_400' });
    });
  });

  // ── Retries ────────────────────────────────────────────────────────────────

  describe('retries', () => {
    it('retries a 5xx and returns the eventual success', async () => {
      const connector = makeFastConnector();
      mockRequest
        .mockResolvedValueOnce({ status: 500, data: apiErrorBody({ code: 'server_error' }) })
        .mockResolvedValueOnce({ status: 200, data: { id: 'pay_1' } });

      await expect(connector.request('GET', '/pay_1')).resolves.toEqual({ id: 'pay_1' });
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('retries a 429 rather than treating it as a client error', async () => {
      const connector = makeFastConnector();
      mockRequest
        .mockResolvedValueOnce({ status: 429, data: apiErrorBody({ code: 'too_many_requests' }) })
        .mockResolvedValueOnce({ status: 200, data: { id: 'pay_1' } });

      await expect(connector.request('GET', '/pay_1')).resolves.toEqual({ id: 'pay_1' });
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('gives up after the configured budget and throws the last error', async () => {
      const connector = makeFastConnector(2);
      mockRequest.mockResolvedValue({
        status: 503,
        data: apiErrorBody({ code: 'service_unavailable' }),
      });

      const err = await connector.request('GET', '/pay_1').catch((e) => e);

      // Initial attempt plus 2 retries.
      expect(mockRequest).toHaveBeenCalledTimes(3);
      expect(err).toMatchObject({ code: 'service_unavailable', httpStatus: 503 });
    });

    it('backs off exponentially between attempts', async () => {
      vi.useFakeTimers();
      const connector = makeConnector({
        YOOKASSA_MAX_RETRIES: '3',
        YOOKASSA_RETRY_DELAY_MS: '1000',
      });
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      mockRequest.mockResolvedValue({ status: 500, data: apiErrorBody() });

      const pending = connector.request('GET', '/pay_1').catch((e) => e);
      await vi.runAllTimersAsync();
      await pending;

      const delays = setTimeoutSpy.mock.calls.map(([, ms]) => ms);
      expect(delays).toEqual([1000, 2000, 4000]);
    });

    it('does not sleep after the final attempt', async () => {
      vi.useFakeTimers();
      const connector = makeConnector({
        YOOKASSA_MAX_RETRIES: '1',
        YOOKASSA_RETRY_DELAY_MS: '1000',
      });
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      mockRequest.mockResolvedValue({ status: 500, data: apiErrorBody() });

      const pending = connector.request('GET', '/pay_1').catch((e) => e);
      await vi.runAllTimersAsync();
      await pending;

      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    });

    // A zero budget means one attempt and no retry loop.
    it('makes a single attempt when the retry budget is zero', async () => {
      const connector = makeConnector({
        YOOKASSA_MAX_RETRIES: '0',
        YOOKASSA_RETRY_DELAY_MS: '0',
      });
      mockRequest.mockResolvedValue({ status: 500, data: apiErrorBody() });

      await expect(connector.request('GET', '/pay_1')).rejects.toBeInstanceOf(YooKassaErr);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    // Defensive: a misconfigured negative budget skips the loop entirely, so
    // there is no captured error to rethrow. Failing loudly beats returning
    // undefined to a caller that is about to charge a customer.
    it('throws a descriptive error when a negative budget skips every attempt', async () => {
      const connector = makeConnector({
        YOOKASSA_MAX_RETRIES: '-1',
        YOOKASSA_RETRY_DELAY_MS: '0',
      });

      await expect(connector.request('GET', '/pay_1')).rejects.toThrow(
        'YooKassa request failed without a captured error',
      );
      expect(mockRequest).not.toHaveBeenCalled();
    });
  });

  // ── Thrown transport errors ────────────────────────────────────────────────

  describe('thrown transport errors', () => {
    it('retries a network error that never produced a response', async () => {
      const connector = makeFastConnector();
      mockRequest
        .mockRejectedValueOnce(networkError())
        .mockResolvedValueOnce({ status: 200, data: { id: 'pay_1' } });

      await expect(connector.request('GET', '/pay_1')).resolves.toEqual({ id: 'pay_1' });
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('rethrows the network error once the budget is exhausted', async () => {
      const connector = makeFastConnector(1);
      mockRequest.mockRejectedValue(networkError());

      await expect(connector.request('GET', '/pay_1')).rejects.toMatchObject({
        message: 'ECONNRESET',
      });
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('retries a thrown axios error carrying a 5xx response', async () => {
      const connector = makeFastConnector();
      mockRequest
        .mockRejectedValueOnce(axiosErrorWithStatus(503))
        .mockResolvedValueOnce({ status: 200, data: { id: 'pay_1' } });

      await expect(connector.request('GET', '/pay_1')).resolves.toEqual({ id: 'pay_1' });
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('retries a thrown axios error carrying a 429 response', async () => {
      const connector = makeFastConnector();
      mockRequest
        .mockRejectedValueOnce(axiosErrorWithStatus(429))
        .mockResolvedValueOnce({ status: 200, data: { id: 'pay_1' } });

      await expect(connector.request('GET', '/pay_1')).resolves.toEqual({ id: 'pay_1' });
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('does not retry a thrown axios error carrying a 4xx response', async () => {
      const connector = makeFastConnector();
      mockRequest.mockRejectedValue(axiosErrorWithStatus(400));

      await expect(connector.request('GET', '/pay_1')).rejects.toMatchObject({
        message: 'Request failed with status 400',
      });
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    // A bug in our own code must surface immediately, not be mistaken for a
    // flaky network and retried three more times.
    it('rethrows a non-axios error immediately', async () => {
      const connector = makeFastConnector();
      mockRequest.mockRejectedValue(new TypeError('cannot read property of undefined'));

      await expect(connector.request('GET', '/pay_1')).rejects.toThrow(TypeError);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    // A YooKassaErr can only be thrown from inside the try block by our own 4xx
    // mapping, but one carrying a retryable status must still be retried.
    it('retries a thrown YooKassaErr whose status is retryable', async () => {
      const connector = makeFastConnector(1);
      mockRequest
        .mockRejectedValueOnce(new YooKassaErr('e', 'server_error', 'boom', undefined, 500))
        .mockResolvedValueOnce({ status: 200, data: { id: 'pay_1' } });

      await expect(connector.request('GET', '/pay_1')).resolves.toEqual({ id: 'pay_1' });
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('retries a thrown YooKassaErr that carries no status at all', async () => {
      const connector = makeFastConnector(1);
      mockRequest
        .mockRejectedValueOnce(new YooKassaErr('e', 'unknown', 'boom'))
        .mockResolvedValueOnce({ status: 200, data: { id: 'pay_1' } });

      await expect(connector.request('GET', '/pay_1')).resolves.toEqual({ id: 'pay_1' });
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('retries a thrown YooKassaErr carrying a 429', async () => {
      const connector = makeFastConnector(1);
      mockRequest
        .mockRejectedValueOnce(new YooKassaErr('e', 'too_many', 'slow down', undefined, 429))
        .mockResolvedValueOnce({ status: 200, data: { id: 'pay_1' } });

      await expect(connector.request('GET', '/pay_1')).resolves.toEqual({ id: 'pay_1' });
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('does not retry a thrown YooKassaErr carrying a 4xx', async () => {
      const connector = makeFastConnector();
      mockRequest.mockRejectedValue(new YooKassaErr('e', 'invalid_request', 'bad', undefined, 422));

      await expect(connector.request('GET', '/pay_1')).rejects.toMatchObject({ httpStatus: 422 });
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });
  });
});
