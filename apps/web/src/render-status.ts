/** The subset of React Router's static-handler context that decides the HTTP status. */
type RenderContext = {
  statusCode?: number;
};

/**
 * The HTTP status a static-handler context should be served with.
 *
 * React Router reports an unmatched URL as a 404 *inside* the context rather
 * than by throwing, so a caller that ignores this renders the error boundary
 * and answers 200 — telling webhook providers a dropped delivery succeeded, and
 * telling scanners that a probed path exists.
 */
export function resolveRenderStatus(context: RenderContext): number {
  return context.statusCode ?? 200;
}
