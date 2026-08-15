/**
 * Prefixes/suffixes an already-formatted plan price amount with its currency symbol.
 * RUB conventionally trails the amount ("200₽"), EUR leads it ("€6.00").
 */
export function formatPlanPrice(amount: string, isRu: boolean): string {
  return isRu ? `${amount}₽` : `€${amount}`;
}
