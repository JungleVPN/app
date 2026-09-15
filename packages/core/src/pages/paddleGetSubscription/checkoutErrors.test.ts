import { ACTIVE_SUBSCRIPTION_CODE } from '@workspace/types';
import { describe, expect, it } from 'vitest';
import { ApiClientError } from '../../api';
import { isActiveSubscriptionError, isThrottledError } from './checkoutErrors';

describe('isThrottledError', () => {
  it('recognises a 429 from the backend as throttling', () => {
    const error = new ApiClientError({ status: 429, message: 'Too many requests', data: null });

    expect(isThrottledError(error)).toBe(true);
  });

  it('does not mistake an unrelated error for throttling', () => {
    expect(isThrottledError(new Error('network down'))).toBe(false);
  });

  it('does not mistake a different status code for throttling', () => {
    expect(isThrottledError(new ApiClientError({ status: 400, message: 'nope', data: null }))).toBe(false);
  });
});

describe('isActiveSubscriptionError', () => {
  it('recognises the 409 carrying the active-subscription code', () => {
    const error = new ApiClientError({ status: 409, message: 'conflict', data: { code: ACTIVE_SUBSCRIPTION_CODE } });

    expect(isActiveSubscriptionError(error)).toBe(true);
  });

  it('treats an unparsed 409 body as the active-subscription case too', () => {
    // This endpoint only answers 409 for one reason today.
    const error = new ApiClientError({ status: 409, message: 'conflict', data: null });

    expect(isActiveSubscriptionError(error)).toBe(true);
  });

  it('does not mistake a 409 carrying a different code', () => {
    const error = new ApiClientError({ status: 409, message: 'conflict', data: { code: 'something_else' } });

    expect(isActiveSubscriptionError(error)).toBe(false);
  });

  it('does not mistake an unrelated status code', () => {
    const error = new ApiClientError({ status: 400, message: 'bad request', data: { code: ACTIVE_SUBSCRIPTION_CODE } });

    expect(isActiveSubscriptionError(error)).toBe(false);
  });

  it('does not mistake a plain error for it', () => {
    expect(isActiveSubscriptionError(new Error('boom'))).toBe(false);
  });
});
