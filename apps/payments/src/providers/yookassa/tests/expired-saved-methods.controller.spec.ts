import 'reflect-metadata';
import { InterServiceGuard } from '@payments/guards/inter-service.guard';
import { ExpiredSavedMethodsController } from '@payments/providers/yookassa/autopayment/expired-saved-methods.controller';
import type {
  ExpiredSavedMethodsReport,
  ExpiredSavedMethodsService,
} from '@payments/providers/yookassa/autopayment/expired-saved-methods.service';
import { describe, expect, it } from 'vitest';

const REPORT: ExpiredSavedMethodsReport = {
  checkedUsers: 1,
  terminated: [{ userId: 2871, savedMethodId: 'sm-1' }],
  unresolvedUsers: [],
};

const controllerRecordingRuns = () => {
  const runs: { dryRun: boolean; now: Date }[] = [];
  const service = {
    terminateExpired: async (options: { dryRun: boolean; now: Date }) => {
      runs.push(options);
      return REPORT;
    },
  } as unknown as ExpiredSavedMethodsService;
  return { runs, controller: new ExpiredSavedMethodsController(service) };
};

describe('ExpiredSavedMethodsController.terminateExpired', () => {
  it('is reachable by internal services only', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      ExpiredSavedMethodsController.prototype.terminateExpired,
    );

    expect(guards).toEqual([InterServiceGuard]);
  });

  it.each([
    [undefined],
    ['true'],
    ['yes'],
    [''],
  ])('only reports, changing nothing, unless dryRun=false is asked for (dryRun=%s)', async (dryRun) => {
    const { runs, controller } = controllerRecordingRuns();

    await controller.terminateExpired(dryRun);

    expect(runs.map((run) => run.dryRun)).toEqual([true]);
  });

  it('terminates when dryRun=false, and returns the report', async () => {
    const { runs, controller } = controllerRecordingRuns();
    const before = Date.now();

    const report = await controller.terminateExpired('false');

    expect(report).toEqual(REPORT);
    expect(runs.map((run) => run.dryRun)).toEqual([false]);
    expect(runs[0]?.now.getTime()).toBeGreaterThanOrEqual(before);
    expect(runs[0]?.now.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
