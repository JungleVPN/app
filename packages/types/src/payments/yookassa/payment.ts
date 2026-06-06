import type { IConfirmation } from './confirmation';
import type { IAmount, Metadata } from './general';
import type { IPaymentMethod, PaymentMethodData } from './payment-method';
import type { PaymentPurpose } from './session';

// NOTE: The upstream SDK's Payments namespace also references Receipts, Receiver,
// IAirline and DealType. We don't use any of those fields today, so they are
// intentionally omitted from this mirror to avoid pulling the full SDK surface
// (receipt/refund/customer/shop/dictionary trees) into @workspace/types.
// If any of those fields is needed later, add the corresponding sub-module
// under ./yookassa/ following the same mirroring convention.

/** Все, что касается платежей в ЮКассе */
export namespace Payments {
  /**
   * ***Статусы платежа:***
   *
   * - `pending` — платеж создан и ожидает действий от пользователя. Если вы используете стороннюю онлайн-кассу для работы по 54-ФЗ и сценарий Сначала чек, потом платеж, то платеж может находиться в статусе pending до тех пор, пока онлайн-касса не сообщит об успешной или неуспешной регистрации чека. Из статуса pending платеж может перейти в succeeded, waiting_for_capture (при двухстадийной оплате) или canceled (если что-то пошло не так).
   * - `waiting_for_capture` — платеж оплачен, деньги авторизованы и ожидают списания. Из этого статуса платеж может перейти в succeeded (если вы списали оплату) или canceled (если вы отменили платеж или что-то пошло не так).
   * - `succeeded` — платеж успешно завершен, деньги будут перечислены на ваш расчетный счет в соответствии с вашим договором с ЮKassa. Это финальный и неизменяемый статус.
   * - `canceled` — платеж отменен. Вы увидите этот статус, если вы отменили платеж самостоятельно, истекло время на принятие платежа или платеж был отклонен ЮKassa или платежным провайдером. Это финальный и неизменяемый статус.
   * - `autopayment_exhausted` — платеж не может быть проведен по причине исчерпания лимита попыток автоматического списания. Этот статус может возникать в сценариях с автоплатежами, когда система ЮKassa несколько раз пыталась провести платеж, но все попытки были неуспешными (например, из-за недостатка средств на карте пользователя). В этом случае платежу присваивается статус `autopayment_exhausted`, и он не будет обрабатываться дальше. Пользователь должен будет вручную подтвердить платеж или предоставить другой способ оплаты.
   * - `no_active_method` - нет активного способа оплаты
   *
   * В зависимости от вашего процесса часть статусов может быть пропущена, но их последовательность не меняется.
   *
   * Чтобы узнать статус платежа, периодически отправляйте запросы, чтобы получить информацию о платеже, или подождите, когда придет уведомление от ЮKassa.
   * @see https://yookassa.ru/developers/payment-acceptance/getting-started/payment-process#lifecycle
   */
  export type PaymentStatus =
    | 'waiting_for_capture'
    | 'succeeded'
    | 'canceled'
    | 'pending'
    | 'autopayment_exhausted'
    | 'no_active_method';

  /**
   * Данные об авторизации платежа при оплате банковской картой.
   * Присутствуют только для этих способов оплаты:
   * - банковская карта
   * - Mir Pay
   * - SberPay
   * - T-Pay.
   */
  export type AuthorizationDetails = {
    /** Retrieval Reference Number — уникальный идентификатор транзакции в системе эмитента. Пример: `603668680243` */
    rrn?: string;
    /** Код авторизации. Выдается эмитентом и подтверждает проведение авторизации. Пример: `062467` */
    auth_code?: string;
    /** Данные о прохождении пользователем аутентификации по 3‑D Secure для подтверждения платежа. */
    three_d_secure: {
      /**
       * Отображение пользователю формы для прохождения аутентификации по 3‑D Secure. Возможные значения:
       * - `true` — ЮKassa отобразила пользователю форму, чтобы он мог пройти аутентификацию по 3‑D Secure;
       * - `false` — платеж проходил без аутентификации по 3‑D Secure.
       */
      applied: boolean;
    };
  };

  interface PaymentResultEventPayload {
    userId: string;
    provider: 'stripe' | 'yookassa';
    invoiceUrl?: string;
    selectedPeriod?: number;
    purpose?: PaymentPurpose;
  }

  export interface PaymentSucceededEventPayload extends PaymentResultEventPayload {}

