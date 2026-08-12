import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { FxRate, ToltReferral } from '@workspace/database';
import { Repository } from 'typeorm';
import { FX_SOURCES, FxRateService, type RateSource } from './fx-rate.service';
import { defaultRateSources } from './fx-rate.sources';
import { TOLT_CONFIG, ToltClient, type ToltClientConfig } from './tolt.client';
import { ToltController } from './tolt.controller';
import { ToltService } from './tolt.service';

const DEFAULT_BASE_URL = 'https://api.tolt.com';

/**
 * Reads the Tolt transport config from the environment.
 *
 * A missing key is warned about rather than thrown on: affiliate reporting is
 * an enrichment, and the payments service must still boot and take money
 * without it. Every Tolt call then fails auth and is swallowed by `ToltService`,
 * so this warning is the only signal that attribution is silently off.
 */
export function toltConfigFactory(
  config: ConfigService,
  logger: Pick<Logger, 'warn'> = new Logger('ToltModule'),
): ToltClientConfig {
  const apiKey = config.get<string>('TOLT_API_KEY') ?? '';
  if (!apiKey) {
    logger.warn('TOLT_API_KEY is not set — affiliate conversions will not be reported');
  }

  return {
    apiKey,
    baseUrl: config.get<string>('TOLT_API_BASE_URL') || DEFAULT_BASE_URL,
  };
}

@Module({
  imports: [TypeOrmModule.forFeature([ToltReferral, FxRate])],
  controllers: [ToltController],
  providers: [
    { provide: TOLT_CONFIG, inject: [ConfigService], useFactory: toltConfigFactory },
    { provide: FX_SOURCES, useFactory: defaultRateSources },
    {
      provide: ToltClient,
      inject: [TOLT_CONFIG],
      // fetch and the backoff timer stay at their defaults here; tests construct
      // the client directly rather than reaching through the container.
      useFactory: (config: ToltClientConfig) => new ToltClient(config),
    },
    {
      provide: FxRateService,
      inject: [getRepositoryToken(FxRate), FX_SOURCES],
      useFactory: (repository: Repository<FxRate>, sources: RateSource[]) =>
        new FxRateService(repository, sources),
    },
    ToltService,
  ],
  exports: [ToltService],
})
export class ToltModule {}
