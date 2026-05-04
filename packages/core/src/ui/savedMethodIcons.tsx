import {
  IconBrandMastercard,
  IconBrandVisa,
  IconCreditCard,
  IconCreditCardFilled,
  IconCurrencyRubel,
  IconWallet,
} from '@tabler/icons-react';
import type { RecurringPaymentMethodType } from '@workspace/types';
import { BankCardTypeEnum, PaymentMethodsEnum } from '@workspace/types';
import type { ReactNode } from 'react';
import SpbIcon from '../assets/icons/spb-icon.svg?react';

const ICON_PROPS = { stroke: 1.5, size: 24 } as const;

/**
 * Icons per savable YooKassa payment method type.
 * `ReactNode` so entries can be JSX elements, emoji strings, or null.
 * `Record<RecurringPaymentMethodType, ReactNode>` enforces exhaustiveness —
 * extending the union requires an entry here.
 */
export const METHOD_ICONS: Record<RecurringPaymentMethodType, ReactNode> = {
  // Icon resolved per card network via CARD_TYPE_ICONS when card.cardType is present.
  [PaymentMethodsEnum.bank_card]: <IconCreditCardFilled {...ICON_PROPS} />,
  [PaymentMethodsEnum.yoo_money]: <IconWallet {...ICON_PROPS} />,
  [PaymentMethodsEnum.sberbank]: '💳', // replace with SberPay SVG asset
  [PaymentMethodsEnum.tinkoff_bank]: '💳', // replace with T-Pay SVG asset
  [PaymentMethodsEnum.sbp]: <SpbIcon />,
};

/**
 * Per-network icons for bank cards.
 * `Record<BankCardTypeEnum, ReactNode>` enforces exhaustiveness.
 */
export const CARD_TYPE_ICONS: Record<BankCardTypeEnum, ReactNode> = {
  [BankCardTypeEnum.Visa]: <IconBrandVisa {...ICON_PROPS} />,
  [BankCardTypeEnum.MasterCard]: <IconBrandMastercard {...ICON_PROPS} />,
  [BankCardTypeEnum.Mir]: <IconCurrencyRubel {...ICON_PROPS} />, // replace with Mir SVG asset
  [BankCardTypeEnum.AmericanExpress]: <IconBrandVisa {...ICON_PROPS} />,
  [BankCardTypeEnum.DiscoverCard]: <IconBrandVisa {...ICON_PROPS} />,
  [BankCardTypeEnum.UnionPay]: '🧡', // replace with UnionPay SVG asset
  [BankCardTypeEnum.JCB]: '🔶', // replace with JCB SVG asset
  [BankCardTypeEnum.DinersClub]: '🔷', // replace with DinersClub SVG asset
  [BankCardTypeEnum.InstaPayment]: <IconCreditCard {...ICON_PROPS} />,
  [BankCardTypeEnum.InstaPaymentTM]: <IconCreditCard {...ICON_PROPS} />,
  [BankCardTypeEnum.Laser]: <IconCreditCard {...ICON_PROPS} />,
  [BankCardTypeEnum.Dankort]: <IconCreditCard {...ICON_PROPS} />,
  [BankCardTypeEnum.Solo]: <IconCreditCard {...ICON_PROPS} />,
  [BankCardTypeEnum.Switch]: <IconCreditCard {...ICON_PROPS} />,
  [BankCardTypeEnum.Unknown]: <IconCreditCard {...ICON_PROPS} />,
};

/** Shown for any type not in METHOD_ICONS (e.g. future or unknown methods). */
export const FALLBACK_ICON: ReactNode = <IconCreditCard {...ICON_PROPS} />;

/**
 * Resolves the display icon for a saved payment method.
 *
 * For `bank_card`: uses the card-network icon from CARD_TYPE_ICONS when
 * `card.cardType` is present, falling back to the generic card icon.
 * For all other method types: looks up METHOD_ICONS with a generic fallback.
 */
export function resolveMethodIcon(method: {
  paymentMethodType: string;
  card?: { cardType?: string } | null;
}): ReactNode {
  if (method.paymentMethodType === PaymentMethodsEnum.bank_card && method.card?.cardType) {
    return (
      CARD_TYPE_ICONS[method.card.cardType as BankCardTypeEnum] ??
      METHOD_ICONS[PaymentMethodsEnum.bank_card]
    );
  }
  return METHOD_ICONS[method.paymentMethodType as RecurringPaymentMethodType] ?? FALLBACK_ICON;
}