  export interface PaymentFailedEventPayload extends PaymentResultEventPayload {
    reason: string;
  }

  export interface PaymentMethodSavedEventPayload {
    telegramId: number | null;
    provider: 'stripe' | 'yookassa';
    paymentMethodType: string;
  }

  /** Получатель платежа. */
  export interface IRecipient {
    /** Идентификатор магазина в ЮKassa. */
    account_id: string;
    /** Идентификатор субаккаунта. Используется для разделения потоков платежей в рамках одного аккаунта. */
    gateway_id: string;
  }

  /**
   * Причина отмены платежа.
   *
   * - 3d_secure_failed -	3-D Secure authentication failed. The buyer should repeat the payment, contact their bank for details, or use another payment method
   * - call_issuer - Payment made with this payment method was declined for unknown reasons. The buyer should contact the organization that provides the payment method
   * - canceled_by_merchant	Payment canceled via API during a two-stage payment
   * - card_expired	The bank card has expired. The buyer should use a different payment method when making a new attempt to pay
   * - country_forbidden	Payments with a bank card issued in this country are not allowed. The buyer should use a different payment method when making a new attempt to pay.
   * You can set up the limits for payments made via bank card issued by foreign banks
   * - deal_expired	For those who use Safe deal: deal's validity period is over. If you still want to receive the payment, create a new deal and process a new payment for it
   * - expired_on_capture	A two-stage payment’s term for debiting the money has expired. If you still want to accept the payment, repeat the payment using a new idempotency key and debit the money after the payment is confirmed by the user
   * - expired_on_confirmation	Payment term has expired: the user hasn’t confirmed the payment within the time frame designated for payment using the selected method. If the user still wants to pay, you’ll need to repeat the payment using a new idempotency key, and the user needs to confirm it
   * - fraud_suspected	The payment was blocked due to suspected fraud. The buyer should use a different payment method when making a new attempt to pay
   * - general_decline	No detailed reason provided. The buyer should contact the initiator of the payment cancellation for more details
   * - identification_required	Exceeded payment limit on the YooMoney wallet. The buyer should complete the identification process or select another payment method
   * - insufficient_funds	Not enough money to make the payment. The buyer should add money to the account balance or select another payment method
   * - internal_timeout	Technical difficulties on YooMoney’s side: couldn’t process the request within 30 seconds. Repeat the payment using a new idempotency key
   * - invalid_card_number	Invalid card number. The buyer should repeat the payment and enter the correct card details
   * - invalid_csc	The CVV2 code (CVC2, CID) was entered incorrectly. The buyer should repeat the payment and enter the correct card details
   * - issuer_unavailable	The organization that provides the payment method is not available. The buyer should repeat the payment later or select another payment method
   * - payment_method_limit_exceeded	Payment limit for this payment method or your store has been reached. The buyer should repeat the payment on the following day or select another payment method
   * - payment_method_restricted	Transactions made with this payment method are forbidden (for example, the card is blocked due to loss or the wallet is blocked due to hacking). The buyer should contact the organization that provides the payment method
   * - permission_revoked	Нельзя провести безакцептное списание: пользователь отозвал разрешение на автоплатежи. If the user wants to make another payment, you will need to create it, and the user will have to confirm it.
   * - unsupported_mobile_operator	Payment can't be made from a number provided by this mobile carrier. The buyer should use a different payment method when making a new attempt to pay. List of supported carriers
   *
   * NOTE: The upstream SDK uses a typed union derived from `paymentCancelReasonMap`.
   * We keep it as `string` here to avoid mirroring the dictionary table.
   * @see https://yookassa.ru/developers/payment-acceptance/after-the-payment/declined-payments#cancellation-details-reason
   */
  export type CancelReason =
    | '3d_secure_failed'
    | 'call_issuer'
    | 'canceled_by_merchant'
    | 'card_expired'
    | 'country_forbidden'
    | 'deal_expired'
    | 'expired_on_capture'
    | 'expired_on_confirmation'
    | 'fraud_suspected'
    | 'general_decline'
    | 'identification_required'
    | 'insufficient_funds'
    | 'internal_timeout'
    | 'invalid_card_number'
    | 'invalid_csc'
    | 'issuer_unavailable'
    | 'payment_method_limit_exceeded'
    | 'payment_method_restricted'
    | 'permission_revoked'
    | 'unsupported_mobile_operator';

