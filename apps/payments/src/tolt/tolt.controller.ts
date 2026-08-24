import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedEmail } from '../auth/authenticated-email.decorator';
import { AuthenticatedUserId } from '../auth/authenticated-user.decorator';
import { ClientUserGuard } from '../auth/client-user.guard';
import type { CaptureReferralDto, RecordClickDto } from './tolt.dto';
import { ToltService } from './tolt.service';

/** Generous enough for any real Tolt identifier, tight enough to bound abuse. */
const MAX_FIELD_LENGTH = 128;
/** Page and referrer are URLs, which legitimately run longer. */
const MAX_URL_LENGTH = 2048;
// Rejected because these values are persisted and forwarded to a third-party API.
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching them is the point
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

@Controller('tolt')
export class ToltController {
  constructor(private readonly toltService: ToltService) {}

  /**
   * Hands the browser's affiliate attribution to the backend so it outlives the
   * session that produced it.
   *
   * The browser knows the referral only within the session that followed the
   * link, but the payment it should credit may settle days later, on another
   * device, or as a renewal with no browser involved at all. Persisting it here
   * is what lets any payment provider report a conversion.
   *
   * Safe to call on every page load: the service overwrites until the user pays
   * and ignores everything after.
   */
  @Post('referral')
  @UseGuards(ClientUserGuard)
  async captureReferral(
    @Body() body: CaptureReferralDto,
    // Taken from the validated credential — a client-supplied userId in the
    // body would let anyone attribute someone else's payments to their own
    // partner code.
    @AuthenticatedUserId() userId: number,
    @AuthenticatedEmail() email: string,
  ): Promise<{ ok: true }> {
    await this.toltService.captureReferral({
      userId,
      referralCode: this.requireField(body?.referralCode, 'referralCode'),
      partnerId: this.requireField(body?.partnerId, 'partnerId'),
      clickId: this.optionalField(body?.clickId, 'clickId'),
      email,
    });

    return { ok: true };
  }

  /**
   * Records a click on a partner's link and resolves it to a partner.
   *
   * Deliberately unauthenticated: a visitor following an affiliate link has no
   * account yet, and the click must be attributed before they ever sign in.
   * The API key stays server-side, which is the reason this is a backend
   * endpoint at all rather than a call from the page.
   *
   * Returns the resolved partner so the browser can store it alongside the
   * code, sparing a second lookup when the user later signs in. An unknown code
   * is answered with 404 rather than an error — a mistyped or retired link is a
   * visitor-facing condition, not a fault.
   */
  @Post('click')
  async recordClick(@Body() body: RecordClickDto): Promise<{ partnerId: string; clickId: string }> {
    const affCode = this.requireField(body?.affCode, 'affCode');

    const resolved = await this.toltService.recordClick({
      affCode,
      page: this.optionalField(body?.page, 'page', MAX_URL_LENGTH),
      referrer: this.optionalField(body?.referrer, 'referrer', MAX_URL_LENGTH),
    });

    if (!resolved) throw new NotFoundException(`Unknown referral code`);

    return resolved;
  }

  /**
   * Validates one client-supplied identifier.
   *
   * There is no global ValidationPipe in this service, and these values are
   * both persisted and forwarded to a third party, so they are checked here
   * rather than trusted.
   */
  private requireField(value: unknown, field: string, max = MAX_FIELD_LENGTH): string {
    const parsed = this.optionalField(value, field, max);
    if (!parsed) throw new BadRequestException(`${field} is required`);
    return parsed;
  }

  /** Same rules, but absence is allowed. */
  private optionalField(value: unknown, field: string, max = MAX_FIELD_LENGTH): string | null {
    if (value === undefined || value === null || value === '') return null;

    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }

    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.length > max) {
      throw new BadRequestException(`${field} exceeds ${max} characters`);
    }
    if (CONTROL_CHARACTERS.test(trimmed)) {
      throw new BadRequestException(`${field} contains invalid characters`);
    }

    return trimmed;
  }
}
