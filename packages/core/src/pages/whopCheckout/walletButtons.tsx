import React, { useEffect, useRef } from 'react';
import { loadScript } from './loadScript';

const APPLE_PAY_SDK = 'https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js';
const GOOGLE_PAY_SDK = 'https://pay.google.com/gp/p/js/pay.js';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'apple-pay-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        buttonstyle?: 'black' | 'white' | 'white-outline';
        type?: 'buy' | 'plain' | 'check-out' | 'subscribe';
        locale?: string;
      };
    }
  }
}

/** The slice of Google's pay.js the button needs. */
interface GooglePayApi {
  payments: {
    api: {
      PaymentsClient: new (options: {
        environment: 'TEST' | 'PRODUCTION';
      }) => {
        createButton(options: {
          onClick: () => void;
          buttonColor: 'black' | 'white' | 'default';
          buttonType: 'buy' | 'plain' | 'checkout' | 'subscribe';
          buttonSizeMode: 'fill' | 'static';
          buttonLocale?: string;
          buttonRadius?: number;
        }): HTMLElement;
      };
    };
  };
}

function googlePayApi(): GooglePayApi | undefined {
  return (window as Window & { google?: GooglePayApi }).google;
}

interface WalletButtonProps {
  locale: string;
  onClick: () => void;
}

/**
 * Apple's own Apple Pay button, as Apple's guidelines require — it renders in
 * every browser, including Chrome's iPhone-handoff flow. The element stops
 * every click from bubbling, so React's delegated `onClick` never hears it:
 * the listener goes on the element itself, still within the tap.
 */
export function ApplePayButton({ locale, onClick }: WalletButtonProps) {
  const button = useRef<HTMLElement>(null);
  const handleClick = useRef(onClick);
  handleClick.current = onClick;

  useEffect(() => {
    loadScript(APPLE_PAY_SDK).catch(() => {});
  }, []);

  useEffect(() => {
    const element = button.current;
    if (!element) return;
    const listener = () => handleClick.current();
    element.addEventListener('click', listener);
    return () => element.removeEventListener('click', listener);
  }, []);

  return (
    <apple-pay-button
      ref={button}
      aria-label='Apple Pay'
      buttonstyle='black'
      className='block w-full [--apple-pay-button-border-radius:20px] [--apple-pay-button-height:40px] [--apple-pay-button-width:100%]'
      locale={locale}
      role='button'
      type='plain'
    />
  );
}

/**
 * Google's own Google Pay button from pay.js, as the Google Pay terms require.
 * The click it reports comes straight from the tap, so the sheet may open.
 */
export function GooglePayButton({
  locale,
  onClick,
  environment,
}: WalletButtonProps & { environment: 'sandbox' | 'production' }) {
  const container = useRef<HTMLDivElement>(null);
  const handleClick = useRef(onClick);
  handleClick.current = onClick;

  useEffect(() => {
    let isCurrent = true;
    loadScript(GOOGLE_PAY_SDK)
      .then(() => {
        const google = googlePayApi();
        if (!isCurrent || !google || !container.current) return;
        const client = new google.payments.api.PaymentsClient({
          environment: environment === 'production' ? 'PRODUCTION' : 'TEST',
        });
        container.current.replaceChildren(
          client.createButton({
            onClick: () => handleClick.current(),
            buttonColor: 'black',
            buttonType: 'plain',
            buttonSizeMode: 'fill',
            buttonLocale: locale,
            buttonRadius: 20,
          }),
        );
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [environment, locale]);

  return <div ref={container} className='h-10 w-full' />;
}
