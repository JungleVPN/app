import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TelegramStarsPayment, YookassaPayment } from '@workspace/database';
import type { AdminPaymentDto } from '@workspace/types';
import { Repository } from 'typeorm';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(YookassaPayment)
    private readonly yookassaRepo: Repository<YookassaPayment>,
    @InjectRepository(TelegramStarsPayment)
    private readonly starsRepo: Repository<TelegramStarsPayment>,
  ) {}

  async search(q: string): Promise<AdminPaymentDto[]> {
    const [yookassaResults, starsResults] = await Promise.all([
      this.searchYookassa(q),
      this.searchStars(q),
    ]);

    const results = [...yookassaResults, ...starsResults];

    // Sort newest first
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return results;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async searchYookassa(q: string): Promise<AdminPaymentDto[]> {
    const qb = this.yookassaRepo.createQueryBuilder('p');

    // Match on paymentId or userId
    qb.where('p.id = :q OR p.userId = :q', { q });

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
        amount: p.amount,
        currency: p.currency,
        selectedPeriod: p.selectedPeriod,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      }),
    );
  }

  private async searchStars(q: string): Promise<AdminPaymentDto[]> {
    // Stars payments only have id (uuid) and userId (varchar).
    // Cast the uuid column to text so PostgreSQL accepts a plain varchar parameter.
    const rows = await this.starsRepo
      .createQueryBuilder('p')
      .where('CAST(p.id AS text) = :q OR p.userId = :q', { q })
      .orderBy('p.createdAt', 'DESC')
      .getMany();

    return rows.map(
      (p): AdminPaymentDto => ({
        paymentId: p.id,
        provider: 'telegram_stars',
        userId: p.userId,
        status: p.status,
        starsAmount: p.starsAmount,
        selectedPeriod: p.selectedPeriod,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      }),
    );
  }
}
