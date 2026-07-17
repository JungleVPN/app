/**
 * User-related types used across the bot.
 * These mirror the Remnawave panel's user model.
 */

export type UserDevice = 'ios' | 'android' | 'macOS' | 'windows';
export type StartPayload = {
  type: 'referral' | 'ad';
  value: string | null;
} | null;
