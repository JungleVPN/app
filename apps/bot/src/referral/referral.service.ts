import * as process from 'node:process';
import { Injectable } from '@nestjs/common';
import { generateReferralCode } from '@utils/url';

@Injectable()
export class ReferralService {
  getUserReferralLink(userId: number): string {
    const secret = process.env.REFERRAL_CODE_SECRET ?? '';
    const code = generateReferralCode(userId, secret);
    return `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=ref_${code}`;
  }
}
