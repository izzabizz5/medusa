import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TargetUrlsService } from '../target-urls/target-urls.service';
import { QUEUES, JOBS, CrawlJobPayload } from '@medusa/shared';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue(QUEUES.CRAWL)
    private readonly crawlQueue: Queue,
    private readonly targetUrlsService: TargetUrlsService,
  ) {}

  // Every day at 1am — enqueue a crawl job for each active target URL
  @Cron('0 1 * * *')
  async scheduleDailyCrawl() {
    this.logger.log('Daily crawl scheduler running...');
    const targets = await this.targetUrlsService.findActive();

    for (const target of targets) {
      const payload: CrawlJobPayload = {
        targetUrlId: target.id,
        url: target.url,
        platform: target.platform,
      };

      await this.crawlQueue.add(JOBS.CRAWL_URL, payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      });
    }

    this.logger.log(`Enqueued ${targets.length} crawl jobs`);
  }

  // Manual trigger endpoint — called via HTTP for immediate crawl
  async triggerCrawlNow(targetUrlId?: string) {
    const targets = targetUrlId
      ? [await this.targetUrlsService.findActive().then((t) => t.find((u) => u.id === targetUrlId))]
      : await this.targetUrlsService.findActive();

    for (const target of targets.filter(Boolean)) {
      const payload: CrawlJobPayload = {
        targetUrlId: target.id,
        url: target.url,
        platform: target.platform,
      };
      await this.crawlQueue.add(JOBS.CRAWL_URL, payload, { priority: 8 });
    }

    return { enqueued: targets.filter(Boolean).length };
  }
}
