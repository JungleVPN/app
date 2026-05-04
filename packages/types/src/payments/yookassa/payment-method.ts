import type { IAmount } from './general';

/** Способы оплаты */
export type IPaymentMethod =
  | IPaymentMethodAlfabank
  | IPaymentMethodMobileBalance
  | IPaymentMethodCard
  | IPaymentMethodInstallments
  | IPaymentMethodCash
  | IPaymentMethodSbp
  | IPaymentMethodB2b_sberbank
  | IPaymentMethodTinkoff_bank
  | IPaymentMethodYooMoney
  | IPaymentMethodQiwi
  | IPaymentMethodSberbank
  | IPaymentMethodSberLoan
  | IPaymentMethodSberBnpl
  | IPaymentMethodApplePay
  | IPaymentMethodGooglePay
  | IPaymentMethodWebmoney
  | IPaymentMethodWechat;

export enum PaymentMethodsEnum {
  /** Банковская карта или карта МИР */
  bank_card = 'bank_card',

  /** ЮMoney */
  yoo_money = 'yoo_money',

  /**
   * QIWI Кошелек
   * @deprecated QIWI Банк лишён лицензии ЦБ РФ 21.02.2024. Способ оплаты не работает.
   */
  qiwi = 'qiwi',

  /** SberPay */
  sberbank = 'sberbank',

  /**
   * Альфа-Клик
   * @deprecated Сервис устарел. Рекомендуется использовать другие способы оплаты.
   */
  alfabank = 'alfabank',

  /** Тинькофф (T-Pay) */
  tinkoff_bank = 'tinkoff_bank',

  /** СберБанк Бизнес Онлайн */
  b2b_sberbank = 'b2b_sberbank',

  /** СБП (Система быстрых платежей) */
  sbp = 'sbp',

  /** Баланс телефона */
  mobile_balance = 'mobile_balance',

  /** Наличные */
  cash = 'cash',

  /** Заплатить по частям */
  installments = 'installments',

  /** "Покупки в кредит" от Сбербанка" */
  sber_loan = 'sber_loan',

  /** Плати частями (BNPL от СберБанка) */
  sber_bnpl = 'sber_bnpl',

  /** Apple Pay (обычно используется через payment_token) */
  apple_pay = 'apple_pay',

  /** Google Pay (обычно используется через payment_token) */
  google_pay = 'google_pay',

  /**
   * WebMoney
   * @deprecated WebMoney прекратил работу в РФ в 2022 году.
   */
  webmoney = 'webmoney',

  /**
   * WeChat Pay
   * @deprecated Специфичный способ оплаты для китайских пользователей.
   */
  wechat = 'wechat',
}

/**
 * Способы оплаты, поддерживающие автоплатежи (сохранение для повторных списаний).
 *
 * @see https://yookassa.ru/docs/support/payments/extra/autopayment
 * @see https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/save-payment-method/save-during-payment
 */
export type RecurringPaymentMethodType =
  | PaymentMethodsEnum.bank_card
  | PaymentMethodsEnum.yoo_money
  | PaymentMethodsEnum.sberbank
  | PaymentMethodsEnum.tinkoff_bank
  | PaymentMethodsEnum.sbp;

/**
 * Способы оплаты, поддерживающие безусловное сохранение (save_payment_method: true).
 * Пользователь не может отказаться от сохранения способа оплаты.
 *
 * @see https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/save-payment-method/save-during-payment#save-mandatory
 */
export type MandatorySavePaymentMethodType =
  | PaymentMethodsEnum.bank_card
  | PaymentMethodsEnum.yoo_money
  | PaymentMethodsEnum.sberbank
  | PaymentMethodsEnum.tinkoff_bank
  | PaymentMethodsEnum.sbp;

/**
 * Способы оплаты, поддерживающие условное сохранение.
 * Пользователь сам решает, сохранять ли способ оплаты.
 *
 * @see https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/save-payment-method/save-during-payment#save-optional
 */
export type OptionalSavePaymentMethodType =
  | PaymentMethodsEnum.bank_card
  | PaymentMethodsEnum.yoo_money;

/**
 * Тип банковской карты
 * @see https://yookassa.ru/developers/api#payment_object_payment_method_card_card_type
 */
export enum BankCardTypeEnum {
  MasterCard = 'MasterCard',
  Visa = 'Visa',
  Mir = 'Mir',
  UnionPay = 'UnionPay',
  JCB = 'JCB',
  AmericanExpress = 'AmericanExpress',
  DinersClub = 'DinersClub',
  DiscoverCard = 'DiscoverCard',
  InstaPayment = 'InstaPayment',
  InstaPaymentTM = 'InstaPaymentTM',
  Laser = 'Laser',
  Dankort = 'Dankort',
  Solo = 'Solo',
  Switch = 'Switch',
  Unknown = 'Unknown',
}

