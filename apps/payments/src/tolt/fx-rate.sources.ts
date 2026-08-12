import { type ParsedRate, parseCbrOfficialXml, parseCbrXmlDailyJson } from './fx-rate.parsers';
import type { RateSource } from './fx-rate.service';

const TIMEOUT_MS = 5_000;

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'application/json, text/xml, */*' },
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.text();
}

function source(name: string, url: string, parse: (body: string) => ParsedRate | null): RateSource {
  return {
    name,
    async fetchRate() {
      const parsed = parse(await fetchText(url));
      if (!parsed) throw new Error(`${name}: could not parse a EUR rate from ${url}`);
      return parsed;
    },
  };
}

/**
 * Rate sources in priority order.
 *
 * The mirror leads deliberately: it exists precisely because the official CBR
 * endpoints have a history of being unavailable, and it serves clean UTF-8 JSON
 * with permissive caching. cbr.ru follows as an independent fallback on separate
 * infrastructure — if the mirror (a donation-funded service) disappears, the
 * authoritative source still answers.
 *
 * Both are free and keyless. The mirror asks for a backlink and permits 30
 * req/min, 10k/day per IP; a 12h cache puts us at roughly two requests a day.
 */
export const defaultRateSources = (): RateSource[] => [
  source('cbr-xml-daily', 'https://www.cbr-xml-daily.ru/daily_json.js', parseCbrXmlDailyJson),
  source('cbr-official', 'https://www.cbr.ru/scripts/XML_daily.asp', parseCbrOfficialXml),
];
