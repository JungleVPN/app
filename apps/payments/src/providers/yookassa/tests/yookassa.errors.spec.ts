import { YooKassaErr } from '@payments/providers/yookassa/helpers/yookassa.errors';
import { describe, expect, it } from 'vitest';

describe('YooKassaErr', () => {
  it('exposes every field from the YooKassa error body', () => {
    const err = new YooKassaErr('e-1', 'invalid_request', 'Amount is invalid', 'amount.value', 400);

    expect(err.id).toBe('e-1');
    expect(err.code).toBe('invalid_request');
    expect(err.description).toBe('Amount is invalid');
    expect(err.parameter).toBe('amount.value');
    expect(err.httpStatus).toBe(400);
    expect(err.type).toBe('error');
    expect(err.name).toBe('YooKassaErr');
  });

  it('is an Error, so it survives throw/catch and instanceof checks', () => {
    const err = new YooKassaErr('e-2', 'not_found', 'Payment not found');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(YooKassaErr);
  });

  it('names the offending parameter in the message when one is given', () => {
    const err = new YooKassaErr('e-3', 'invalid_request', 'Bad value', 'payment_method_id', 400);

    expect(err.message).toBe('[invalid_request] Bad value (parameter: payment_method_id)');
  });

  it('omits the parameter suffix when no parameter is given', () => {
    const err = new YooKassaErr('e-4', 'not_found', 'Payment not found', undefined, 404);

    expect(err.message).toBe('[not_found] Payment not found');
    expect(err.parameter).toBeUndefined();
  });

  it('omits the parameter suffix for an empty-string parameter, which names nothing', () => {
    const err = new YooKassaErr('e-5', 'invalid_request', 'Bad value', '');

    expect(err.message).toBe('[invalid_request] Bad value');
  });

  it('leaves httpStatus undefined when the caller has no response status to report', () => {
    const err = new YooKassaErr('e-6', 'internal_server_error', 'Oops');

    expect(err.httpStatus).toBeUndefined();
  });
});
