import { describe, expect, it } from 'vitest';
import { validateEmail } from './validators';

describe('validateEmail', () => {
  it.each([
    'payer@test.com',
    'first.last+tag@mail.example.co.uk',
    'payer@sub.domain.io',
    'user@example.рф',
    'user@example.xn--p1ai',
    'user@example.भारत',
    'user@example.বাংলা',
  ])('accepts %s', (email) => {
    expect(validateEmail(email)).toBe(true);
  });

  it.each([
    'ramazzan.ittiev@gmail.com2',
    'payer@test.c',
    'payer@test.123',
    'payer@test.com.',
    'payer@test',
    'payer@.com',
    'payer test@test.com',
    'payer@@test.com',
    '@test.com',
    '',
  ])('rejects %s', (email) => {
    expect(validateEmail(email)).toBe(false);
  });
});
