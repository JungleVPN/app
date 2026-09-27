import { Button, ComboBox, Form, Input, Label, ListBox, Spinner, TextField } from '@heroui/react';
import {
  CardCvcElement,
  CardExpiryElement,
  CardFields,
  CardNumberElement,
  usePayments,
  useWhop,
} from '@whop/elements-react';
import { type Key, type ReactNode, type SyntheticEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { i18n } from '../../core/i18n';
import { useNavigation } from '../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { useTermsStore } from '../../stores';
import { Block, Paragraph } from '../../ui';
import { checkoutErrorKey } from '../getSubscription/checkoutErrors';
import {
  type BillingCountryOption,
  billingCountryOptions,
  defaultBillingCountry,
} from './billingCountry';
import type { WhopCheckoutState } from './whopCheckoutState';

interface WhopCardFormProps {
  checkout: WhopCheckoutState;
  returnUrl: string;
}

/** Thrown when Whop cannot tokenise the card — its own field already marks what is wrong. */
class CardTokenError extends Error {}

/** A Whop payment status that needs nothing more from the payer. */
const SETTLED_STATUSES: ReadonlySet<string> = new Set(['succeeded', 'processing']);

/** Matches Whop's hosted fields: a hairline at rest, a dark 2px edge and a light outer ring on focus. */
const INPUT_CLASS = [
  'w-full rounded-lg border border-[#0000001f] bg-transparent shadow-none',
  'focus-visible:border-[#222222]! focus-visible:shadow-[0_0_0_1px_#222222]! focus-visible:ring-0!',
  'focus-visible:outline-solid! focus-visible:outline-1! focus-visible:outline-offset-2! focus-visible:outline-[#dddddd]!',
].join(' ');

/** Our label above one of Whop's hosted fields, which live in an iframe a `<label>` cannot reach. */
function HostedField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex flex-col gap-1'>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/**
 * A visually hidden native `<select>` the browser can autofill. A ComboBox
 * input is not autofillable, so this is what lets Chrome set the country
 * along with the postal code — as the old `Select`'s hidden select did.
 */
function CountryAutofill({
  countries,
  value,
  onChange,
}: {
  countries: readonly BillingCountryOption[];
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <select
      aria-hidden
      autoComplete='country'
      className='sr-only'
      name='country'
      tabIndex={-1}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value='' />
      {countries.map((option) => (
        <option key={option.code} value={option.code}>
          {option.name}
        </option>
      ))}
    </select>
  );
}

/**
 * The card form: Whop's PCI-isolated number, expiry and security-code fields
 * with our own labels, the billing details Whop needs for a card (name on
 * card, country, postal code), and our own pay button and messages — so every
 * word the payer reads comes from the app's translations.
 *
 * Pressing pay tokenises the card, charges it through our backend (which
 * re-validates the checkout and stamps the webhook metadata), then hands any
 * pending step such as 3DS to Whop.
 */
export function WhopCardForm({ checkout, returnUrl }: WhopCardFormProps) {
  const { t } = useTranslation();
  const payments = usePayments();
  const whop = useWhop();
  const paymentsApi = usePaymentsApi();
  const navigate = useNavigation();
  const { paymentReturnPath } = useAppRoutes();
  const { open: openTerms } = useTermsStore();

  const countries = useMemo(() => billingCountryOptions(i18n.language), []);
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [name, setName] = useState('');
  const [country, setCountry] = useState(() => defaultBillingCountry(i18n.language));
  const [postalCode, setPostalCode] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPay =
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
    } catch (error) {
      console.log(error);
      throw new CardTokenError();
    }
  };

  const pay = async (): Promise<string | null> => {
    const confirmationToken = await tokeniseCard();
    const payment = await paymentsApi.payPublicWhopCheckout({
      ...checkout.request,
      confirmationToken,
      returnUrl,
    });
    if (payment.status === 'paid') return payment.status;
    if (!whop || !payment.clientSecret) return 'whopCheckout.errors.not_completed';

    const result = await whop.payments.handleNextAction({ clientSecret: payment.clientSecret });
    if (result.redirected) return null;
    if (SETTLED_STATUSES.has(result.status)) return 'paid';
    return result.lastPaymentError
      ? 'whopCheckout.errors.declined'
      : 'whopCheckout.errors.not_completed';
  };

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (!canPay || isPending) return;

    setIsPending(true);
    setError(null);
    try {
      const outcome = await pay();
      if (outcome === 'paid') {
        navigate(paymentReturnPath, { replace: true });
        return;
      }
      if (outcome) setError(t(outcome));
    } catch (caught) {
      console.log(caught);
      setError(
        t(
          caught instanceof CardTokenError
            ? 'whopCheckout.errors.card_invalid'
            : checkoutErrorKey(caught),
        ),
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Form className='flex w-full flex-col gap-6' validationBehavior='aria' onSubmit={handleSubmit}>
      <Block
        title={t('whopCheckout.card_title')}
        className='p-5 sm:p-6'
        description={
          <>
            {t('terms.paymentConsentLead')}
            <button
              className='cursor-pointer underline underline-offset-2'
              type='button'
              onClick={openTerms}
            >
              {t('terms.paymentLinkLabel')}
            </button>
          </>
        }
      >
        <div className='flex flex-col gap-4'>
          <CardFields onChange={({ complete }) => setIsCardComplete(complete)}>
            <HostedField label={t('whopCheckout.card_number')}>
              <CardNumberElement />
            </HostedField>
            <div className='grid grid-cols-2 gap-4'>
              <HostedField label={t('whopCheckout.expiry')}>
                <CardExpiryElement />
              </HostedField>
              <HostedField label={t('whopCheckout.cvc')}>
                <CardCvcElement />
              </HostedField>
            </div>
          </CardFields>

          <TextField isRequired name='cc-name' value={name} onChange={setName}>
            <Label>{t('whopCheckout.name')}</Label>
            <Input
              autoComplete='cc-name'
              className={INPUT_CLASS}
              placeholder={t('whopCheckout.name_placeholder')}
            />
          </TextField>

          <div className='grid grid-cols-2 gap-4'>
            <div className='relative'>
              <ComboBox
                isRequired
                defaultItems={countries}
                selectedKey={country || null}
                onSelectionChange={(key: Key | null) => setCountry(key == null ? '' : String(key))}
              >
                <Label>{t('whopCheckout.country')}</Label>
                <ComboBox.InputGroup>
                  <Input autoComplete='off' className={INPUT_CLASS} />
                  <ComboBox.Trigger />
                </ComboBox.InputGroup>
                <ComboBox.Popover className='bg-overlay text-overlay-foreground'>
                  <ListBox className='text-overlay-foreground'>
                    {(option: BillingCountryOption) => (
                      <ListBox.Item id={option.code} textValue={option.name}>
                        <ListBox.ItemIndicator />
                        <Label>{option.name}</Label>
                      </ListBox.Item>
                    )}
                  </ListBox>
                </ComboBox.Popover>
              </ComboBox>
              <CountryAutofill countries={countries} value={country} onChange={setCountry} />
            </div>

            <TextField isRequired name='postal-code' value={postalCode} onChange={setPostalCode}>
              <Label>{t('whopCheckout.postal_code')}</Label>
              <Input autoComplete='postal-code' className={INPUT_CLASS} />
            </TextField>
          </div>
        </div>
      </Block>

      <Button
        className='w-full rounded-full bg-linear-to-r from-violet-500 to-amber-400'
        isDisabled={!canPay}
        isPending={isPending}
        type='submit'
      >
        {({ isPending: isSubmitPending }) => (
          <>
            {t('whopCheckout.pay')}
            {isSubmitPending ? <Spinner color='current' size='sm' /> : null}
          </>
        )}
      </Button>

      {error && <Paragraph role='alert'>{error}</Paragraph>}
    </Form>
  );
}
