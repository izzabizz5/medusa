import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MatcherService } from './matcher.service';
import { QUEUES, MatchBatchJobPayload } from '@medusa/shared';

@Processor(QUEUES.MATCH, { concurrency: 1 })
export class MatcherProcessor extends WorkerHost {
  private readonly logger = new Logger(MatcherProcessor.name);

  constructor(private readonly matcherService: MatcherService) {
    super();
  }

  async process(job: Job<MatchBatchJobPayload>) {
    const { batchDate, userIdFilter } = job.data;
    this.logger.log(`Match batch job started: date=${batchDate}, user=${userIdFilter || 'all'}`);

    const result = await this.matcherService.runBatch(batchDate, userIdFilter);

    this.logger.log(`Match batch done: ${result.matches} matches, ${result.comparisons} comparisons`);
    return result;
  }
}
