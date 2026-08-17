import { describe, expect, it, vi } from 'vitest';
import { ToltApiError, ToltClient, type ToltClientConfig } from './tolt.client';

const CONFIG: ToltClientConfig = { apiKey: 'sk_test_123', baseUrl: 'https://api.tolt.com' };

const CUSTOMER = {
  id: 'cus_abc',
  customer_id: 'user-uuid',
  email: 'jim@example.com',
  status: 'lead',
  partner_id: 'part_xyz',
  program_id: 'prg_1',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function setup(responses: Array<Response | Error>) {
  const queue = [...responses];
  // Typed against fetch's signature so `mock.calls` stays inspectable.
  const fetchFn = vi.fn((_url: string, _init?: RequestInit): Promise<Response> => {
    const next = queue.shift();
    if (!next) throw new Error('fetch called more times than the test queued responses');
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });
  const sleep = vi.fn((_ms: number) => Promise.resolve());
  const client = new ToltClient(CONFIG, fetchFn as never, sleep);
  return { client, fetchFn, sleep };
}

const okCustomer = () => jsonResponse({ success: true, data: [CUSTOMER] });

describe('ToltClient request shape', () => {
  it('posts to the versioned endpoint with a bearer token and JSON body', async () => {
    const { client, fetchFn } = setup([okCustomer()]);

    await client.createCustomer({ email: 'jim@example.com', partner_id: 'part_xyz' });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://api.tolt.com/v1/customers');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer sk_test_123');
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init?.body as string)).toEqual({
      email: 'jim@example.com',
      partner_id: 'part_xyz',
    });
  });

  it('unwraps the single-element data array Tolt wraps every payload in', async () => {
    const { client } = setup([okCustomer()]);
    await expect(
      client.createCustomer({ email: 'jim@example.com', partner_id: 'part_xyz' }),
    ).resolves.toEqual(CUSTOMER);
  });

  it('omits undefined fields rather than sending nulls Tolt would store', async () => {
    const { client, fetchFn } = setup([okCustomer()]);

    await client.createCustomer({
      email: 'jim@example.com',
      partner_id: 'part_xyz',
      name: undefined,
      click_id: undefined,
    });

    expect(Object.keys(JSON.parse(fetchFn.mock.calls[0][1]?.body as string))).toEqual([
      'email',
      'partner_id',
    ]);
  });

  it('posts transactions to /v1/transactions', async () => {
    const transaction = { id: 'txn_1', amount: '629', customer_id: 'cus_abc' };
    const { client, fetchFn } = setup([jsonResponse({ success: true, data: [transaction] })]);

    const result = await client.createTransaction({ amount: 629, customer_id: 'cus_abc' });

    expect(fetchFn.mock.calls[0][0]).toBe('https://api.tolt.com/v1/transactions');
    expect(result).toEqual(transaction);
  });

  it('tolerates a base URL with a trailing slash', async () => {
    const { fetchFn } = setup([okCustomer()]);
    const withSlash = new ToltClient(
      { ...CONFIG, baseUrl: 'https://api.tolt.com/' },
      fetchFn as never,
      vi.fn(() => Promise.resolve()),
    );

    await withSlash.createCustomer({ email: 'a@b.c', partner_id: 'p' });

    expect(fetchFn.mock.calls[0][0]).toBe('https://api.tolt.com/v1/customers');
  });
});

describe('ToltClient error handling', () => {
  it('throws ToltApiError carrying the status and Tolt message', async () => {
    const { client } = setup([
      jsonResponse({ success: false, message: 'Customer already exists' }, 409),
    ]);

    await expect(client.createCustomer({ email: 'a@b.c', partner_id: 'p' })).rejects.toMatchObject({
      name: 'ToltApiError',
      status: 409,
      message: expect.stringContaining('Customer already exists'),
    });
  });

  it('throws on a 200 whose envelope reports success: false', async () => {
    const { client } = setup([jsonResponse({ success: false, message: 'nope' })]);
    await expect(client.createCustomer({ email: 'a@b.c', partner_id: 'p' })).rejects.toBeInstanceOf(
      ToltApiError,
    );
  });

  it('throws when the envelope carries no record', async () => {
    const { client } = setup([jsonResponse({ success: true, data: [] })]);
    await expect(client.createCustomer({ email: 'a@b.c', partner_id: 'p' })).rejects.toBeInstanceOf(
      ToltApiError,
    );
  });

  it('throws rather than hanging when the body is not JSON', async () => {
    const { client } = setup([new Response('<html>502</html>', { status: 200 })]);
    await expect(client.createCustomer({ email: 'a@b.c', partner_id: 'p' })).rejects.toBeInstanceOf(
      ToltApiError,
    );
  });

  it('never leaks the api key into the error message', async () => {
    const { client } = setup([jsonResponse({ success: false, message: 'bad' }, 401)]);

    await expect(client.createCustomer({ email: 'a@b.c', partner_id: 'p' })).rejects.toSatisfy(
      (error: Error) => !error.message.includes('sk_test_123'),
    );
  });
});

