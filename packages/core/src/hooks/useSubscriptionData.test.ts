import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSubscriptionConfigStore, useSubscriptionInfoStore } from '../stores';
import { useSubscriptionData } from './useSubscriptionData';

const mockGetSubscriptionInfoByShortUuid = vi.fn();
const mockGetSubpageConfigByShortUuid = vi.fn();
const mockGetSubscriptionPageConfig = vi.fn();

vi.mock('@workspace/types', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workspace/types')>();
  return {
    ...actual,
    SubscriptionPageRawConfigSchema: {
      safeParseAsync: async (config: unknown) => ({ success: true, data: config }),
    },
  };
});

vi.mock('../api', () => ({
  useRemnawaveApi: () => ({
    getSubscriptionInfoByShortUuid: mockGetSubscriptionInfoByShortUuid,
    getSubpageConfigByShortUuid: mockGetSubpageConfigByShortUuid,
    getSubscriptionPageConfig: mockGetSubscriptionPageConfig,
  }),
  ApiClientError: class ApiClientError extends Error {
    status: number;
    constructor(status: number) {
      super('api error');
      this.status = status;
    }
  },
}));

const RU_CONFIG_UUID = 'ru-config-uuid';
const GLOBAL_CONFIG_UUID = 'global-config-uuid';
const FALLBACK_CONFIG_UUID = 'fallback-config-uuid';

function rawConfig(locales: string[] = ['ru']) {
  return { locales };
}

describe('useSubscriptionData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSubscriptionInfoStore.getState().actions.resetState();
    useSubscriptionConfigStore.getState().actions.resetState();

    mockGetSubscriptionInfoByShortUuid.mockResolvedValue({ shortUuid: 'user-1' });
    mockGetSubpageConfigByShortUuid.mockResolvedValue({
      subpageConfigUuid: RU_CONFIG_UUID,
      webpageAllowed: true,
    });
    mockGetSubscriptionPageConfig.mockResolvedValue({ config: rawConfig() });
  });

  it('resolves the subpage config uuid from the user via getSubpageConfigByShortUuid', async () => {
    renderHook(() => useSubscriptionData('user-1'));

    await waitFor(() => expect(mockGetSubpageConfigByShortUuid).toHaveBeenCalledWith('user-1'));
    await waitFor(() => expect(mockGetSubscriptionPageConfig).toHaveBeenCalledWith(RU_CONFIG_UUID));
  });

  it('fetches a different config for a different squad without any other change', async () => {
    mockGetSubpageConfigByShortUuid.mockResolvedValue({
      subpageConfigUuid: GLOBAL_CONFIG_UUID,
      webpageAllowed: true,
    });

    renderHook(() => useSubscriptionData('user-2'));

    await waitFor(() =>
      expect(mockGetSubscriptionPageConfig).toHaveBeenCalledWith(GLOBAL_CONFIG_UUID),
    );
  });

  it('falls back to the provided default when the panel resolves no config uuid', async () => {
    mockGetSubpageConfigByShortUuid.mockResolvedValue({
      subpageConfigUuid: null,
      webpageAllowed: true,
    });

    renderHook(() => useSubscriptionData('user-3'));

    await waitFor(() =>
      expect(mockGetSubscriptionPageConfig).toHaveBeenCalledWith(FALLBACK_CONFIG_UUID),
    );
  });

  it('sets ERR_PARSE_APPCONFIG when neither the panel nor the fallback provide a config uuid', async () => {
    mockGetSubpageConfigByShortUuid.mockResolvedValue({
      subpageConfigUuid: null,
      webpageAllowed: true,
    });

    const { result } = renderHook(() => useSubscriptionData('user-4'));

    await waitFor(() => expect(result.current.error).toBe('ERR_PARSE_APPCONFIG'));
    expect(mockGetSubscriptionPageConfig).not.toHaveBeenCalled();
  });

  it('loads the resolved config into the subscription config store', async () => {
    renderHook(() => useSubscriptionData('user-5'));

    await waitFor(() => expect(useSubscriptionConfigStore.getState().isConfigLoaded).toBe(true));
    expect(useSubscriptionConfigStore.getState().config).toEqual(rawConfig());
  });

  it('does nothing when shortUuid is not yet available', async () => {
    renderHook(() => useSubscriptionData(undefined));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockGetSubpageConfigByShortUuid).not.toHaveBeenCalled();
    expect(mockGetSubscriptionInfoByShortUuid).not.toHaveBeenCalled();
  });
});
