import { REFERRALS_PATH } from '../../utils';

export const OFFER_MENU_ITEMS = [
  { id: 'invite-and-earn', labelKey: 'header.nav.inviteAndEarn', path: REFERRALS_PATH },
] as const;

export function pathForOfferItem(id: string): string | null {
  return OFFER_MENU_ITEMS.find((item) => item.id === id)?.path ?? null;
}
