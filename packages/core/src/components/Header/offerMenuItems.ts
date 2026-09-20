import { IconHeartHandshake, IconWorld } from '@tabler/icons-react';
import { LOCATIONS_PATH, REFERRALS_PATH } from '../../utils';

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
] as const;

export function pathForOfferItem(id: string): string | null {
  return OFFER_MENU_ITEMS.find((item) => item.id === id)?.path ?? null;
}
