import { AnalyticsApiProvider, ApiProvider } from '@workspace/core/api';
import { getDirection, i18n } from '@workspace/core/core/i18n';
import { LandingPage } from '@workspace/core/pages';
import { AppRoutesProvider, PaymentsApiProvider, SupabaseProvider } from '@workspace/core/runtime';
import { configuredDomains, resolveLocaleForHost } from '@workspace/core/utils';
import { type ComponentType, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { analyticsClient } from '@/api/analytics';
import { paymentsApi } from '@/api/payments';
import { backendClient } from '@/api/remnawave';
import { resolveRenderStatus } from './render-status';
import { createRoutes } from './routes';

interface DomainConfig {
  Landing: ComponentType;
  locale: string;
  lang: string;
  title: string;
  description: string;
}

const LOCALE_CONFIGS: Record<string, Omit<DomainConfig, 'Landing'>> = {
  ru: {
    locale: 'ru',
    lang: 'ru',
    title: 'JungleVPN — Быстрый и надёжный VPN',
    description:
      'JungleVPN откроет доступ к свободному и безопасному интернету. Высокая скорость, безлимитный трафик и большое количество устройств. Безопасный VPN-сервис для всей семьи.',
  },
  en: {
    locale: 'en',
    lang: 'en',
    title: 'JungleVPN — Fast & Secure VPN',
    description:
      'Protect your connection, browse privately and stay secure on public Wi-Fi — with one VPN for all your devices.',
  },
  ar: {
    locale: 'ar',
    lang: 'ar',
    title: 'JungleVPN — VPN سريع وآمن',
    description:
      'احمِ اتصالك، وتصفّح بخصوصية، وابقَ آمنًا على شبكات الواي فاي العامة — بشبكة VPN واحدة تحمي جميع أجهزتك.',
  },
};

function resolveConfig(hostname: string): DomainConfig {
  const localeKey = resolveLocaleForHost(hostname, configuredDomains());
  const base = LOCALE_CONFIGS[localeKey] ?? LOCALE_CONFIGS['en']!;
  return { ...base, Landing: LandingPage };
}

const appRoutes = {
  paymentReturnPath: '/profile/subscription',
  authGateRedirectPath: '/login',
  affiliatesPath: '/affiliates',
  profileSubscriptionPath: '/profile/subscription',
  profilePaymentPath: '/profile/payments',
  profilePlansPath: '/profile/plans',
  profileDevicesPath: '/profile/devices',
  profileExtraDevicePurchasePath: '/profile/devices/extra',
  profileTransactionsPath: '/profile/transactions',
  profileMenuPath: '/profile/menu',
  profileReferralsPath: '/profile/referrals',
  getSubscriptionPath: '/subscribe',
};

export async function render(request: Request, hostname: string) {
  const config = resolveConfig(hostname);

  await i18n.changeLanguage(config.locale);

  const head = [
    `<title>${config.title}</title>`,
    `<meta name="description" content="${config.description}">`,
    `<meta property="og:title" content="${config.title}">`,
    `<meta property="og:description" content="${config.description}">`,
  ].join('\n    ');

  const routes = createRoutes(config.Landing);
  const handler = createStaticHandler(routes);
  const context = await handler.query(request);

  if (context instanceof Response) return context;

  const status = resolveRenderStatus(context);

  // Unmatched URL or unsupported method: there is no page to build, so skip the
  // render entirely and let the caller answer with the status. Rendering here
  // would burn an SSR pass to produce an error boundary served as 200.
  if (status >= 400) {
    return { html: '', head, lang: config.lang, dir: getDirection(config.locale), status };
  }

  let html = '';
  try {
    const router = createStaticRouter(handler.dataRoutes, context);
    html = renderToString(
      <StrictMode>
        <AppRoutesProvider value={appRoutes}>
          <PaymentsApiProvider api={paymentsApi}>
            <AnalyticsApiProvider client={analyticsClient}>
              <SupabaseProvider
                getClient={() => {
                  throw new Error('Supabase unavailable in SSR');
                }}
              >
                <ApiProvider client={backendClient}>
                  <StaticRouterProvider router={router} context={context} />
                </ApiProvider>
              </SupabaseProvider>
            </AnalyticsApiProvider>
          </PaymentsApiProvider>
        </AppRoutesProvider>
      </StrictMode>,
    );
  } catch (e) {
    console.warn('[SSR] render failed, serving CSR fallback:', (e as Error).message);
  }

  return { html, head, lang: config.lang, dir: getDirection(config.locale), status };
}
