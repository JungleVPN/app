import { describe, expect, it } from 'vitest';
import { adClickMetadata } from './ad-click-metadata';

describe('adClickMetadata — what a checkout stamps on the payment for ad reporting', () => {
  it('stamps nothing without ads consent, even when click ids were sent', () => {
    expect(adClickMetadata({ adsConsent: false, adClicks: { gclid: 'g-1' } })).toEqual({});
    expect(adClickMetadata({ adClicks: { gclid: 'g-1' } })).toEqual({});
  });

  it('only accepts consent given as a real true', () => {
    expect(adClickMetadata({ adsConsent: 'true', adClicks: { gclid: 'g-1' } })).toEqual({});
  });

  it('stamps the consent alone when no click ids were sent', () => {
    expect(adClickMetadata({ adsConsent: true })).toEqual({ adsConsent: '1' });
    expect(adClickMetadata({ adsConsent: true, adClicks: null })).toEqual({ adsConsent: '1' });
  });

  it('stamps every Google and Microsoft click id with the consent', () => {
    expect(
      adClickMetadata({
        adsConsent: true,
        adClicks: { gclid: 'Cj0_g-1', gbraid: 'gb-1', wbraid: 'wb-1', msclkid: 'a1b2c3' },
      }),
    ).toEqual({
      adsConsent: '1',
      gclid: 'Cj0_g-1',
      gbraid: 'gb-1',
      wbraid: 'wb-1',
      msclkid: 'a1b2c3',
    });
  });

  it('drops keys that are not click ids', () => {
    expect(
      adClickMetadata({ adsConsent: true, adClicks: { gclid: 'g-1', email: 'x', fbclid: 'f' } }),
    ).toEqual({ adsConsent: '1', gclid: 'g-1' });
  });

  it.each([
    ['not text', 42],
    ['empty', ''],
    ['carrying spaces', 'g 1'],
    ['carrying markup', '<script>'],
    ['longer than 256 characters', 'g'.repeat(257)],
  ])('drops a click id that is %s', (_case, gclid) => {
    expect(adClickMetadata({ adsConsent: true, adClicks: { gclid, msclkid: 'm-1' } })).toEqual({
      adsConsent: '1',
      msclkid: 'm-1',
    });
  });

  it('keeps a click id of exactly 256 characters', () => {
    const gclid = 'g'.repeat(256);

    expect(adClickMetadata({ adsConsent: true, adClicks: { gclid } })).toEqual({
      adsConsent: '1',
      gclid,
    });
  });

  it.each([
    ['text', 'gclid=g-1'],
    ['a list', ['g-1']],
  ])('ignores click ids sent as %s', (_case, adClicks) => {
    expect(adClickMetadata({ adsConsent: true, adClicks })).toEqual({ adsConsent: '1' });
  });
});
