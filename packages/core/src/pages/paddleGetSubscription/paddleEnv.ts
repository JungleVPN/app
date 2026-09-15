/**
 * Read lazily (only when the Paddle checkout page actually mounts), not from
 * the shared `coreEnv` object — throwing here must never break unrelated pages
 * that happen to import from this package but never touch Paddle.
 */

export function getPaddleClientToken(): string {
  const token = import.meta.env.PUBLIC_PADDLE_CLIENT_TOKEN as string | undefined;
  if (!token) {
    throw new Error('PUBLIC_PADDLE_CLIENT_TOKEN is not configured');
  }
  return token;
}

export function getPaddleEnvironment(): 'sandbox' | 'production' {
  const value = import.meta.env.PUBLIC_PADDLE_ENVIRONMENT as string | undefined;
  if (value !== 'sandbox' && value !== 'production') {
    throw new Error(
      `PUBLIC_PADDLE_ENVIRONMENT must be set to "sandbox" or "production" (got: ${value || 'unset'}). ` +
        'This is never defaulted, so a misconfigured deploy fails loudly instead of silently checking out against the wrong Paddle account.',
    );
  }
  return value;
}
