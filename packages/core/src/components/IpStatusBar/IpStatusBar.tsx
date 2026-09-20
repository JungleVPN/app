import { useTranslation } from 'react-i18next';
import { useRemnawaveApi } from '../../api';
import { useIpStatus } from '../../hooks';

/** 🇵🇹 from "PT" — regional indicator symbols sit 0x1f1a5 above ASCII capitals. */
function flagEmoji(countryCode: string): string {
  if (!/^[a-z]{2}$/i.test(countryCode)) return '';
  return String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)),
  );
}

function countryName(countryCode: string, language: string): string {
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

interface IpStatusBarProps {
  className?: string;
}

/**
 * Tells a landing-page visitor whether they are currently behind the VPN.
 *
 * Renders nothing but reserved height until the answer is known, and stays
 * that way if it never arrives — see `useIpStatus`. The reserved height is what
 * keeps the hero below from shifting once the answer lands.
 */
export function IpStatusBar(props: IpStatusBarProps) {
  const { t, i18n } = useTranslation();
  const { className } = props;
  const remnawaveApi = useRemnawaveApi();
  const status = useIpStatus(remnawaveApi);

  // `protected: null` is "we could not tell", and the only honest rendering of
  // that is no claim at all.
  if (!status || status.protected === null || !status.ip) {
    return <div className='h-9' aria-hidden='true' />;
  }

  const location = status.countryCode
    ? ` (${countryName(status.countryCode, i18n.language)} ${flagEmoji(status.countryCode)})`
    : '';

  return (
    <div
      role='status'
      aria-live='polite'
      className={`flex h-fit z-100 items-center justify-center gap-2 px-4 pt-1 bg-white text-center text-xs text-inherit ${className ? className : ''}`}
    >
      <span className={'text-muted'}>
        {t('ipStatus.yourIp', { ip: status.ip })}
        {location}
      </span>
      <span className={status.protected ? 'text-emerald-400' : 'text-red-400'}>
        {'• '}
        {t(status.protected ? 'ipStatus.protected' : 'ipStatus.unprotected')}
      </span>
    </div>
  );
}
