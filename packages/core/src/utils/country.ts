/** 🇦🇹 from "AT" — regional indicator symbols sit 0x1f1a5 above ASCII capitals. */
export function flagEmoji(countryCode: string): string {
  if (!/^[a-z]{2}$/i.test(countryCode)) return '';
  return String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)),
  );
}

export function countryName(countryCode: string, language: string): string {
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}