describe('ToltClient retries', () => {
  it('retries a 503 and returns the eventual success', async () => {
    const { client, fetchFn } = setup([jsonResponse({}, 503), okCustomer()]);

    await expect(client.createCustomer({ email: 'a@b.c', partner_id: 'p' })).resolves.toEqual(
      CUSTOMER,
    );
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('retries a 429 rate-limit response', async () => {
    const { client, fetchFn } = setup([jsonResponse({}, 429), okCustomer()]);
    await client.createCustomer({ email: 'a@b.c', partner_id: 'p' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('gives up after the attempt cap and throws the last error', async () => {
    const { client, fetchFn } = setup([
      jsonResponse({}, 503),
      jsonResponse({}, 503),
      jsonResponse({}, 503),
    ]);

    await expect(client.createCustomer({ email: 'a@b.c', partner_id: 'p' })).rejects.toMatchObject({
      status: 503,
    });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('backs off between attempts', async () => {
    const { client, sleep } = setup([jsonResponse({}, 503), okCustomer()]);
    await client.createCustomer({ email: 'a@b.c', partner_id: 'p' });
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep.mock.calls[0][0]).toBeGreaterThan(0);
  });

  it('does not retry a 400 — the request is wrong and will stay wrong', async () => {
    const { client, fetchFn } = setup([jsonResponse({ message: 'bad request' }, 400)]);
    await expect(client.createCustomer({ email: 'a@b.c', partner_id: 'p' })).rejects.toBeDefined();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does not retry a 409 — the record already exists', async () => {
    const { client, fetchFn } = setup([jsonResponse({ message: 'exists' }, 409)]);
    await expect(client.createCustomer({ email: 'a@b.c', partner_id: 'p' })).rejects.toBeDefined();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does not retry a 500 — the write may already have landed', async () => {
    const { client, fetchFn } = setup([jsonResponse({ message: 'boom' }, 500)]);
    await expect(client.createCustomer({ email: 'a@b.c', partner_id: 'p' })).rejects.toBeDefined();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does not retry a timeout — a transaction may already have been created', async () => {
    const timeout = Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' });
    const { client, fetchFn } = setup([timeout]);

    await expect(
      client.createTransaction({ amount: 629, customer_id: 'cus_abc' }),
    ).rejects.toBeInstanceOf(ToltApiError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('retries a connection refusal, which provably never reached Tolt', async () => {
    const refused = Object.assign(new Error('fetch failed'), {
      cause: { code: 'ECONNREFUSED' },
    });
    const { client, fetchFn } = setup([refused, okCustomer()]);

    await expect(client.createCustomer({ email: 'a@b.c', partner_id: 'p' })).resolves.toEqual(
      CUSTOMER,
    );
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe('ToltClient.refundTransaction', () => {
  it('PUTs to the refund path with no body', async () => {
    const { client, fetchFn } = setup([
      jsonResponse({ success: true, data: [{ id: 'txn_1', status: 'refunded' }] }),
    ]);

    await client.refundTransaction('txn_1');

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://api.tolt.com/v1/transactions/txn_1/refund');
    expect(init?.method).toBe('PUT');
    expect(init?.body).toBeUndefined();
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer sk_test_123');
  });

  it('returns the refunded transaction', async () => {
    const refunded = { id: 'txn_1', status: 'refunded', amount: '629' };
    const { client } = setup([jsonResponse({ success: true, data: [refunded] })]);
    await expect(client.refundTransaction('txn_1')).resolves.toEqual(refunded);
  });

  it('throws when Tolt does not know the transaction', async () => {
    const { client } = setup([jsonResponse({ success: false, message: 'Not found' }, 404)]);
    await expect(client.refundTransaction('txn_missing')).rejects.toBeInstanceOf(ToltApiError);
  });
});
