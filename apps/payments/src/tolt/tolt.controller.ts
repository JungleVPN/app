import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedEmail } from '../auth/authenticated-email.decorator';
import { AuthenticatedUserId } from '../auth/authenticated-user.decorator';
import { ClientUserGuard } from '../auth/client-user.guard';
import type { CaptureReferralDto } from './tolt.dto';
import { ToltService } from './tolt.service';

/** Generous enough for any real Tolt identifier, tight enough to bound abuse. */
const MAX_FIELD_LENGTH = 128;
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
   * `tlt.js` resolves the `?aff=` link in the browser, but that context is gone
   * by the time a payment settles — possibly days later, on another device, or
   * for a renewal with no browser involved at all. Persisting it here is what
   * lets any payment provider report a conversion.
   *
   * Idempotent by construction: the service keeps the first affiliate and
   * ignores later captures, so the client may call this freely.
   */
  @Post('referral')
  @UseGuards(ClientUserGuard)
  async captureReferral(
    @Body() body: CaptureReferralDto,
    // Taken from the validated credential — a client-supplied userId in the
    // body would let anyone attribute someone else's payments to their own
    // partner code.
    @AuthenticatedUserId() userId: string,
    @AuthenticatedEmail() email: string | undefined,
  ): Promise<{ ok: true }> {
    await this.toltService.captureReferral({
      userId,
      referralCode: this.requireField(body?.referralCode, 'referralCode'),
      partnerId: this.requireField(body?.partnerId, 'partnerId'),
      clickId: this.optionalField(body?.clickId),
      email: email ?? null,
    });

    return { ok: true };
  }

  /**
   * Validates one client-supplied identifier.
   *
   * There is no global ValidationPipe in this service, and these values are
   * both persisted and forwarded to a third party, so they are checked here
   * rather than trusted.
   */
  private requireField(value: unknown, field: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} is required`);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${field} must not be empty`);
    }
    if (trimmed.length > MAX_FIELD_LENGTH) {
      throw new BadRequestException(`${field} exceeds ${MAX_FIELD_LENGTH} characters`);
    }
    if (CONTROL_CHARACTERS.test(trimmed)) {
      throw new BadRequestException(`${field} contains invalid characters`);
    }

    return trimmed;
  }

  /** Same rules, but absence is allowed — not every click is attributable. */
  private optionalField(value: unknown): string | null {
    if (value === undefined || value === null || value === '') return null;
    return this.requireField(value, 'clickId');
  }
}
