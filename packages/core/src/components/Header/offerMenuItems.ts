import { IconHeartHandshake, IconMapPin, IconShieldQuestion, IconWorld } from '@tabler/icons-react';
import { LOCATIONS_PATH, MY_IP_PATH, REFERRALS_PATH, WHAT_IS_VPN_PATH } from '../../utils';

export const OFFER_MENU_ITEMS = [
  {
    id: 'invite-and-earn',
    labelKey: 'header.nav.inviteAndEarn',
    descriptionKey: 'header.nav.inviteAndEarnDescription',
    icon: IconHeartHandshake,
    path: REFERRALS_PATH,
  },
  {
    id: 'locations',
    labelKey: 'header.nav.locations',
    descriptionKey: 'header.nav.locationsDescription',
    icon: IconWorld,
    path: LOCATIONS_PATH,
  },
  {
    id: 'what-is-vpn',
    labelKey: 'header.nav.whatIsVpn',
    descriptionKey: 'header.nav.whatIsVpnDescription',
    icon: IconShieldQuestion,
    path: WHAT_IS_VPN_PATH,
  },
] as const;

export const TOOLS_MENU_ITEMS = [
  {
    id: 'my-ip',
    labelKey: 'header.nav.myIp',
    descriptionKey: 'header.nav.myIpDescription',
    icon: IconMapPin,
    path: MY_IP_PATH,
  },
] as const;

export function pathForOfferItem(id: string): string | null {
  return [...OFFER_MENU_ITEMS, ...TOOLS_MENU_ITEMS].find((item) => item.id === id)?.path ?? null;
}
