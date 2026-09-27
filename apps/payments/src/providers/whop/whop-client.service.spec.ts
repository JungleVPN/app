import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WhopClientService } from './whop-client.service';

/** A Whop SDK page, as far as the service reads it: iterable across every page. */
const page = <T>(items: T[]) => ({
  data: items,
  async *[Symbol.asyncIterator]() {
    yield* items;
  },
});

const membersList = vi.fn();
const membershipsList = vi.fn();
const paymentsCreate = vi.fn();
const membershipsCancel = vi.fn();
const WhopClient = vi.fn();

vi.mock('@whop/sdk', () => ({
  WhopEnvironment: {
    Production: { api: 'https://api.whop.com/api/v1' },
    Sandbox: { api: 'https://sandbox-api.whop.com/api/v1' },
  },
  WhopClient: vi.fn().mockImplementation(function WhopClientMock(options: unknown) {
    WhopClient(options);
    return {
      members: { list: membersList },
      memberships: { list: membershipsList, cancel: membershipsCancel },
      payments: { create: paymentsCreate },
    };
  }),
}));

const ENV_KEYS = ['WHOP_API_KEY', 'WHOP_ENVIRONMENT', 'WHOP_ACCOUNT_ID'] as const;

describe('WhopClientService', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    vi.clearAllMocks();
    process.env.WHOP_API_KEY = 'test_key';
    process.env.WHOP_ENVIRONMENT = 'sandbox';
    process.env.WHOP_ACCOUNT_ID = 'biz_test';
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  describe('construction', () => {
    it('refuses to start without a Whop API key, rather than send unauthenticated requests', () => {
      delete process.env.WHOP_API_KEY;

      expect(() => new WhopClientService()).toThrow(/WHOP_API_KEY/);
    });

    it('refuses to start without the account it sells from', () => {
      delete process.env.WHOP_ACCOUNT_ID;

      expect(() => new WhopClientService()).toThrow(/WHOP_ACCOUNT_ID/);
    });

    it('refuses to start with no environment configured, rather than default to a real Whop account', () => {
      delete process.env.WHOP_ENVIRONMENT;

      expect(() => new WhopClientService()).toThrow(/WHOP_ENVIRONMENT/);
    });

    it('refuses an environment value that is neither sandbox nor production', () => {
      process.env.WHOP_ENVIRONMENT = 'staging';

      expect(() => new WhopClientService()).toThrow(/WHOP_ENVIRONMENT/);
    });

    it('talks to the Whop sandbox when configured for it', () => {
      new WhopClientService();

      expect(WhopClient).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'test_key',
          environment: { api: 'https://sandbox-api.whop.com/api/v1' },
        }),
      );
    });

    it('talks to production Whop when configured for it', () => {
      process.env.WHOP_ENVIRONMENT = 'production';

      new WhopClientService();

      expect(WhopClient).toHaveBeenCalledWith(
        expect.objectContaining({ environment: { api: 'https://api.whop.com/api/v1' } }),
      );
    });
  });

  describe('hasActiveSubscription', () => {
    it('reports no subscription when Whop has no member for the email', async () => {
      membersList.mockResolvedValue(page([]));
      const service = new WhopClientService();

      await expect(service.hasActiveSubscription('nobody@test.com')).resolves.toBe(false);
      expect(membersList).toHaveBeenCalledWith(
        expect.objectContaining({ account_id: 'biz_test', query: 'nobody@test.com' }),
      );
      expect(membershipsList).not.toHaveBeenCalled();
    });

    it('ignores a member that is a business rather than a person', async () => {
      membersList.mockResolvedValue(page([{ id: 'mber_1', user: null }]));
      const service = new WhopClientService();

      await expect(service.hasActiveSubscription('payer@test.com')).resolves.toBe(false);
      expect(membershipsList).not.toHaveBeenCalled();
    });

    it('reports no subscription when the member has only ended memberships', async () => {
      membersList.mockResolvedValue(page([{ id: 'mber_1', user: { id: 'user_1' } }]));
      membershipsList.mockResolvedValue(
        page([
          { id: 'mem_1', status: 'canceled' },
          { id: 'mem_2', status: 'expired' },
          { id: 'mem_3', status: 'past_due' },
        ]),
      );
      const service = new WhopClientService();

      await expect(service.hasActiveSubscription('payer@test.com')).resolves.toBe(false);
      expect(membershipsList).toHaveBeenCalledWith(
        expect.objectContaining({ account_id: 'biz_test', user_id: 'user_1' }),
      );
    });

    it.each([
      'active',
      'trialing',
      'canceling',
    ])('reports a subscription when the member has a %s membership', async (status) => {
      membersList.mockResolvedValue(page([{ id: 'mber_1', user: { id: 'user_1' } }]));
      membershipsList.mockResolvedValue(
        page([
          { id: 'mem_1', status: 'expired' },
          { id: 'mem_2', status },
        ]),
      );
      const service = new WhopClientService();

      await expect(service.hasActiveSubscription('payer@test.com')).resolves.toBe(true);
    });

    it('surfaces a Whop failure rather than let a duplicate checkout through', async () => {
      membersList.mockResolvedValue(page([{ id: 'mber_1', user: { id: 'user_1' } }]));
      membershipsList.mockRejectedValue(new Error('Whop is down'));
      const service = new WhopClientService();

      await expect(service.hasActiveSubscription('payer@test.com')).rejects.toThrow('Whop is down');
    });
  });

  describe('createPayment', () => {
    it('charges the confirmation token for the Whop plan on our account, stamped with our metadata', async () => {
      paymentsCreate.mockResolvedValue({ id: 'pay_1', status: 'open', client_secret: 'sec_1' });
      const service = new WhopClientService();

      await service.createPayment({
        planId: 'plan_month',
        confirmationToken: 'ctok_1',
        email: 'payer@test.com',
        metadata: { email: 'payer@test.com' },
        returnUrl: 'https://app.test/payment/success',
      });

      expect(paymentsCreate).toHaveBeenCalledWith({
        account_id: 'biz_test',
        plan_id: 'plan_month',
        confirmation_token: 'ctok_1',
        email: 'payer@test.com',
        metadata: { email: 'payer@test.com' },
        return_url: 'https://app.test/payment/success',
      });
    });

    it('returns what the browser needs to finish the payment', async () => {
      paymentsCreate.mockResolvedValue({ id: 'pay_1', status: 'open', client_secret: 'sec_1' });
      const service = new WhopClientService();

      const payment = await service.createPayment({
        planId: 'plan_month',
        confirmationToken: 'ctok_1',
        email: 'payer@test.com',
        metadata: {},
        returnUrl: 'https://app.test/payment/success',
      });

      expect(payment).toEqual({ paymentId: 'pay_1', status: 'open', clientSecret: 'sec_1' });
    });
  });

  describe('cancelMembership', () => {
    it('stops the membership renewing, keeping access until the period ends', async () => {
      membershipsCancel.mockResolvedValue({
        id: 'mem_1',
        cancel_at_period_end: true,
        current_period_end: '2026-10-26T10:00:00Z',
      });
      const service = new WhopClientService();

      await expect(service.cancelMembership('mem_1')).resolves.toEqual({
        cancelAtPeriodEnd: true,
        accessUntil: '2026-10-26T10:00:00Z',
      });
      expect(membershipsCancel).toHaveBeenCalledWith({ id: 'mem_1', cancel_at_period_end: true });
    });
  });
});
