import type { IpStatusDto } from '@workspace/types';

/** ISO 3166-1 alpha-2 codes a card can be billed to. Names come from `Intl`, in the visitor's language. */
const COUNTRY_CODES: readonly string[] = [
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI',
  'BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN',
  'CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK',
  'FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM',
  'HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN',
  'KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK',
  'ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP',
  'NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW',
  'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF',
  'TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI',
  'VN VU WF WS YE YT ZA ZM ZW',
]
  .join(' ')
  .split(' ');

const KNOWN_CODES: ReadonlySet<string> = new Set(COUNTRY_CODES);

export type BillingCountryOption = { code: string; name: string };

/** Every billable country, named and sorted in `language`. */
export function billingCountryOptions(language: string): BillingCountryOption[] {
  const names = new Intl.DisplayNames([language], { type: 'region' });
  return COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) =>
    a.name.localeCompare(b.name, language),
  );
}

/**
 * The country to preselect: the region `language` names (`pt-BR`), else the
 * one it most likely means (`ru` → Russia). Empty when neither is a country,
 * so the payer picks rather than being billed to a guess.
 */
export function defaultBillingCountry(language: string): string {
  try {
    const region = new Intl.Locale(language).maximize().region ?? '';
    return KNOWN_CODES.has(region) ? region : '';
  } catch {
    return '';
  }
}

/**
 * The country to preselect for a payer: the one their address is in, else
 * the one their language points to. An address on one of our VPN nodes (or
 * one we cannot tell apart from one) says where the node is, not the payer.
 */
export function preselectedBillingCountry({
  ipStatus,
  language,
}: {
  ipStatus: IpStatusDto | null;
  language: string;
}): string {
  const addressCountry = ipStatus?.protected === false ? (ipStatus.countryCode ?? '') : '';
  return KNOWN_CODES.has(addressCountry) ? addressCountry : defaultBillingCountry(language);
}
