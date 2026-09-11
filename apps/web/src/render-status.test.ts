import { createStaticHandler } from 'react-router';
import { describe, expect, it } from 'vitest';

import { resolveRenderStatus } from './render-status';

/**
 * Exercises real React Router static-handler contexts rather than hand-built
 * fakes, so these pin the router's actual semantics: an unmatched URL and an
 * action-less POST both surface as errors on the context, not as thrown values.
 */
async function contextFor(url: string, init?: RequestInit) {
  const handler = createStaticHandler([
    { path: '/', Component: () => null },
    { path: '/profile', Component: () => null },
  ]);
  const context = await handler.query(new Request(url, init));
  // A Response means a redirect, which the caller short-circuits before ever
  // resolving a status. None of these cases should produce one.
  if (context instanceof Response) {
    throw new Error(`expected a router context for ${url}, got a ${context.status} Response`);
  }
  return context;
}

describe('resolveRenderStatus', () => {
  it('serves a matched route with 200', async () => {
    expect(resolveRenderStatus(await contextFor('http://web.test/'))).toBe(200);
  });

  it('reports 404 for a URL no route matches, so scanners are refused rather than rendered', async () => {
    expect(resolveRenderStatus(await contextFor('http://web.test/wp-admin/js/'))).toBe(404);
  });

  it('reports 404 for a path that only looks like a route', async () => {
    expect(resolveRenderStatus(await contextFor('http://web.test/profilex'))).toBe(404);
  });

  it('reports 405 for a POST to a route with no action, so bots cannot force a render', async () => {
    const context = await contextFor('http://web.test/', { method: 'POST' });
    expect(resolveRenderStatus(context)).toBe(405);
  });

  it('defaults to 200 when the context carries no status', () => {
    expect(resolveRenderStatus({})).toBe(200);
  });
});
