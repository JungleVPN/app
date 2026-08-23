/**
 * User-related types used across the bot.
 * These mirror the Remnawave panel's user model.
 */

export type UserDevice = 'ios' | 'android' | 'macOS' | 'windows';
export type StartPayload =
  | {
      type: 'referral';
      /** Remnawave numeric userId of the inviter; null when the code is invalid. */
      value: number | null;
    }
  | {
      type: 'ad';
      value: string | null;
    }
  | null;
