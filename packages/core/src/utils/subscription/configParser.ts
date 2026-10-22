import type {
  TSubscriptionPageLanguageCode,
  TSubscriptionPageLocalizedText,
} from '@remnawave/subscription-page-types';
import dayjs from 'dayjs';

export function getIconFromLibrary(iconKey: string, svgLibrary: Record<string, string>) {
  return svgLibrary[iconKey];
}

export function getLocalizedText(
  textObj: TSubscriptionPageLocalizedText,
  lang: TSubscriptionPageLanguageCode,
): string {
  if (!textObj) return '';
  return textObj[lang];
}

type TExpiryText = {
  lang: string;
  t: (key: string) => string;
};

const isIndefinite = (date: Date | string) => dayjs(date).year() === 2099;

export function getExpirationText({
  expireAt,
  lang,
  t,
}: TExpiryText & { expireAt: Date | null | string }): string {
  if (!expireAt) return t('subscriptionPage.info.unknown');
  if (isIndefinite(expireAt)) return t('subscriptionPage.info.indefinitely');

  const expiration = dayjs(expireAt).locale(lang);
  const label = expiration.isBefore(dayjs())
    ? t('subscriptionPage.info.expired')
    : t('subscriptionPage.info.expiresIn');

  return `${label} ${expiration.fromNow(false)}`;
}

export function formatExpiryDate({ date, lang, t }: TExpiryText & { date: Date | string }): string {
  if (isIndefinite(date)) return t('subscriptionPage.info.indefinitely');
  return dayjs(date).locale(lang).format('DD MMMM, YYYY');
}

export const calculateDaysLeft = (expireAt: string | Date): number => {
  const now = dayjs();
  const expirationDate = dayjs(expireAt);
  const diffInDays = expirationDate.diff(now, 'day');

  return diffInDays > 0 ? diffInDays : 0;
};
