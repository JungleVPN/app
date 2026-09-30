import { afterEach, describe, expect, it } from 'vitest';
import {
  forgetPendingPurchase,
  rememberPendingPurchase,
  rememberPendingYookassaPayment,
  takePendingPurchase,
  takePendingYookassaPayment,
} from './pendingPayment';

describe('pending YooKassa payment', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('hands back the payment id the checkout left behind', () => {
    rememberPendingYookassaPayment('pay_1');

    expect(takePendingYookassaPayment()).toBe('pay_1');
  });

  it('yields the id only once, so a reload of the return page does not re-check it', () => {
    rememberPendingYookassaPayment('pay_1');
    takePendingYookassaPayment();

    expect(takePendingYookassaPayment()).toBeNull();
  });

  it('reports nothing pending when no checkout was started in this tab', () => {
    expect(takePendingYookassaPayment()).toBeNull();
  });

  it('keeps only the most recent checkout', () => {
    rememberPendingYookassaPayment('pay_1');
    rememberPendingYookassaPayment('pay_2');

    expect(takePendingYookassaPayment()).toBe('pay_2');
  });
});

describe('pending purchase', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('hands back the purchase the checkout left behind', () => {
    rememberPendingPurchase({ transactionId: 'pay_1', value: 7.99, currency: 'USD' });

    expect(takePendingPurchase()).toEqual({ transactionId: 'pay_1', value: 7.99, currency: 'USD' });
  });

  it('hands back a purchase whose amount was unknown', () => {
    rememberPendingPurchase({ transactionId: 'pay_1' });

    expect(takePendingPurchase()).toEqual({ transactionId: 'pay_1' });
  });

  it('yields the purchase only once, so a reload of the return page does not count it again', () => {
    rememberPendingPurchase({ transactionId: 'pay_1' });
    takePendingPurchase();

    expect(takePendingPurchase()).toBeNull();
  });

  it('reports nothing pending when no checkout was started in this tab', () => {
    expect(takePendingPurchase()).toBeNull();
  });

  it('drops a purchase that turned out not to be paid', () => {
    rememberPendingPurchase({ transactionId: 'pay_1' });
    forgetPendingPurchase();

    expect(takePendingPurchase()).toBeNull();
  });

  it('keeps only the most recent purchase', () => {
    rememberPendingPurchase({ transactionId: 'pay_1' });
    rememberPendingPurchase({ transactionId: 'pay_2' });

    expect(takePendingPurchase()).toEqual({ transactionId: 'pay_2' });
  });

  it.each([
    ['not JSON', '{'],
    ['not an object', '"pay_1"'],
    ['null', 'null'],
    ['missing a transaction id', '{"value":7.99,"currency":"USD"}'],
    ['an empty transaction id', '{"transactionId":""}'],
  ])('ignores a stored purchase that is %s', (_, stored) => {
    sessionStorage.setItem('jungle.pendingPurchase', stored);

    expect(takePendingPurchase()).toBeNull();
  });

  it.each([
    ['a non-numeric value', '{"transactionId":"pay_1","value":"7.99","currency":"USD"}'],
    ['a value that is not a number', '{"transactionId":"pay_1","value":null,"currency":"USD"}'],
    ['a missing currency', '{"transactionId":"pay_1","value":7.99}'],
    ['a missing value', '{"transactionId":"pay_1","currency":"USD"}'],
  ])('keeps only the transaction id when the stored amount has %s', (_, stored) => {
    sessionStorage.setItem('jungle.pendingPurchase', stored);

    expect(takePendingPurchase()).toEqual({ transactionId: 'pay_1' });
  });
});
