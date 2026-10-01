/**
 * PostHogService — the analytics app's only door to PostHog. A dev backend
 * (ANALYTICS_ENVIRONMENT=dev) sends nothing: it shares the PostHog project
 * with production, and its sandbox payments would look like real revenue.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostHogService } from './posthog.service';

const { PostHog, capture } = vi.hoisted(() => {
  const capture = vi.fn();
  const PostHog = vi.fn(function PostHog() {
    return { capture, identify: vi.fn(), alias: vi.fn(), flush: vi.fn(), shutdown: vi.fn() };
  });
  return { PostHog, capture };
});

vi.mock('posthog-node', () => ({ PostHog }));

describe('PostHogService', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('sends events to PostHog when configured', () => {
    vi.stubEnv('POSTHOG_API_KEY', 'phc_test');

    new PostHogService().capture('1000', 'payment_succeeded', {});

    expect(capture).toHaveBeenCalledWith({
      distinctId: '1000',
      event: 'payment_succeeded',
      properties: {},
    });
  });

  it('sends nothing from a dev backend, even with an API key', () => {
    vi.stubEnv('POSTHOG_API_KEY', 'phc_test');
    vi.stubEnv('ANALYTICS_ENVIRONMENT', 'dev');

    new PostHogService().capture('1000', 'payment_succeeded', {});

    expect(PostHog).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });
});
