import { type ArgumentsHost, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GlobalExceptionFilter } from './http-exception.filter';

function respond(exception: unknown) {
  const json = vi.fn();
  const response = { status: vi.fn((_status: number) => ({ json })) };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  new GlobalExceptionFilter().catch(exception, host);
  return { status: response.status.mock.calls[0]?.[0], body: json.mock.calls[0]?.[0] };
}

describe('GlobalExceptionFilter', () => {
  // Clients branch on the code (e.g. the mini app tells an expired session from
  // any other rejection), so it must survive the filter.
  it('passes an exception code through to the client', () => {
    const { status, body } = respond(
      new UnauthorizedException({
        message: 'Telegram initData has expired',
        code: 'init_data_expired',
      }),
    );

    expect(status).toBe(401);
    expect(body).toEqual({
      statusCode: 401,
      error: 'Telegram initData has expired',
      code: 'init_data_expired',
    });
  });

  it('sends no code when the exception has none', () => {
    const { body } = respond(new UnauthorizedException('Invalid Telegram initData signature'));

    expect(body).toEqual({ statusCode: 401, error: 'Invalid Telegram initData signature' });
  });
});
