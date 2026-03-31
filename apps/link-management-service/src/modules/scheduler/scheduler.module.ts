import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerService } from './scheduler.service';
import { TargetUrlsModule } from '../target-urls/target-urls.module';
import { QUEUES } from '@medusa/shared';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: QUEUES.CRAWL }),
    TargetUrlsModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
