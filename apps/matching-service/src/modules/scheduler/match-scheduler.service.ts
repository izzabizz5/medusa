import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOBS, MatchBatchJobPayload } from '@medusa/shared';

@Injectable()
export class MatchSchedulerService {
  private readonly logger = new Logger(MatchSchedulerService.name);

  constructor(
    @InjectQueue(QUEUES.MATCH)
    private readonly matchQueue: Queue,
  ) {}

  // Every day at 3am
  @Cron('0 3 * * *')
  async scheduleDailyMatchBatch() {
    const batchDate = new Date().toISOString().split('T')[0];
    this.logger.log(`Scheduling daily match batch for ${batchDate}`);

    const payload: MatchBatchJobPayload = { batchDate };

    await this.matchQueue.add(JOBS.RUN_MATCH_BATCH, payload, {
      attempts: 1,
      removeOnComplete: { count: 30 },
    });
  }

  async triggerNow(userIdFilter?: string) {
    const batchDate = new Date().toISOString().split('T')[0];
    const payload: MatchBatchJobPayload = { batchDate, userIdFilter };
    await this.matchQueue.add(JOBS.RUN_MATCH_BATCH, payload, { priority: 8 });
    return { enqueued: true, batchDate };
  }
}
