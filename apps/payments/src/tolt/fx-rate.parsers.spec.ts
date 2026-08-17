import { describe, expect, it } from 'vitest';
import { parseCbrOfficialXml, parseCbrXmlDailyJson } from './fx-rate.parsers';

// Trimmed to the shape that matters; real responses carry ~50 more currencies.
const CBR_JSON = JSON.stringify({
  Date: '2026-08-12T11:30:00+03:00',
  Valute: {
    USD: { CharCode: 'USD', Nominal: 1, Value: 82.3742 },
    EUR: { CharCode: 'EUR', Nominal: 1, Value: 95.1834 },
    JPY: { CharCode: 'JPY', Nominal: 100, Value: 52.1554 },
  },
});

const CBR_XML =
  '<?xml version="1.0" encoding="windows-1251"?><ValCurs Date="12.08.2026" name="Foreign Currency Market">' +
  '<Valute ID="R01235"><NumCode>840</NumCode><CharCode>USD</CharCode><Nominal>1</Nominal><Value>82,3742</Value><VunitRate>82,3742</VunitRate></Valute>' +
  '<Valute ID="R01239"><NumCode>978</NumCode><CharCode>EUR</CharCode><Nominal>1</Nominal><Value>95,1834</Value><VunitRate>95,1834</VunitRate></Valute>' +
  '<Valute ID="R01820"><NumCode>392</NumCode><CharCode>JPY</CharCode><Nominal>100</Nominal><Value>52,1554</Value><VunitRate>0,521554</VunitRate></Valute>' +
  '</ValCurs>';

describe('parseCbrXmlDailyJson', () => {
  it('reads the RUB-per-EUR rate', () => {
    expect(parseCbrXmlDailyJson(CBR_JSON)).toEqual({
      rate: 95.1834,
      asOf: new Date('2026-08-12T11:30:00+03:00'),
    });
  });

  it('divides by nominal so multi-unit quotes are per single unit', () => {
    const body = JSON.stringify({
      Date: '2026-08-12T11:30:00+03:00',
      Valute: { EUR: { CharCode: 'EUR', Nominal: 10, Value: 951.834 } },
    });
    expect(parseCbrXmlDailyJson(body)?.rate).toBeCloseTo(95.1834, 6);
  });

  it('returns null when EUR is absent', () => {
    const body = JSON.stringify({ Date: '2026-08-12T11:30:00+03:00', Valute: { USD: {} } });
    expect(parseCbrXmlDailyJson(body)).toBeNull();
  });

  it('returns null on malformed JSON rather than throwing', () => {
    expect(parseCbrXmlDailyJson('<html>502 Bad Gateway</html>')).toBeNull();
  });

  it('rejects a non-positive rate', () => {
    const body = JSON.stringify({
      Date: '2026-08-12T11:30:00+03:00',
      Valute: { EUR: { Nominal: 1, Value: 0 } },
    });
    expect(parseCbrXmlDailyJson(body)).toBeNull();
  });
});

describe('parseCbrOfficialXml', () => {
  it('reads the EUR rate, converting the decimal comma', () => {
    expect(parseCbrOfficialXml(CBR_XML)).toEqual({
      rate: 95.1834,
      asOf: new Date(Date.UTC(2026, 7, 12)),
    });
  });

  it('picks EUR rather than the first or nearest currency', () => {
    // USD precedes EUR and JPY follows it; a sloppy regex grabs the wrong one.
    expect(parseCbrOfficialXml(CBR_XML)?.rate).not.toBe(82.3742);
    expect(parseCbrOfficialXml(CBR_XML)?.rate).not.toBe(0.521554);
  });

  it('uses VunitRate so multi-unit nominals need no extra arithmetic', () => {
    const xml =
      '<ValCurs Date="12.08.2026">' +
      '<Valute ID="R01239"><CharCode>EUR</CharCode><Nominal>10</Nominal><Value>951,834</Value><VunitRate>95,1834</VunitRate></Valute>' +
      '</ValCurs>';
    expect(parseCbrOfficialXml(xml)?.rate).toBe(95.1834);
  });

  it('returns null when EUR is absent', () => {
    const xml =
      '<ValCurs Date="12.08.2026"><Valute ID="R01235"><CharCode>USD</CharCode><Nominal>1</Nominal><VunitRate>82,3742</VunitRate></Valute></ValCurs>';
    expect(parseCbrOfficialXml(xml)).toBeNull();
  });

  it('returns null on a non-XML error page rather than throwing', () => {
    expect(parseCbrOfficialXml('<html><body>503</body></html>')).toBeNull();
  });
});
