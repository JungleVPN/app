import { afterEach, describe, expect, it } from 'vitest';
import { clearCheckoutEmail, getCheckoutEmail, saveCheckoutEmail } from './checkoutEmail';

afterEach(() => localStorage.clear());

describe('checkout email storage', () => {
  it('has no email until one is saved', () => {
    expect(getCheckoutEmail()).toBe('');
  });

  it('keeps the saved email', () => {
    saveCheckoutEmail('payer@test.com');

    expect(getCheckoutEmail()).toBe('payer@test.com');
  });

  it('replaces the stored email when a different one is saved', () => {
    saveCheckoutEmail('first@test.com');
    saveCheckoutEmail('second@test.com');

    expect(getCheckoutEmail()).toBe('second@test.com');
  });

  it('forgets the email once cleared', () => {
    saveCheckoutEmail('payer@test.com');

    clearCheckoutEmail();

    expect(getCheckoutEmail()).toBe('');
  });
});
