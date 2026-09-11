import { afterEach, describe, expect, it } from 'vitest';
import { rememberPendingYookassaPayment, takePendingYookassaPayment } from './pendingPayment';

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
