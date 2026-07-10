import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StripePayment, TelegramStarsPayment, YookassaPayment } from '@workspace/database';
import type { AdminPaymentDto } from '@workspace/types';
import { Repository } from 'typeorm';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(YookassaPayment)
    private readonly yookassaRepo: Repository<YookassaPayment>,
    @InjectRepository(TelegramStarsPayment)
    private readonly starsRepo: Repository<TelegramStarsPayment>,
    @InjectRepository(StripePayment)
    private readonly stripeRepo: Repository<StripePayment>,
  ) {}

  async search(q: string): Promise<AdminPaymentDto[]> {
    const [yookassaResults, starsResults, stripeResults] = await Promise.all([
      this.searchYookassa(q),
      this.searchStars(q),
      this.searchStripe(q),
    ]);

    const results = [...yookassaResults, ...starsResults, ...stripeResults];

    // Sort newest first
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return results;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async searchYookassa(q: string): Promise<AdminPaymentDto[]> {
    const qb = this.yookassaRepo.createQueryBuilder('p');

    // Match on paymentId or userId
    qb.where('p.id = :q OR p.userId = :q', { q }).andWhere('p.status != :pending', {
      pending: 'pending',
    });

    // Also try matching on telegramId if q looks numeric
    const numericQ = Number(q);
    if (!isNaN(numericQ) && Number.isInteger(numericQ)) {
      qb.orWhere('p.telegramId = :numQ', { numQ: numericQ });
    }

    const rows = await qb.orderBy('p.createdAt', 'DESC').getMany();

    return rows.map(
      (p): AdminPaymentDto => ({
        paymentId: p.id,
        provider: 'yookassa',
        userId: p.userId,
        telegramId: p.telegramId,
        status: p.status,
        purpose: p.purpose,
        amount: p.amount,
        currency: p.currency,
        selectedPeriod: p.selectedPeriod,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      }),
    );
  }

  private async searchStars(q: string): Promise<AdminPaymentDto[]> {
    const qb = this.starsRepo
      .createQueryBuilder('p')
      .where('CAST(p.id AS text) = :q OR p.userId = :q', { q })
      .andWhere('p.status != :pending', { pending: 'pending' });

    const numericQ = Number(q);
    if (!isNaN(numericQ) && Number.isInteger(numericQ)) {
      qb.orWhere('p.telegramId = :numQ', { numQ: numericQ });
    }

    const rows = await qb.orderBy('p.createdAt', 'DESC').getMany();

    return rows.map(
      (p): AdminPaymentDto => ({
        paymentId: p.id,
        provider: 'telegram_stars',
        userId: p.userId,
        telegramId: p.telegramId,
        status: p.status,
        purpose: p.purpose,
        starsAmount: p.starsAmount,
        selectedPeriod: p.selectedPeriod,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      }),
    );
  }

  private async searchStripe(q: string): Promise<AdminPaymentDto[]> {
    const selectedPeriod = Number(process.env.PUBLIC_ALLOWED_PERIOD ?? 1);

    const rows = await this.stripeRepo
      .createQueryBuilder('p')
      .where('(p.id = :q OR p.userId = :q OR p.customer = :q)', { q })
      // Drop the pre-checkout placeholder rows — only settled records are shown.
      .andWhere('p.status != :pending', { pending: 'pending' })
      .orderBy('p.createdAt', 'DESC')
      .getMany();

    return rows.map(
      (p): AdminPaymentDto => ({
        paymentId: p.id,
        provider: 'stripe',
        userId: p.userId ?? '',
        telegramId: null,
        status: p.status,
        purpose: p.purpose,
        amount: p.amount != null ? String(p.amount) : undefined,
        currency: p.currency,
        selectedPeriod,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      }),
    );
  }
}