  /**
   * Комментарий к статусу `canceled`: кто отменил платеж и по какой причине.
   *
   * [Подробнее про неуспешные платежи](https://yookassa.ru/developers/payment-acceptance/after-the-payment/declined-payments)
   */
  export interface PaymentCancellationDetails {
    /**
     * Участник процесса платежа, который принял решение об отмене транзакции. Может принимать значения `yoo_money`, `payment_network` и `merchant`.
     *
     * [Подробнее](https://yookassa.ru/developers/payment-acceptance/after-the-payment/declined-payments#cancellation-details-party) про инициаторов отмены платежа
     */
    party: 'merchant' | 'yoo_money' | 'payment_network';
    /**
     * Причина отмены платежа.
     *
     * [Перечень и описание возможных значений](https://yookassa.ru/developers/payment-acceptance/after-the-payment/declined-payments#cancellation-details-reason)
     */
    reason: CancelReason;
  }

  /**
   * ***Объект платежа***
   *
   * Объект платежа (`Payment`) содержит всю информацию о платеже, актуальную на текущий момент времени.
   * Он формируется при создании платежа и приходит в ответ на любой запрос, связанный с платежами.
   * Объект может содержать параметры и значения, не описанные в Справочнике API. Их следует игнорировать.
   */
  export interface IPayment {
    /** Идентификатор платежа в ЮKassa. */
    readonly id: string;
    /** Статус платежа. Возможные значения: `pending`, `waiting_for_capture`, `succeeded` и `canceled`. */
    readonly status: PaymentStatus;
    /** Сумма платежа. Иногда партнеры ЮKassa берут с пользователя дополнительную комиссию, которая не входит в эту сумму. */
    amount: IAmount;
    /**
     * Сумма платежа, которую получит магазин, — значение amount за вычетом комиссии ЮKassa.
     * Если вы партнер и для аутентификации запросов используете OAuth-токен, запросите у магазина право на получение информации о комиссиях при платежах.
     */
    readonly income_amount?: IAmount;
    /**
     * Описание транзакции (не более 128 символов), которое вы увидите в личном кабинете ЮKassa, а пользователь — при оплате.
     * Например: `«Оплата заказа № 72 для user@yoomoney.ru»`.
     */
    description?: string;
    /** Получатель платежа. */
    recipient?: IRecipient;
    /** [Способ оплаты](https://yookassa.ru/developers/payment-acceptance/getting-started/payment-methods#all), который был использован для этого платежа. */
    readonly payment_method?: IPaymentMethod;
    /**
     * Время подтверждения платежа.
     *
     * Указывается по [UTC](https://ru.wikipedia.org/wiki/Всемирное_координированное_время)
     * и передается в формате [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601).
     *
     * Пример: `2017-11-03T11:52:31.827Z`
     */
    readonly captured_at?: string;
    /**
     * Время создания заказа.
     * Указывается по [UTC](https://ru.wikipedia.org/wiki/Всемирное_координированное_время)
     * и передается в формате [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601).
     *
     * Пример: `2017-11-03T11:52:31.827Z`
     */
    readonly created_at: string;
    /**
     * Время, до которого вы можете бесплатно отменить или подтвердить платеж. В указанное время платеж в статусе `waiting_for_capture` будет автоматически отменен.
     *
     * Указывается по [UTC](https://ru.wikipedia.org/wiki/Всемирное_координированное_время)
     * и передается в формате [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601).
     *
     * Пример: `2017-11-03T11:52:31.827Z`
     */
    readonly expires_at?: string;
    /**
     * Выбранный способ подтверждения платежа. Присутствует, когда платеж ожидает подтверждения от пользователя.
     * [Подробнее](https://yookassa.ru/developers/payment-acceptance/getting-started/payment-process#user-confirmation) о сценариях подтверждения.
     */
    confirmation?: IConfirmation;
    /** Признак тестовой операции. */
    readonly test: boolean;
    /** Сумма, которая вернулась пользователю. Присутствует, если у этого платежа есть успешные возвраты. */
    readonly refunded_amount?: IAmount;
    /** Признак оплаты заказа. */
    readonly paid: boolean;
    /** Возможность провести возврат по API. */
    readonly refundable: boolean;
    /**
     * Любые дополнительные данные, которые нужны вам для работы (например, ваш внутренний идентификатор заказа).
     * Передаются в виде набора пар «ключ-значение» и возвращаются в ответе от ЮKassa.
     *
     * ***Ограничения***: максимум 16 ключей, имя ключа не больше 32 символов,
     * значение ключа не больше 512 символов, тип данных — строка в формате UTF-8.
     */
    metadata?: Metadata;
    /**
     * Комментарий к статусу `canceled` — кто отменил платеж и по какой причине.
     *
     * [Подробнее про неуспешные платежи](https://yookassa.ru/developers/payment-acceptance/after-the-payment/declined-payments)
     */
    readonly cancellation_details?: PaymentCancellationDetails;
    /**
     * Данные об авторизации платежа при оплате банковской картой.
     * Присутствуют только для этих способов оплаты:
     * - банковская карта
     * - Mir Pay
     * - SberPay
     * - T-Pay.
     */
    readonly authorization_details?: AuthorizationDetails;
    /** Идентификатор покупателя в вашей системе, например электронная почта или номер телефона. Не более 200 символов. */
    merchant_customer_id?: string;
    /**
     * Статус регистрации чека. Присутствует, если вы используете решения ЮKassa для отправки чеков.
     * - `pending` — данные в обработке
     * - `succeeded` — чек успешно зарегистрирован
     * - `canceled` — чек зарегистрировать не удалось
     */
    readonly receipt_registration?: 'pending' | 'succeeded' | 'canceled';
    /** Данные о выставленном счете, в рамках которого проведен платеж. */
    readonly invoice_details?: {
      /** Идентификатор счета */
      id?: string;
    };
  }

