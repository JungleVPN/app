import { describe, expect, it } from 'vitest';
import { paddleAmountToNumber, paddleCurrencyDecimals } from './paddle.utils';

describe('paddleCurrencyDecimals', () => {
  it.each([
    'JPY',
    'KRW',
    'CLP',
  ])('reports 0 decimals for the zero-decimal currency %s', (currency) => {
    expect(paddleCurrencyDecimals(currency)).toBe(0);
  });

  it.each(['USD', 'EUR', 'GBP'])('reports 2 decimals for %s', (currency) => {
    expect(paddleCurrencyDecimals(currency)).toBe(2);
  });
});

describe('paddleAmountToNumber', () => {
  it('divides a regular currency amount by 100 (cents to major units)', () => {
    expect(paddleAmountToNumber('2999', 'USD')).toBe(29.99);
  });

  it.each([
    'JPY',
    'KRW',
    'CLP',
  ])('leaves a zero-decimal currency amount as-is for %s', (currency) => {
    expect(paddleAmountToNumber('1200', currency)).toBe(1200);
  });
});
