import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TargetUrlsController } from './target-urls.controller';
import { TargetUrlsService } from './target-urls.service';
import { TargetUrl } from '../../entities/target-url.entity';
import { UrlClassifierModule } from '../url-classifier/url-classifier.module';
import { QUEUES } from '@medusa/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([TargetUrl]),
    BullModule.registerQueue({ name: QUEUES.DISCOVER }),
    UrlClassifierModule,
  ],
  controllers: [TargetUrlsController],
  providers: [TargetUrlsService],
  exports: [TargetUrlsService],
})
export class TargetUrlsModule {}
