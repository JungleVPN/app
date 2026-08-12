/**
 * Pure parsers for the two CBR rate feeds. Kept free of IO so the fiddly bits —
 * decimal commas, nominals, error pages served with a 200 — are directly testable.
 */

export type ParsedRate = {
  /** Roubles per one euro. */
  rate: number;
  /** The date CBR published this rate for. */
  asOf: Date;
};

const isUsableRate = (value: number): boolean => Number.isFinite(value) && value > 0;

/**
 * `https://www.cbr-xml-daily.ru/daily_json.js` — UTF-8 JSON mirror of CBR.
 *
 * `Value` is roubles per `Nominal` units, so it is divided down to a per-unit
 * rate. Preferred over the money.js-shaped `latest.js`, which quotes reciprocals
 * rounded to 8 decimal places and loses precision when inverted.
 */
export function parseCbrXmlDailyJson(body: string): ParsedRate | null {
  try {
    const parsed = JSON.parse(body) as {
      Date?: string;
      Valute?: Record<string, { Nominal?: number; Value?: number }>;
    };

    const eur = parsed.Valute?.EUR;
    if (!eur) return null;

    const nominal = eur.Nominal ?? 1;
    const value = eur.Value;
    if (typeof value !== 'number' || nominal <= 0) return null;

    const rate = value / nominal;
    if (!isUsableRate(rate)) return null;

    const asOf = parsed.Date ? new Date(parsed.Date) : null;
    if (!asOf || Number.isNaN(asOf.getTime())) return null;

    return { rate, asOf };
  } catch {
    // A gateway error page is served as a 200 often enough to matter.
    return null;
  }
}

/**
 * `https://www.cbr.ru/scripts/XML_daily.asp` — the official feed.
 *
 * Declared `windows-1251`, but every field read here is ASCII, so the body is
 * matched as-is without an encoding or XML dependency. Two quirks: decimals use
 * a comma, and `VunitRate` is already per single unit (unlike `Value`), which is
 * why it is preferred — no nominal arithmetic.
 *
 * The match is anchored on the `<Valute>` element containing `<CharCode>EUR`
 * rather than a bare `VunitRate` scan, so neighbouring currencies can't be read
 * by mistake.
 */
export function parseCbrOfficialXml(body: string): ParsedRate | null {
  const eurBlock = body
    .match(/<Valute\b[^>]*>(?:(?!<\/Valute>)[\s\S])*?<\/Valute>/g)
    ?.find((el) => /<CharCode>\s*EUR\s*<\/CharCode>/.test(el));
  if (!eurBlock) return null;

  const unitRate = eurBlock.match(/<VunitRate>([\d.,]+)<\/VunitRate>/)?.[1];
  if (!unitRate) return null;

  const rate = Number(unitRate.replace(',', '.'));
  if (!isUsableRate(rate)) return null;

  // Date="12.08.2026" — day-first, and not a format `new Date()` parses.
  const stamp = body.match(/<ValCurs\b[^>]*\bDate="(\d{2})\.(\d{2})\.(\d{4})"/);
  if (!stamp) return null;
  const [, day, month, year] = stamp;
  const asOf = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(asOf.getTime())) return null;

  return { rate, asOf };
}