/**
 * Источник данных банковской карты (если использовался Pay-сервис)
 * @see https://yookassa.ru/developers/api#payment_object_payment_method_card_source
 */
export enum BankCardSourceEnum {
  /** Apple Pay */
  apple_pay = 'apple_pay',

  /** Google Pay */
  google_pay = 'google_pay',

  /** Mir Pay */
  mir_pay = 'mir_pay',
}

/**
 * Данные банковской карты в ответе API
 * @see https://yookassa.ru/developers/api#payment_object_payment_method_card
 */
export interface IBankCardData {
  /** Первые 6 цифр номера карты (BIN) */
  first6?: string;

  /** Последние 4 цифры номера карты */
  last4: string;

  /** Срок действия, год (YYYY) */
  expiry_year: string;

  /** Срок действия, месяц (MM) */
  expiry_month: string;

  /** Тип банковской карты */
  card_type: BankCardTypeEnum | string;

  /** Продукт банковской карты */
  card_product?: {
    /** Код продукта карты */
    code: string;
    /** Название продукта карты */
    name?: string;
  };

  /** Код страны банка-эмитента (ISO 3166-1 alpha-2) */
  issuer_country?: string;

  /** Название банка-эмитента */
  issuer_name?: string;

  /** Источник данных карты (если использовался Pay-сервис) */
  source?: BankCardSourceEnum | string;
}

/**
 * Поля, общие для большинства способов оплаты (все, что могут быть сохранены).
 *
 * NOTE: exported (in contrast to the upstream SDK, where it's private) so
 * call sites can narrow the `IPaymentMethod` discriminated union to the
 * "savable" shape when they only care about the generic fields.
 */
export interface IGeneralPayMethod {
  type: PaymentMethodsEnum;
  /** Идентификатор способа оплаты. */
  id: string;
  /** С помощью сохраненного способа оплаты можно проводить [безакцептные списания](https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments) */
  saved: boolean;
  /** Название способа оплаты. */
  title?: string;
}

/**
 * Type guard — true when `pm` is a bank-card payment method (exposes `.card` details).
 * Use to narrow `IPaymentMethod` before reading `card.last4`, `expiry_*`, etc.
 */
export function isBankCardPaymentMethod(pm: IPaymentMethod): pm is IPaymentMethodCard {
  return pm.type === PaymentMethodsEnum.bank_card;
}

/**
 * Type guard — true when `pm` is one of the savable/recurring-capable methods
 * (card, yoo_money, sberbank, tinkoff_bank, sbp). These all extend
 * `IGeneralPayMethod`, so `id`, `saved`, `title` can be safely accessed.
 */
export function isSavablePaymentMethod(
  pm: IPaymentMethod,
): pm is IPaymentMethod & IGeneralPayMethod {
  return (
    pm.type === PaymentMethodsEnum.bank_card ||
    pm.type === PaymentMethodsEnum.yoo_money ||
    pm.type === PaymentMethodsEnum.sberbank ||
    pm.type === PaymentMethodsEnum.tinkoff_bank ||
    pm.type === PaymentMethodsEnum.sbp
  );
}

/**
 * Банковская карта (ответ API)
 * @see https://yookassa.ru/developers/api#payment_object_payment_method_bank_card
 */
export interface IPaymentMethodCard extends IGeneralPayMethod {
  /** Код способа оплаты */
  type: PaymentMethodsEnum.bank_card;
  /** Данные банковской карты */
  card?: IBankCardData;
}

/** Баланс телефона */
export interface IPaymentMethodMobileBalance extends IGeneralPayMethod {
  /** Код способа оплаты. */
  type: PaymentMethodsEnum.mobile_balance;
  /** Телефон, с баланса которого осуществляется платеж. Указывается в формате ITU-T E.164, например 79000000000. */
  phone: string;
}

/**
 * ЮMoney
 * @see https://yookassa.ru/developers/payment-acceptance/getting-started/payment-methods#yoomoney
 */
export interface IPaymentMethodYooMoney extends IGeneralPayMethod {
  type: PaymentMethodsEnum.yoo_money;
  /** Номер кошелька ЮMoney, из которого была произведена оплата. */
  account_number?: string;
}

/**
 * QIWI Кошелек
 * @deprecated QIWI Банк лишён лицензии ЦБ РФ 21.02.2024. Способ оплаты не работает.
 */
