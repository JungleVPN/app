import 'reflect-metadata';
import { AutopaymentController } from '@payments/providers/yookassa/autopayment/autopayment.controller';
import { AutopaymentModule } from '@payments/providers/yookassa/autopayment/autopayment.module';
import { AutopaymentService } from '@payments/providers/yookassa/autopayment/autopayment.service';
import { YooKassaConnector } from '@payments/providers/yookassa/helpers/yookassa.connector';
import { YookassaController } from '@payments/providers/yookassa/yookassa.controller';
import { YookassaModule } from '@payments/providers/yookassa/yookassa.module';
import { YooKassaProvider } from '@payments/providers/yookassa/yookassa.provider';
import { YookassaService } from '@payments/providers/yookassa/yookassa.service';
import { PaymentsUtils } from '@payments/utils/utils';
import { describe, expect, it } from 'vitest';

const metadata = (key: string, target: unknown): unknown[] =>
  (Reflect.getMetadata(key, target as object) as unknown[]) ?? [];

describe('YookassaModule', () => {
  it('exposes the Yookassa HTTP surface', () => {
    expect(metadata('controllers', YookassaModule)).toEqual([YookassaController]);
  });

  it('registers the transport chain the service depends on', () => {
    expect(metadata('providers', YookassaModule)).toEqual(
      expect.arrayContaining([YooKassaConnector, YooKassaProvider, YookassaService, PaymentsUtils]),
    );
  });

  // Other modules charge and read payments through these two; the connector
  // stays private so transport concerns cannot leak across module boundaries.
  it('exports the provider and service, but not the connector', () => {
    const exports = metadata('exports', YookassaModule);

    expect(exports).toEqual([YooKassaProvider, YookassaService]);
    expect(exports).not.toContain(YooKassaConnector);
  });

  it('imports the collaborating modules the service injects from', () => {
    expect(metadata('imports', YookassaModule).length).toBeGreaterThan(0);
  });
});

describe('AutopaymentModule', () => {
  it('exposes the remnawave event endpoint', () => {
    expect(metadata('controllers', AutopaymentModule)).toEqual([AutopaymentController]);
  });

  // Autopayment charges a saved method directly, so it needs its own copy of
  // the YooKassa transport chain rather than importing YookassaModule.
  it('registers its own YooKassa transport chain', () => {
    expect(metadata('providers', AutopaymentModule)).toEqual(
      expect.arrayContaining([YooKassaConnector, YooKassaProvider, AutopaymentService]),
    );
  });

  it('exports only the autopayment service', () => {
    expect(metadata('exports', AutopaymentModule)).toEqual([AutopaymentService]);
  });

  it('imports the collaborating modules the service injects from', () => {
    expect(metadata('imports', AutopaymentModule).length).toBeGreaterThan(0);
  });
});
