import { describe, expect, it, vi } from 'vitest';
import { UserFirstConnectedListener } from './user-first-connected.listener';

function buildAnalyticsClient() {
  return { track: vi.fn().mockResolvedValue(undefined) };
}

describe('UserFirstConnectedListener', () => {
  it('tracks user_first_connected with the Remnawave user id', async () => {
    const analyticsClient = buildAnalyticsClient();
    const listener = new UserFirstConnectedListener(analyticsClient as any);

    await listener.listenToUserFirstConnectedEvent({
      event: 'user.first_connected',
      data: { id: 846 },
      timestamp: '2026-09-04T00:00:00.000Z',
    } as any);

    expect(analyticsClient.track).toHaveBeenCalledWith({
      event: 'user_first_connected',
      userId: 846,
    });
  });

  it('does not track when the payload carries no user id', async () => {
    const analyticsClient = buildAnalyticsClient();
    const listener = new UserFirstConnectedListener(analyticsClient as any);

    await listener.listenToUserFirstConnectedEvent({
      event: 'user.first_connected',
      data: { id: null },
      timestamp: '2026-09-04T00:00:00.000Z',
    } as any);

    expect(analyticsClient.track).not.toHaveBeenCalled();
  });
});
