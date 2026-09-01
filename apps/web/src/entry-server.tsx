import { AnalyticsApiProvider, ApiProvider } from '@workspace/core/api';
import { getDirection, i18n } from '@workspace/core/core/i18n';
import { LandingPage } from '@workspace/core/pages';
import { AppRoutesProvider, PaymentsApiProvider, SupabaseProvider } from '@workspace/core/runtime';
import {
  buildLlmsTxt,
  configuredDomains,
  isCrawlablePath,
  isLandingPath,
  localePolicyForHost,
  markdownPathFor,
  resolveLocaleForRequest,
} from '@workspace/core/utils';
import { type ComponentType, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { analyticsClient } from '@/api/analytics';
import { paymentsApi } from '@/api/payments';
import { backendClient } from '@/api/remnawave';
import { negotiateRepresentation } from './http/accept-negotiation';
import { htmlToMarkdown } from './markdown/html-to-markdown';
import { resolveRenderStatus } from './render-status';
import { createRoutes } from './routes';

export { isCrawlablePath, markdownPathFor } from '@workspace/core/utils';
export { negotiateRepresentation };

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
      'JungleVPN — быстрое и защищённое подключение дома, в поездках и в публичных сетях. Безлимитный трафик и поддержка всех ваших устройств. Надёжный VPN-сервис для всей семьи.',
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
      'احمِ اتصالك، وتصفّح بخصوصية، وابقَ آمنًا على شبكات Wi-Fi العامة — بخدمة VPN واحدة لجميع أجهزتك.',
    ogLocale: 'ar_AR',
  },
  tr: {
    locale: 'tr',
    lang: 'tr',
    title: 'JungleVPN — Hızlı ve Güvenli VPN',
    description:
      'Bağlantınızı güvence altına alın, gizliliğinizi koruyarak gezinin ve tüm cihazlarınız için tek bir VPN ile herkese açık Wi-Fi ağlarında güvende kalın.',
    ogLocale: 'tr_TR',
  },
};

/** Landing-page paths per language, for the SSR head's hreflang alternates. */
const LANDING_PATH_BY_LOCALE: Record<'en' | 'ar' | 'tr', string> = {
  en: '/en',
  ar: '/ar',
  tr: '/tr',
};

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

/** <link rel="alternate" type="text/markdown"> pointing crawlers at the page's Markdown mirror. */
function markdownAlternateLink(hostname: string, pathname: string): string {
  if (!isCrawlablePath(pathname)) return '';
  return `<link rel="alternate" type="text/markdown" href="https://${hostname}${markdownPathFor(pathname)}">`;
}

/**
 * A visually-hidden, screen-reader-hidden pointer to the page's Markdown mirror,
 * for the "human pastes this URL into an AI tool" flow. Static markup appended to
 * the rendered app HTML rather than part of the React tree, since it's the same
 * for every crawlable page.
 */
function markdownPointer(hostname: string, pathname: string): string {
  if (!isCrawlablePath(pathname)) return '';
  const href = `https://${hostname}${markdownPathFor(pathname)}`;
  return `<div style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;" aria-hidden="true">A Markdown version of this page is available at ${href}.</div>`;
}

/** Whether a host serves only the Russian locale, per localePolicyForHost. */
function isRuOnlyHost(hostname: string): boolean {
  const policy = localePolicyForHost(hostname, configuredDomains());
  return policy?.length === 1 && policy[0] === 'ru';
}

/** The /llms.txt body for the requesting host, omitting /en, /ar, /tr on RU-only domains. */
export function llmsTxt(hostname: string): string {
  return buildLlmsTxt(`https://${hostname}`, { ruOnly: isRuOnlyHost(hostname) });
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

/**
 * Renders the app's root HTML (no head, no Markdown pointer) for a request, shared
 * by both the full HTML page (`render`) and its Markdown mirror (`renderMarkdown`)
 * so route matching and the React tree only exist in one place.
 */
async function renderPage(request: Request, hostname: string) {
  const pathname = new URL(request.url).pathname;
  const config = resolveConfig(hostname, pathname);

  await i18n.changeLanguage(config.locale);

  const routes = createRoutes(config.Landing);
  const handler = createStaticHandler(routes);
  const context = await handler.query(request);

  if (context instanceof Response) return context;

  const status = resolveRenderStatus(context);

  // Unmatched URL or unsupported method: there is no page to build, so skip the
  // render entirely and let the caller answer with the status. Rendering here
  // would burn an SSR pass to produce an error boundary served as 200.
  if (status >= 400) {
    return { html: '', config, pathname, status };
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

  return { html, config, pathname, status };
}

export async function render(request: Request, hostname: string) {
  const result = await renderPage(request, hostname);
  if (result instanceof Response) return result;

  const { html, config, pathname, status } = result;

  const head = [
    `<title>${config.title}</title>`,
    `<meta name="description" content="${config.description}">`,
    `<meta property="og:title" content="${config.title}">`,
    `<meta property="og:description" content="${config.description}">`,
    `<meta property="og:locale" content="${config.ogLocale}">`,
    landingAlternateLinks(config, hostname, pathname),
    markdownAlternateLink(hostname, pathname),
  ]
    .filter(Boolean)
    .join('\n    ');

  if (status >= 400) {
    return { html: '', head, pointer: '', lang: config.lang, dir: getDirection(config.locale), status };
  }

  return {
    html,
    head,
    pointer: markdownPointer(hostname, pathname),
    lang: config.lang,
    dir: getDirection(config.locale),
    status,
  };
}

/**
 * Renders a crawlable path as Markdown, for its `.md` mirror and for
 * Accept: text/markdown negotiation on the plain URL. `request.url`'s pathname
 * must be the Markdown path (e.g. `/index.md`, `/terms.md`) — mapped back to the
 * underlying page path via `markdownPathFor`'s inverse before rendering.
 */
export async function renderMarkdown(request: Request, hostname: string) {
  const url = new URL(request.url);
  const basePath = url.pathname === '/index.md' ? '/' : url.pathname.replace(/\.md$/, '');

  if (!isCrawlablePath(basePath)) {
    return { status: 404 as const };
  }

  const pageRequest = new Request(`${url.origin}${basePath}${url.search}`, {
    method: request.method,
    headers: request.headers,
  });

  const result = await renderPage(pageRequest, hostname);
  if (result instanceof Response) return { status: 404 as const };

  const { html, config, status } = result;
  if (status >= 400) return { status };

  const markdown = `# ${config.title}\n\n${htmlToMarkdown(html)}`;

  return { status: 200 as const, markdown, htmlPath: basePath };
}
