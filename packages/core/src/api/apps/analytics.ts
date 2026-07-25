import {
  AttributionPayload,
  apiRoutes,
  CreateUserResponseDto,
  TmaOpenedEvent,
} from '@workspace/types';
import type { ApiClient } from '../client';

export function createAnalyticsApi(client: ApiClient) {
  return {
    trackUserCreated(user: CreateUserResponseDto, attribution: AttributionPayload): void {
      client
        .post<void>(apiRoutes.analytics.trackUserCreated, { user, attribution })
        .catch((err: unknown) => {
          console.error('[analytics] trackUserCreated failed', err);
        });
    },

    trackTmaOpened(event: Omit<TmaOpenedEvent, 'event'>): void {
      client
        .post<void>(apiRoutes.analytics.trackEvent, {
          ...event,
          event: 'tma_opened',
        })
        .catch((err: unknown) => {
          console.error('[analytics] trackTmaOpened failed', err);
        });
    },
  };
}

export type AnalyticsApi = ReturnType<typeof createAnalyticsApi>;
