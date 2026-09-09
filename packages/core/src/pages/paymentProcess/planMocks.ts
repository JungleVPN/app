/**
 * Mock pricing for the `/payment?plan=<months>` page.
 * Replaced by the real plans API once the checkout endpoints land.
 */
export const SUPPORTED_PLAN_MONTHS = [1, 3, 6, 12] as const;

export type PlanMonths = (typeof SUPPORTED_PLAN_MONTHS)[number];

export type PlanMock = {
  months: PlanMonths;
  label: string;
  fullTotal: number;
  total: number;
  discountPercent: number;
};

const PLANS: Record<PlanMonths, PlanMock> = {
  1: {
    months: 1,
    label: 'JungleVPN for 1 month',
    fullTotal: 8.99,
    total: 8.99,
    discountPercent: 0,
  },
  3: {
    months: 3,
    label: 'JungleVPN for 3 months',
    fullTotal: 26.97,
    total: 21.57,
    discountPercent: 20,
  },
  6: {
    months: 6,
    label: 'JungleVPN for 6 months',
    fullTotal: 53.94,
    total: 37.75,
    discountPercent: 30,
  },
  12: {
    months: 12,
    label: 'JungleVPN for 1 year',
    fullTotal: 107.88,
    total: 64.72,
    discountPercent: 40,
  },
};

const DEFAULT_PLAN_MONTHS: PlanMonths = 12;

const isPlanMonths = (value: number): value is PlanMonths =>
  SUPPORTED_PLAN_MONTHS.some((months) => months === value);

/** Resolves the `plan` query param to a plan, falling back to the yearly plan. */
export function resolvePlan(planParam: string | null): PlanMock {
  const months = Number(planParam);

  return PLANS[isPlanMonths(months) ? months : DEFAULT_PLAN_MONTHS];
}

export const formatEur = (amount: number) => `€${amount.toFixed(2)}`;