export interface IPaymentMethodQiwi {
  type: PaymentMethodsEnum.qiwi;
  /** Телефон, на который зарегистрирован аккаунт в QIWI. Указывается в формате ITU-T E.164, например 79000000000. */
  phone?: string;
}

/**
 * SberPay
 * @see https://yookassa.ru/developers/payment-acceptance/getting-started/payment-methods#sberpay
 */
export interface IPaymentMethodSberbank extends IGeneralPayMethod {
  type: PaymentMethodsEnum.sberbank;
  /** Телефон пользователя, на который зарегистрирован аккаунт в SberPay. Необходим для подтверждения оплаты по смс (сценарий подтверждения external). Указывается в формате ITU-T E.164, например 79000000000. */
  phone?: string;
}

/**
 * Альфа-Клик
 * @deprecated Сервис устарел. Рекомендуется использовать другие способы оплаты.
 */
export interface IPaymentMethodAlfabank {
  type: PaymentMethodsEnum.alfabank;
  /** Логин пользователя в Альфа-Клике (привязанный телефон или дополнительный логин). Обязателен для сценария External. */
  login?: string;
}

/**
 * T-Pay (Тинькофф)
 * @see https://yookassa.ru/developers/payment-acceptance/getting-started/payment-methods#tinkoff-bank
 */
export interface IPaymentMethodTinkoff_bank extends IGeneralPayMethod {
  type: PaymentMethodsEnum.tinkoff_bank;
}

/** СберБанк Бизнес Онлайн */
export interface IPaymentMethodB2b_sberbank {
  type: PaymentMethodsEnum.b2b_sberbank;
  /** Назначение платежа (не больше 210 символов). */
  payment_purpose: string;
  /** Данные о налоге на добавленную стоимость (НДС). Платеж может облагаться или не облагаться НДС. Товары могут облагаться по одной ставке НДС или по разным. */
  vat_data: {
    /** Код способа расчета НДС. */
    type: 'mixed' | 'calculated' | 'untaxed';
    /** Сумма НДС. */
    amount?: IAmount;
  };
}

/**
 * СБП (Система быстрых платежей)
 * @see https://yookassa.ru/developers/payment-acceptance/getting-started/payment-methods#sbp
 */
export interface IPaymentMethodSbp extends IGeneralPayMethod {
  type: PaymentMethodsEnum.sbp;
  /** Идентификатор операции в СБП (НСПК). Обязателен для платежей в статусе succeeded. */
  sbp_operation_id?: string;
  /** Данные о банке плательщика */
  payer_bank_details?: {
    /** Идентификатор банка или платёжного сервиса в СБП */
    bank_id: string;
    /** БИК банка */
    bic: string;
    /** Название банка */
    name: string;
  };
}

/** Наличные */
export interface IPaymentMethodCash {
  type: PaymentMethodsEnum.cash;
  /** Телефон пользователя, на который придет смс с кодом платежа (для внесения наличных). Указывается в формате ITU-T E.164, например 79000000000. Поле можно оставить пустым: пользователь сможет заполнить его при оплате на стороне ЮKassa. */
  phone?: string;
}

/** Заплатить по частям */
export interface IPaymentMethodInstallments {
  type: PaymentMethodsEnum.installments;
}

/** "Покупки в кредит" от Сбербанка" */
export interface IPaymentMethodSberLoan extends IGeneralPayMethod {
  type: PaymentMethodsEnum.sber_loan;
  /** Сумма скидки для рассрочки. Присутствует для платежей в статусе `waiting_for_capture` и `succeeded`, если пользователь выбрал рассрочку. */
  discount_amount?: IAmount;
  /**
   * Тариф кредита, который пользователь выбрал при оплате.
   *
   * Возможные значения:
   * - `loan` — кредит;
   * - `installments_XX` — рассрочка, где `XX` — количество месяцев для выплаты рассрочки. Например, `installments_3` — рассрочка на 3 месяца.
   * Присутствует для платежей в статусе `waiting_for_capture` и `succeeded`.
   */
  loan_option?: 'loan' | `installments_${number}`;
}

/** Плати частями (BNPL от СберБанка) */
export interface IPaymentMethodSberBnpl {
  type: PaymentMethodsEnum.sber_bnpl;
  /** Идентификатор способа оплаты */
  id: string;
  /** С помощью сохраненного способа оплаты можно проводить безакцептные списания */
  saved: boolean;
  /** Статус способа оплаты */
  status?: 'inactive' | 'active';
}

/** Apple Pay (обычно используется через payment_token) */
export interface IPaymentMethodApplePay extends IGeneralPayMethod {
  type: PaymentMethodsEnum.apple_pay;
}

