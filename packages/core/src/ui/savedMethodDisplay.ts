import type { SavedMethodDto } from '@workspace/types';

export function formatSavedMethodLabel(method: SavedMethodDto): string {
  if (method.card?.last4) {
    const expiry =
      method.card.expiryMonth && method.card.expiryYear
        ? ` · ${method.card.expiryMonth}/${method.card.expiryYear.slice(-2)}`
        : '';
    return `•••• ${method.card.last4}${expiry}`;
  }
  return method.title ?? method.paymentMethodType;
}