  /**
   * Платёж в статусе отмены. У отменённого платежа всегда есть cancellation_details с причиной
   * (например insufficient_funds, expired_on_confirmation). Используйте с type guard isCanceledPayment.
   * @see https://yookassa.ru/developers/payment-acceptance/after-the-payment/declined-payments
   */
  export type CanceledPayment = IPayment & {
    readonly status: 'canceled';
    readonly cancellation_details: PaymentCancellationDetails;
  };

  /** Type guard: платёж отменён — можно безопасно читать cancellation_details.reason */
  export function isCanceledPayment(payment: IPayment): payment is CanceledPayment {
    return payment.status === 'canceled' && payment.cancellation_details != null;
  }

  /**
   * Чтобы принять оплату, необходимо создать объект платежа — `Payment`. Он содержит всю необходимую информацию для проведения оплаты (сумму, валюту и статус). У платежа линейный жизненный цикл, он последовательно переходит из статуса в статус.
   */
  export type CreatePaymentRequest = Pick<
    IPayment,
    'amount' | 'description' | 'recipient' | 'confirmation' | 'metadata' | 'merchant_customer_id'
  > & {
    /**
     * Одноразовый токен для проведения оплаты, сформированный с помощью [Checkout.js](https://yookassa.ru/developers/payment-acceptance/integration-scenarios/checkout-js/basics) или [мобильного SDK](https://yookassa.ru/developers/payment-acceptance/integration-scenarios/mobile-sdks/basics).
     *
     * Пример: `+u7PDjMTkf08NtD66P6+eYWa2yjU3gsSIhOOO+OWsOg=`
     */
    payment_token?: string;
    /** Идентификатор [сохраненного способа оплаты](https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments) */
    payment_method_id?: string;
    /**
     * Данные для оплаты конкретным [способом](https://yookassa.ru/developers/payment-acceptance/integration-scenarios/manual-integration/basics#integration-options) (`payment_method`).
     *
     * Вы можете не передавать этот объект в запросе. В этом случае пользователь будет выбирать способ оплаты на стороне ЮKassa.
     */
    payment_method_data?: PaymentMethodData;
    /** Сохранение платежных данных (с их помощью можно проводить повторные [безакцептные списания](https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments)). Значение `true` инициирует создание многоразового `payment_method`. */
    save_payment_method?: boolean;
    /** [Автоматический прием](https://yookassa.ru/developers/payment-acceptance/getting-started/payment-process#capture-true) поступившего платежа. */
    capture?: boolean;
    /** IPv4 или IPv6-адрес пользователя. Если не указан, используется IP-адрес TCP-подключения. */
    client_ip?: string;
  };

  /**
   * Запрос на подтверждение платежа.
   * Используется при двухстадийной оплате для списания денег.
   * @see https://yookassa.ru/developers/api#capture_payment
   */
  export interface CapturePaymentRequest {
    /**
     * Сумма к списанию.
     * Можно списать сумму меньше, чем была авторизована (частичное подтверждение).
     * Если не передано, списывается полная сумма платежа.
     */
    amount?: IAmount;
  }
}
