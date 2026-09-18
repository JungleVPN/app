import type { SavedPaymentMethod } from '@workspace/database';
import type { SavedMethodDto } from '@workspace/types';

/**
 * Entity → wire DTO.
 *
 * The entity's `createdAt`/`updatedAt` are `Date`s that JSON serialization
 * would silently turn into strings anyway; converting them here makes the
 * shape the client actually receives the one the types promise.
 */
export function toSavedMethodDto(method: SavedPaymentMethod): SavedMethodDto {
  return {
    id: method.id,
    userId: method.userId,
    provider: method.provider,
    paymentMethodId: method.paymentMethodId,
    paymentMethodType: method.paymentMethodType,
    title: method.title,
    card: method.card,
    isActive: method.isActive,
    createdAt: method.createdAt?.toISOString() ?? new Date(0).toISOString(),
    updatedAt: method.updatedAt?.toISOString() ?? new Date(0).toISOString(),
  };
}
