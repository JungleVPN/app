import { AnalyticsApiProvider, ApiProvider } from '@workspace/core/api';
import { getDirection, i18n } from '@workspace/core/core/i18n';
import { LandingPage } from '@workspace/core/pages';
import { AppRoutesProvider, PaymentsApiProvider, SupabaseProvider } from '@workspace/core/runtime';
import { configuredDomains, isLandingPath, resolveLocaleForRequest } from '@workspace/core/utils';
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
  ogLocale: string;
}

const LOCALE_CONFIGS: Record<string, Omit<DomainConfig, 'Landing'>> = {
  ru: {
    locale: 'ru',
    lang: 'ru',
    title: 'JungleVPN — Быстрый и надёжный VPN',
    description:
      'JungleVPN откроет доступ к свободному и безопасному интернету. Высокая скорость, безлимитный трафик и большое количество устройств. Безопасный VPN-сервис для всей семьи.',
    ogLocale: 'ru_RU',
  },
  en: {
    locale: 'en',
    lang: 'en',
    title: 'JungleVPN — Fast & Secure VPN',
    description:
      'Protect your connection, browse privately and stay secure on public Wi-Fi — with one VPN for all your devices.',
    ogLocale: 'en_US',
  },
  ar: {
    locale: 'ar',
    lang: 'ar',
    title: 'JungleVPN — VPN سريع وآمن',
    description:
      'احمِ اتصالك، وتصفّح بخصوصية، وابقَ آمنًا على شبكات الواي فاي العامة — بشبكة VPN واحدة تحمي جميع أجهزتك.',
    ogLocale: 'ar_AR',
  },
};

/** Landing-page paths per language, for the SSR head's hreflang alternates. */
const LANDING_PATH_BY_LOCALE: Record<'en' | 'ar', string> = { en: '/en', ar: '/ar' };

function resolveConfig(hostname: string, pathname: string): DomainConfig {
  const localeKey = resolveLocaleForRequest(hostname, pathname, configuredDomains());
  const base = LOCALE_CONFIGS[localeKey] ?? LOCALE_CONFIGS['en']!;
  return { ...base, Landing: LandingPage };
}

/**
 * hreflang alternates for the global domain's landing languages, plus an x-default.
 * RU-only hosts don't offer /en or /ar, so they get none of these.
 */
function landingAlternateLinks(config: DomainConfig, hostname: string, pathname: string): string {
  if (config.locale === 'ru' || !isLandingPath(pathname)) return '';

  const origin = `https://${hostname}`;
  const links = (Object.entries(LANDING_PATH_BY_LOCALE) as [string, string][]).map(
    ([lang, path]) => `<link rel="alternate" hreflang="${lang}" href="${origin}${path}">`,
  );
  links.push(`<link rel="alternate" hreflang="x-default" href="${origin}/">`);
  return links.join('\n    ');
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
  const pathname = new URL(request.url).pathname;
  const config = resolveConfig(hostname, pathname);

  await i18n.changeLanguage(config.locale);

  const head = [
    `<title>${config.title}</title>`,
    `<meta name="description" content="${config.description}">`,
    `<meta property="og:title" content="${config.title}">`,
    `<meta property="og:description" content="${config.description}">`,
    `<meta property="og:locale" content="${config.ogLocale}">`,
    landingAlternateLinks(config, hostname, pathname),
  ]
    .filter(Boolean)
    .join('\n    ');

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
