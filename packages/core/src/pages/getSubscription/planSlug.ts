/** URL segment shape for the checkout route: `/payment/plan1`, `/payment/plan12`, … */
const PLAN_SLUG_PATTERN = /^plan(\d+)$/;

/**
 * Parses the `planN` route segment into a subscription length in months.
 * Returns `null` for anything that isn't a positive `planN`; whether that many
 * months is actually on sale is decided against the plans from the API.
 */
export function daysFromSlug(slug: string | undefined): number | null {
  const match = slug?.match(PLAN_SLUG_PATTERN);
  if (!match) return null;

  const days = Number(match[1]);

  return Number.isInteger(days) && days > 0 ? days : null;
}

export function planSlug(months: number): string {
  return `plan${months}`;
}
