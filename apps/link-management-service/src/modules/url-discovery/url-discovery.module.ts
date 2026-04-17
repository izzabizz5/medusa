import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@medusa/shared';
import { UrlDiscoveryService } from './url-discovery.service';
import { UrlDiscoveryProcessor } from './url-discovery.processor';
import { UrlClassifierModule } from '../url-classifier/url-classifier.module';
import { TargetUrlsModule } from '../target-urls/target-urls.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.DISCOVER }),
    UrlClassifierModule,
    TargetUrlsModule,
  ],
  providers: [UrlDiscoveryService, UrlDiscoveryProcessor],
  exports: [UrlDiscoveryService],
})
export class UrlDiscoveryModule {}
