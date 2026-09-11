import { SubscriptionPageRawConfigSchema } from '@workspace/types';
import { useEffect, useState } from 'react';
import { ApiClientError, useRemnawaveApi } from '../api';
import { coreEnv } from '../env';
import { useSubscriptionConfigStore, useSubscriptionInfoStore } from '../stores';

export type SubscriptionDataError = 'ERR_GET_SUB_LINK' | 'ERR_FATCH_USER' | 'ERR_PARSE_APPCONFIG';

/**
 * Module-level sets track in-flight requests so duplicate UUIDs are not fetched twice.
 * Store reads/writes use `getState()` inside effects only (not reactive deps) to avoid loops.
 */
const pendingShortUuids = new Set<string>();
const pendingConfigShortUuids = new Set<string>();

export function useSubscriptionData(shortUuid: string | undefined) {
  const remnawaveApi = useRemnawaveApi();

  const [error, setError] = useState<SubscriptionDataError | null>(null);

  useEffect(() => {
    if (!shortUuid) return;
    // All store access via getState() — never reactive deps.
    if (useSubscriptionInfoStore.getState().subscription) return;
    if (pendingShortUuids.has(shortUuid)) return;

    pendingShortUuids.add(shortUuid);

    const fetchSubscription = async () => {
      try {
        const subscriptionInfo = await remnawaveApi.getSubscriptionInfoByShortUuid(shortUuid);
        if (subscriptionInfo) {
          useSubscriptionInfoStore
            .getState()
            .actions.setSubscriptionInfo({ subscription: { ...subscriptionInfo } });
        }
      } catch (err) {
        setError(
          err instanceof ApiClientError && err.status === 404
            ? 'ERR_GET_SUB_LINK'
            : 'ERR_FATCH_USER',
        );
        console.error('Failed to fetch subscription:', err);
      } finally {
        pendingShortUuids.delete(shortUuid);
      }
    };

    void fetchSubscription();
  }, [shortUuid, remnawaveApi]);

  useEffect(() => {
    if (!shortUuid) return;
    // All store access via getState() — never reactive deps.
    if (useSubscriptionConfigStore.getState().isConfigLoaded) return;
    if (pendingConfigShortUuids.has(shortUuid)) return;

    pendingConfigShortUuids.add(shortUuid);

    const fetchConfig = async () => {
      try {
        const resolved = await remnawaveApi.getSubpageConfigByShortUuid(shortUuid);
        const configUuid = resolved?.subpageConfigUuid ?? coreEnv.subpageConfigUuid;
        if (!configUuid) {
          console.error(
            '[useSubscriptionData] No subpage config uuid resolved for shortUuid:',
            shortUuid,
          );
          setError('ERR_PARSE_APPCONFIG');
          return;
        }

        const rawConfig = await remnawaveApi.getSubscriptionPageConfig(configUuid);
        if (rawConfig == null) {
          console.error(
            '[useSubscriptionData] Empty subscription page config response for subpageConfigUuid:',
            configUuid,
          );
          setError('ERR_PARSE_APPCONFIG');
          return;
        }

        const parsed = await SubscriptionPageRawConfigSchema.safeParseAsync(rawConfig.config);
        if (!parsed.success) {
          console.error(
            '[useSubscriptionData] SubscriptionPageRawConfigSchema validation failed:',
            parsed.error.flatten(),
            '\nRaw keys:',
            rawConfig && typeof rawConfig === 'object' ? Object.keys(rawConfig) : typeof rawConfig,
          );
          setError('ERR_PARSE_APPCONFIG');
          return;
        }
        useSubscriptionConfigStore.getState().actions.setConfig(parsed.data);
      } catch {
        setError('ERR_PARSE_APPCONFIG');
      } finally {
        pendingConfigShortUuids.delete(shortUuid);
      }
    };

    void fetchConfig();
  }, [shortUuid, remnawaveApi]);

  return { error };
}
