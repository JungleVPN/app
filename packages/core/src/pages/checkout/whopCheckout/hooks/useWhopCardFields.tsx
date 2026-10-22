import { usePayments, useWhop } from '@whop/elements-react';
import { useMemo, useState } from 'react';
import { useRemnawaveApi } from '../../../../api';
import { i18n } from '../../../../i18n';
import { useIpStatus } from '../../../../hooks';
import { WhopCardInputs } from '../components/WhopCardInputs';
import { billingCountryOptions, preselectedBillingCountry } from '../utils/billingCountry';
import { CardTokenError } from '../utils/whopPayErrors';
import type { WhopCheckoutState } from '../whopCheckoutState';
import type { WhopPay } from './useWhopPay';

interface WhopCardFieldsProps {
  checkout: WhopCheckoutState;
  payment: WhopPay;
}

/**
 * The card's inputs — Whop's PCI-isolated number, expiry and security-code
 * fields with our own labels, plus the billing details Whop needs for a card
 * (name on card, country, postal code) — with whether the card can be paid and
 * the call that pays it. Must be rendered within Whop's `Payments` element.
 */
export function useWhopCardFields({ checkout, payment }: WhopCardFieldsProps) {
  const payments = usePayments();
  const whop = useWhop();
  const { pay, pendingVia } = payment;
  const ipStatus = useIpStatus(useRemnawaveApi());

  const countries = useMemo(() => billingCountryOptions(i18n.language), []);
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [name, setName] = useState('');
  const [pickedCountry, setCountry] = useState<string | null>(null);
  const country = pickedCountry ?? preselectedBillingCountry({ ipStatus, language: i18n.language });
  const [postalCode, setPostalCode] = useState('');

  const canPay =
    pendingVia === null &&
    payments !== null &&
    whop !== null &&
    isCardComplete &&
    name.trim().length > 0 &&
    country.length > 0 &&
    postalCode.trim().length > 0;

  const tokeniseCard = async (): Promise<string> => {
    if (!payments) throw new CardTokenError();
    try {
      const { confirmationToken } = await payments.createConfirmationToken({
        billingDetails: {
          email: checkout.request.email,
          name: name.trim(),
          address: { country, postal_code: postalCode.trim() },
        },
      });
      return confirmationToken;
    } catch {
      throw new CardTokenError();
    }
  };

  const submit = () => {
    if (canPay) void pay({ method: 'card', tokenise: tokeniseCard });
  };

  const inputs = (
    <WhopCardInputs
      countries={countries}
      name={name}
      country={country}
      postalCode={postalCode}
      onCardCompleteChange={setIsCardComplete}
      onNameChange={setName}
      onCountryChange={setCountry}
      onPostalCodeChange={setPostalCode}
    />
  );

  return { inputs, canPay, submit };
}
