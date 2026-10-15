import { ComboBox, Input, Label, ListBox, TextField } from '@heroui/react';
import {
  CardCvcElement,
  CardExpiryElement,
  CardFields,
  CardNumberElement,
} from '@whop/elements-react';
import type { Key, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { BillingCountryOption } from '../utils/billingCountry';

/** Matches Whop's hosted fields: a hairline at rest, a dark 2px edge and a light outer ring on focus. */
const INPUT_CLASS = [
  'w-full h-11 rounded-lg border border-[#0000001f] bg-transparent shadow-none',
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

interface CountryFieldProps {
  countries: readonly BillingCountryOption[];
  /** The country's code; empty when none is chosen. */
  value: string;
  onChange: (code: string) => void;
}

/**
 * A visually hidden native `<select>` the browser can autofill. A ComboBox
 * input is not autofillable, so this is what lets Chrome set the country
 * along with the postal code — as the old `Select`'s hidden select did.
 */
function CountryAutofill({ countries, value, onChange }: CountryFieldProps) {
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

/** The billing country: a searchable list, backed by a select the browser can autofill. */
function CountryField({ countries, value, onChange }: CountryFieldProps) {
  const { t } = useTranslation();

  return (
    <div className='relative'>
      <ComboBox
        defaultItems={countries}
        selectedKey={value || null}
        onSelectionChange={(key: Key | null) => onChange(key == null ? '' : String(key))}
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
      <CountryAutofill countries={countries} value={value} onChange={onChange} />
    </div>
  );
}

interface WhopCardInputsProps {
  countries: readonly BillingCountryOption[];
  name: string;
  country: string;
  postalCode: string;
  onCardCompleteChange: (isComplete: boolean) => void;
  onNameChange: (name: string) => void;
  onCountryChange: (code: string) => void;
  onPostalCodeChange: (postalCode: string) => void;
}

/**
 * Whop's PCI-isolated number, expiry and security-code fields with our own
 * labels, then the billing details Whop needs for a card: name on card,
 * country and postal code. Must be rendered within Whop's `Payments` element.
 */
export function WhopCardInputs({
  countries,
  name,
  country,
  postalCode,
  onCardCompleteChange,
  onNameChange,
  onCountryChange,
  onPostalCodeChange,
}: WhopCardInputsProps) {
  const { t } = useTranslation();

  return (
    <div className='flex flex-col gap-4'>
      <CardFields onChange={({ complete }) => onCardCompleteChange(complete)}>
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

      <TextField name='cc-name' value={name} onChange={onNameChange}>
        <Label>{t('whopCheckout.name')}</Label>
        <Input
          autoComplete='cc-name'
          className={INPUT_CLASS}
          placeholder={t('whopCheckout.name_placeholder')}
        />
      </TextField>

      <div className='grid grid-cols-2 gap-4'>
        <CountryField countries={countries} value={country} onChange={onCountryChange} />

        <TextField name='postal-code' value={postalCode} onChange={onPostalCodeChange}>
          <Label>{t('whopCheckout.postal_code')}</Label>
          <Input autoComplete='postal-code' className={INPUT_CLASS} />
        </TextField>
      </div>
    </div>
  );
}
