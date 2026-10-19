import { Module } from '@nestjs/common';
import { AdminModule } from '@payments/admin/admin.module';
import { AnalyticsClientModule } from '@payments/analytics/analytics-client.module';
import { AD_CONVERSION_UPLOADERS, type AdConversionUploader } from './ad-conversion-uploader';
import { AdConversionsService } from './ad-conversions.service';

@Module({
  imports: [AdminModule, AnalyticsClientModule],
  providers: [
    // The Google Ads and Microsoft Ads uploaders join this list once their clients exist.
    { provide: AD_CONVERSION_UPLOADERS, useFactory: (): AdConversionUploader[] => [] },
    AdConversionsService,
  ],
  exports: [AdConversionsService],
})
export class AdConversionsModule {}