/** Google Pay (обычно используется через payment_token) */
export interface IPaymentMethodGooglePay extends IGeneralPayMethod {
  type: PaymentMethodsEnum.google_pay;
}

/**
 * WebMoney
 * @deprecated WebMoney прекратил работу в РФ в 2022 году.
 */
export interface IPaymentMethodWebmoney extends IGeneralPayMethod {
  type: PaymentMethodsEnum.webmoney;
}

/**
 * WeChat Pay
 * @deprecated Специфичный способ оплаты для китайских пользователей.
 */
export interface IPaymentMethodWechat extends IGeneralPayMethod {
  type: PaymentMethodsEnum.wechat;
}

// ========== PaymentMethodData (для создания платежа) ========== //

/** Данные банковской карты для создания платежа */
export interface PaymentMethodDataCard {
  type: 'bank_card';
  /** Данные банковской карты */
  card?: {
    /** Номер банковской карты */
    number?: string;
    /** Срок действия, год, YYYY */
    expiry_year?: string;
    /** Срок действия, месяц, MM */
    expiry_month?: string;
    /** Код CVC2 или CVV2 */
    csc?: string;
    /** Имя владельца карты */
    cardholder?: string;
  };
}

/** Данные для оплаты через ЮMoney */
export interface PaymentMethodDataYooMoney {
  type: 'yoo_money';
}

/**
 * Данные для оплаты через QIWI Кошелек
 * @deprecated QIWI Банк лишён лицензии ЦБ РФ 21.02.2024. Способ оплаты не работает.
 */
export interface PaymentMethodDataQiwi {
  type: 'qiwi';
  /** Телефон, на который зарегистрирован аккаунт в QIWI */
  phone?: string;
}

/** Данные для оплаты через SberPay */
export interface PaymentMethodDataSberbank {
  type: 'sberbank';
  /** Телефон пользователя для подтверждения по смс */
  phone?: string;
}

/**
 * Данные для оплаты через Альфа-Клик
 * @deprecated Сервис устарел. Используйте другие способы оплаты.
 */
export interface PaymentMethodDataAlfabank {
  type: 'alfabank';
  /** Логин пользователя в Альфа-Клике */
  login?: string;
}

/** Данные для оплаты через Тинькофф (T-Pay) */
export interface PaymentMethodDataTinkoff {
  type: 'tinkoff_bank';
}

/** Данные для оплаты через СберБанк Бизнес Онлайн */
export interface PaymentMethodDataB2bSberbank {
  type: 'b2b_sberbank';
  /** Назначение платежа (не больше 210 символов) */
  payment_purpose: string;
  /** Данные о НДС */
  vat_data: {
    type: 'mixed' | 'calculated' | 'untaxed';
    amount?: IAmount;
  };
}

/** Данные для оплаты через СБП */
export interface PaymentMethodDataSbp {
  type: 'sbp';
}

/** Данные для оплаты с баланса телефона */
export interface PaymentMethodDataMobileBalance {
  type: 'mobile_balance';
  /** Телефон, с баланса которого осуществляется платеж */
  phone?: string;
}

/** Данные для оплаты наличными */
export interface PaymentMethodDataCash {
  type: 'cash';
  /** Телефон для получения кода платежа */
  phone?: string;
}

/** Данные для оплаты в рассрочку */
export interface PaymentMethodDataInstallments {
  type: 'installments';
}

/** Данные для оплаты через "Покупки в кредит" от Сбербанка */
export interface PaymentMethodDataSberLoan {
  type: 'sber_loan';
}

/**
 * Данные для оплаты через "Плати частями" (BNPL от СберБанка)
 * @see https://yookassa.ru/developers/payment-acceptance/integration-scenarios/manual-integration/other/sber-bnpl
 */
export interface PaymentMethodDataSberBnpl {
  type: 'sber_bnpl';
  /** Телефон пользователя для авторизации в сервисе (опционально, можно ввести на странице YooKassa) */
  phone?: string;
}

/**
 * Данные для оплаты конкретным способом.
 * Передаётся в `payment_method_data` при создании платежа.
 * @see https://yookassa.ru/developers/api#create_payment
 */
export type PaymentMethodData =
  | PaymentMethodDataCard
  | PaymentMethodDataYooMoney
  | PaymentMethodDataQiwi
  | PaymentMethodDataSberbank
  | PaymentMethodDataAlfabank
  | PaymentMethodDataTinkoff
  | PaymentMethodDataB2bSberbank
  | PaymentMethodDataSbp
  | PaymentMethodDataMobileBalance
  | PaymentMethodDataCash
  | PaymentMethodDataInstallments
  | PaymentMethodDataSberLoan
  | PaymentMethodDataSberBnpl;
