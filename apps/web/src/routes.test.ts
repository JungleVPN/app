import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { createRoutes } from './routes';

const Landing = () => null;
const Pricing = () => null;
const Referrals = () => null;
const Locations = () => null;
const WhatIsVpn = () => null;
const MyIp = () => null;

function pageAt(pathname: string) {
  const routes = createRoutes(Landing, Pricing, Referrals, Locations, WhatIsVpn, MyIp);
  return matchRoutes(routes, pathname)?.at(-1)?.route.Component;
}

describe('createRoutes', () => {
  it.each([
    ['/ar/pricing', Pricing],
    ['/tr/locations', Locations],
    ['/es/what-is-vpn', WhatIsVpn],
    ['/en/my-ip', MyIp],
    ['/hi/referrals', Referrals],
  ])('serves the marketing page %s under its language prefix', (pathname, Page) => {
    expect(pageAt(pathname)).toBe(Page);
  });

  it('still serves the unprefixed marketing pages and language landings', () => {
    expect(pageAt('/pricing')).toBe(Pricing);
    expect(pageAt('/ar')).toBe(Landing);
  });

  it('does not prefix app pages', () => {
    expect(pageAt('/ar/login')).toBeUndefined();
  });
});
