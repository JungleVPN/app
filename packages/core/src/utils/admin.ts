import { coreEnv } from '../env';
import type { AuthUser } from '../stores';
import type { User } from '../types/tma';

/**
 * Returns true when the current user is listed in the ADMINS env variable.
 * Checks by Telegram id (TMA) or by email (web).
 */
export function isAdminUser(tgUser: User | null, authUser: AuthUser | null): boolean {
  if (tgUser?.id != null && coreEnv.admins.has(String(tgUser.id))) return true;
  return !!(authUser?.email && coreEnv.admins.has(authUser.email));
}

/**
 * Returns the identifier to forward as the X-Admin-Id header.
 * Prefers Telegram id; falls back to email for web-auth admins.
 * Returns null when no identity is available.
 */
export function getAdminId(tgUser: User | null, authUser: AuthUser | null): string | null {
  if (tgUser?.id != null) return String(tgUser.id);
  if (authUser?.email) return authUser.email;
  return null;
}
