import { LandingPage, LocationsPage, PricingPage, ReferralsPage } from '@workspace/core/pages';
import { createBrowserRouter, matchRoutes, type RouteObject } from 'react-router';

import { createRoutes } from './routes';

export const routes = createRoutes(
  LandingPage,
  PricingPage,
  ReferralsPage,
  LocationsPage,
) as RouteObject[];

/**
 * Resolves the `lazy` modules for the routes matching `pathname` and folds them into
 * the route objects.
 *
 * SSR's static handler awaits `route.lazy`, so the server ships a fully rendered page.
 * The client cannot import a lazy module synchronously, so its first render — the one
 * React hydrates against — would be the layout shell with an empty Outlet. Full page
 * versus empty shell is a structural mismatch: hydration fails, the server markup stays
 * in the DOM and a second copy mounts below it (the duplicated /terms, /privacy and
 * /cookies pages). Resolving up front keeps the routes code-split while making the first
 * client render match the server.
 */
export async function preloadMatchedRoutes(pathname: string): Promise<void> {
  const matches = matchRoutes(routes, pathname) ?? [];

  await Promise.all(
    matches.map(async ({ route }) => {
      if (!route.lazy) return;
      const mod = typeof route.lazy === 'function' ? await route.lazy() : await route.lazy;
      Object.assign(route, mod);
      route.lazy = undefined;
    }),
  );
}

export function createAppRouter() {
  return createBrowserRouter(routes);
}
