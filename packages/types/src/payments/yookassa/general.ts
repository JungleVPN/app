/**
 * YooKassa — general primitives shared by every resource type.
 *
 * Mirrored from `@webzaytsev/yookassa-ts-sdk` (MIT, WEBzaytsev)
 * so we can use canonical YooKassa types without taking a runtime dependency.
 */

/**
 * Supported locales for YooKassa interface
 * @see https://yookassa.ru/developers/api#create_payment_confirmation_locale
 */
export enum LocaleEnum {
  /** Russian */
  ru_RU = 'ru_RU',
  /** English */
  en_US = 'en_US',
}

/**
 * Supported currencies in ISO-4217 format.
 * @see https://yookassa.ru/developers/api#payment_object_amount_currency
 */
export enum CurrencyEnum {
  /** Российский рубль */
  RUB = 'RUB',
  /** Евро */
  EUR = 'EUR',
  /** Доллар США */
  USD = 'USD',
  /** Казахстанский тенге */
  KZT = 'KZT',
  /** Белорусский рубль */
  BYN = 'BYN',
  /** Украинская гривна */
  UAH = 'UAH',
  /** Узбекский сум */
  UZS = 'UZS',
}

/**
 * Arbitrary key-value metadata returned by YooKassa on payment objects.
 * All values are strings (YooKassa constraint: max 512 chars per value).
 * @see https://yookassa.ru/developers/api#payment_object_metadata
 */
export type Metadata = Record<string, string | undefined>;

/**
 * Сумма платежа. Иногда партнеры ЮKassa берут с пользователя дополнительную комиссию, которая не входит в эту сумму.
 */
export interface IAmount {
  /**
   * Сумма в выбранной валюте.
   *
   * Всегда дробное значение. Разделитель дробной части — точка, разделитель тысяч отсутствует. Количество знаков после точки зависит от выбранной валюты. Пример: `1000.00`.
   */
  value: string;
  /** Трехбуквенный код валюты в формате ISO-4217. Пример: `RUB`. Должен соответствовать валюте субаккаунта (recipient.gateway_id), если вы разделяете потоки платежей, и валюте аккаунта (shopId в личном кабинете), если не разделяете. */
  currency: CurrencyEnum | string;
}
