/**
 * The vendors' own wallet buttons. Whop's wallet probe loads Apple's and
 * Google's SDKs before these buttons appear, so a button adds its SDK only
 * when it is not on the page yet, rather than loading and running it twice.
 */
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// loadScript remembers every script it added, so each test starts from a fresh copy of it.
const loadButtons = async () => {
  vi.resetModules();
  return import('../walletButtons');
};

const APPLE_PAY_SDK = 'https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js';
const GOOGLE_PAY_SDK = 'https://pay.google.com/gp/p/js/pay.js';

type WindowWithGoogle = Window & { google?: unknown };

afterEach(() => {
  document.head.replaceChildren();
  delete (window as WindowWithGoogle).google;
  vi.restoreAllMocks();
});

const scriptsFor = (src: string) => document.head.querySelectorAll(`script[src="${src}"]`);

const stubGooglePay = () => {
  const createButton = vi.fn(() => document.createElement('button'));
  (window as WindowWithGoogle).google = {
    payments: {
      api: {
        PaymentsClient: class {
          createButton = createButton;
        },
      },
    },
  };
  return { createButton };
};

describe('ApplePayButton', () => {
  it('adds no SDK when Apple Pay’s button is already defined', async () => {
    vi.spyOn(customElements, 'get').mockReturnValue(class extends HTMLElement {});

    const { ApplePayButton } = await loadButtons();
    render(<ApplePayButton locale='en' onClick={() => {}} />);

    expect(scriptsFor(APPLE_PAY_SDK)).toHaveLength(0);
  });

  it('adds the SDK when Apple Pay’s button is not defined yet', async () => {
    const { ApplePayButton } = await loadButtons();
    render(<ApplePayButton locale='en' onClick={() => {}} />);

    expect(scriptsFor(APPLE_PAY_SDK)).toHaveLength(1);
  });
});

describe('GooglePayButton', () => {
  it('draws the button from the SDK already on the page, without adding it again', async () => {
    const { createButton } = stubGooglePay();

    const { GooglePayButton } = await loadButtons();
    render(<GooglePayButton environment='sandbox' locale='en' onClick={() => {}} />);

    await waitFor(() => expect(createButton).toHaveBeenCalled());
    expect(scriptsFor(GOOGLE_PAY_SDK)).toHaveLength(0);
  });

  it('adds the SDK when it is not on the page yet', async () => {
    const { GooglePayButton } = await loadButtons();
    render(<GooglePayButton environment='sandbox' locale='en' onClick={() => {}} />);

    expect(scriptsFor(GOOGLE_PAY_SDK)).toHaveLength(1);
  });
});
