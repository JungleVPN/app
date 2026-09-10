/** URL segment shape for the checkout route: `/payment/plan1`, `/payment/plan12`, … */
const PLAN_SLUG_PATTERN = /^plan(\d+)$/;

/**
 * Parses the `planN` route segment into a subscription length in months.
 * Returns `null` for anything that isn't a positive `planN`; whether that many
 * months is actually on sale is decided against the plans from the API.
 */
export function monthsFromSlug(slug: string | undefined): number | null {
  const match = slug?.match(PLAN_SLUG_PATTERN);
  if (!match) return null;

  const months = Number(match[1]);

  return Number.isInteger(months) && months > 0 ? months : null;
}

export function planSlug(months: number): string {
  return `plan${months}`;
}

/** "1 month" / "6 months" / "1 year" — no i18n on this page yet. */
export function planPeriodLabel(months: number): string {
  if (months === 12) return '1 year';
  if (months % 12 === 0) return `${months / 12} years`;

  return months === 1 ? '1 month' : `${months} months`;
}
