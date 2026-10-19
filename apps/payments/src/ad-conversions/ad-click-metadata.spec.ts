import { describe, expect, it } from 'vitest';
import { adClickMetadata } from './ad-click-metadata';

describe('adClickMetadata — what a checkout stamps on the payment for ad reporting', () => {
  it.each([
    ['absent', undefined],
    ['null', null],
    ['text', 'gclid=g-1'],
    ['a list', ['g-1']],
  ])('stamps nothing when the click ids are %s', (_case, adClicks) => {
    expect(adClickMetadata(adClicks)).toEqual({});
  });

  it('stamps every Google and Microsoft click id', () => {
    expect(
      adClickMetadata({ gclid: 'Cj0_g-1', gbraid: 'gb-1', wbraid: 'wb-1', msclkid: 'a1b2c3' }),
    ).toEqual({ gclid: 'Cj0_g-1', gbraid: 'gb-1', wbraid: 'wb-1', msclkid: 'a1b2c3' });
  });

  it('drops keys that are not click ids', () => {
    expect(adClickMetadata({ gclid: 'g-1', email: 'x', fbclid: 'f' })).toEqual({ gclid: 'g-1' });
  });

  it.each([
    ['not text', 42],
    ['empty', ''],
    ['carrying spaces', 'g 1'],
    ['carrying markup', '<script>'],
    ['longer than 256 characters', 'g'.repeat(257)],
  ])('drops a click id that is %s', (_case, gclid) => {
    expect(adClickMetadata({ gclid, msclkid: 'm-1' })).toEqual({ msclkid: 'm-1' });
  });

  it('keeps a click id of exactly 256 characters', () => {
    const gclid = 'g'.repeat(256);

    expect(adClickMetadata({ gclid })).toEqual({ gclid });
  });
});
