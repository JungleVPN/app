import { mockTelegramEnv, retrieveLaunchParams } from '@tma.js/sdk-react';

/**
 * Outside Telegram (plain browser on localhost / Cloudflare tunnel), launch params are missing
 * and `retrieveLaunchParams()` throws — see Telegram Mini Apps SDK discussion:
 * https://github.com/Telegram-Mini-Apps/tma.js/issues/373
 *
 * In dev (or when `PUBLIC_MOCK_TMA_OUTSIDE_TELEGRAM=true`), we mock minimal params so the UI can load.
 * Backend auth still needs real initData from Telegram in production.
 */
export function ensureTelegramLaunchParams() {
  try {
    return retrieveLaunchParams();
  } catch {
    const allowMock =
      import.meta.env.DEV || import.meta.env.PUBLIC_MOCK_TMA_OUTSIDE_TELEGRAM === 'true';

    if (!allowMock) {
      throw new Error(
        'Open this Mini App from Telegram. Launch parameters are only injected inside the Telegram client.',
      );
    }

    const tgWebAppData = new URLSearchParams({
      user: JSON.stringify({
        id: 999_000_111,
        first_name: 'Dev',
        username: 'dev_tunnel',
        language_code: 'en',
      }),
      auth_date: String(Math.floor(Date.now() / 1000)),
      hash: '0000000000000000000000000000000000000000000000000000000000000000',
    }).toString();

    mockTelegramEnv({
      launchParams: {
        tgWebAppPlatform: 'web',
        tgWebAppVersion: '8.0',
        tgWebAppThemeParams: {},
        tgWebAppData,
      },
    });

    return retrieveLaunchParams();
  }
}
