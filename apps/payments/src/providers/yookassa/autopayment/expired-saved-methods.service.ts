import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RemnaUserResolverService } from '@payments/auth/remna-user-resolver.service';
import { SavedPaymentMethod } from '@workspace/database';
import { Repository } from 'typeorm';

export type ExpiredSavedMethodsReport = {
  checkedUsers: number;
  terminated: { userId: number; savedMethodId: string }[];
  /** Users the panel failed to answer for, or does not know; their methods are kept. */
  unresolvedUsers: number[];
};

/**
 * Terminates saved YooKassa methods whose user's access has already ended.
 *
 * The `user.expired` webhook does this as it happens, but it is delivered
 * once: a user who expired before that handler shipped, or whose event was
 * lost, keeps a method that is shown as an active subscription. This sweeps
 * those up, asking the panel for each user's expiry since we store none.
 */
@Injectable()
export class ExpiredSavedMethodsService {
  private readonly logger = new Logger(ExpiredSavedMethodsService.name);

  constructor(
    @InjectRepository(SavedPaymentMethod)
    private readonly savedMethodRepo: Repository<SavedPaymentMethod>,
    private readonly remnaUserResolver: RemnaUserResolverService,
  ) {}

  async terminateExpired(options: {
    dryRun: boolean;
    now: Date;
  }): Promise<ExpiredSavedMethodsReport> {
    const { dryRun, now } = options;
    const methods = await this.savedMethodRepo.find({
      where: { provider: 'yookassa', isActive: true },
    });
    const userIds = [...new Set(methods.map((method) => method.userId))];

    const report: ExpiredSavedMethodsReport = {
      checkedUsers: userIds.length,
      terminated: [],
      unresolvedUsers: [],
    };

    // One user at a time, so a sweep over every subscriber does not flood the panel.
    for (const userId of userIds) {
      const expiry = await this.expiryOf(userId);
      if (expiry === null) {
        report.unresolvedUsers.push(userId);
        continue;
      }
      if (expiry > now) continue;

      for (const method of methods.filter((candidate) => candidate.userId === userId)) {
        if (!dryRun) {
          await this.savedMethodRepo.update(
            { id: method.id, isActive: true },
            { isActive: false, status: 'terminated' },
          );
        }
        report.terminated.push({ userId, savedMethodId: method.id });
      }
    }

    this.logger.log(
      `${dryRun ? '[dry run] ' : ''}Checked ${report.checkedUsers} users, terminated ${report.terminated.length} saved methods, ${report.unresolvedUsers.length} unresolved`,
    );
    return report;
  }

  private async expiryOf(userId: number): Promise<Date | null> {
    try {
      return await this.remnaUserResolver.getExpiry(userId);
    } catch (err) {
      this.logger.warn(`Could not read expiry of user ${userId}: ${String(err)}`);
      return null;
    }
  }
}
