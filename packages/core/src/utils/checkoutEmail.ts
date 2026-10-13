import { createStorage } from './storage';

const storage = createStorage('checkout');
const EMAIL_KEY = 'email';

/** The email a visitor submitted on the checkout's first step, kept so reloading a later step still has it. */
export const getCheckoutEmail = (): string => storage.get<string>(EMAIL_KEY, '');

/** Replaces any email stored before. */
export const saveCheckoutEmail = (email: string): void => storage.set(EMAIL_KEY, email);

/** Dropped once the payment has succeeded, and not before. */
export const clearCheckoutEmail = (): void => storage.remove(EMAIL_KEY);
