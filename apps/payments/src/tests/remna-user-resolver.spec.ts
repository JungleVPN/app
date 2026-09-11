import 'reflect-metadata';
import { RemnaUserResolverService } from '@payments/auth/remna-user-resolver.service';
import { describe, expect, it, vi } from 'vitest';

const config = () =>
  ({
    getOrThrow: (key: string) =>
      key === 'REMNAWAVE_URL' ? 'http://remnawave' : 'inter-service-secret',
  }) as never;

const resolverWith = (http: { get?: unknown; post?: unknown }) => {
  const service = new RemnaUserResolverService(config());
  Object.assign(service as unknown as { http: unknown }, { http });
  return service;
};

describe('RemnaUserResolverService.resolveOrCreateByEmail', () => {
  it('bills the existing account when one already owns the email', async () => {
    const post = vi.fn();
    const service = resolverWith({
      get: vi.fn().mockResolvedValue({ data: [{ id: 7 }] }),
      post,
    });

    await expect(service.resolveOrCreateByEmail('payer@test.com')).resolves.toBe(7);
    expect(post).not.toHaveBeenCalled();
  });

  it('creates an account when the email is new, and bills the created user', async () => {
    const post = vi.fn().mockResolvedValue({ data: { id: 11 } });
    const service = resolverWith({ get: vi.fn().mockResolvedValue({ data: [] }), post });

    await expect(service.resolveOrCreateByEmail('new@test.com')).resolves.toBe(11);
    expect(post).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({ email: 'new@test.com' }),
      expect.anything(),
    );
  });

  it('creates an account when the lookup itself fails, rather than dropping the sale', async () => {
    const post = vi.fn().mockResolvedValue({ data: { id: 12 } });
    const service = resolverWith({ get: vi.fn().mockRejectedValue(new Error('panel down')), post });

    await expect(service.resolveOrCreateByEmail('new@test.com')).resolves.toBe(12);
  });

  it('forwards the referral and origin so signup attribution and squad survive', async () => {
    const post = vi.fn().mockResolvedValue({ data: { id: 13 } });
    const service = resolverWith({ get: vi.fn().mockResolvedValue({ data: [] }), post });

    await service.resolveOrCreateByEmail('new@test.com', {
      inviterId: 99,
      origin: 'https://jungle-vpn.com',
    });

    expect(post).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({ inviterId: 99 }),
      expect.objectContaining({ headers: { origin: 'https://jungle-vpn.com' } }),
    );
  });

  it('reports a failure to create rather than returning an unusable id', async () => {
    const service = resolverWith({
      get: vi.fn().mockResolvedValue({ data: [] }),
      post: vi.fn().mockResolvedValue({ data: {} }),
    });

    await expect(service.resolveOrCreateByEmail('new@test.com')).rejects.toThrow();
  });
});
