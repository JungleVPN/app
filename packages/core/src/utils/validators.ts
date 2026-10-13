/**
 * A domain's last label is a name — letters, or `xn--` for an internationalised
 * one — never digits, so `name@gmail.com2` is a typo this must refuse before
 * a payment provider does.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.(?:[\p{L}\p{M}]{2,}|xn--[a-z0-9-]+)$/iu;

export const validateEmail = (value: string) => EMAIL_PATTERN.test(value);
