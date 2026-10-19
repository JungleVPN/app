import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminModule } from '@payments/admin/admin.module';
import { AnalyticsClientModule } from '@payments/analytics/analytics-client.module';
import { AD_CONVERSION_UPLOADERS } from './ad-conversion-uploader';
import { adConversionUploaders } from './ad-conversion-uploaders';
import { AdConversionsService } from './ad-conversions.service';

@Module({
  imports: [AdminModule, AnalyticsClientModule],
  providers: [
    {
      provide: AD_CONVERSION_UPLOADERS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        adConversionUploaders(config, new Logger('AdConversionsModule')),
    },
    AdConversionsService,
  ],
  exports: [AdConversionsService],
})
export class AdConversionsModule {}
