import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { TargetUrlsService } from '../target-urls/target-urls.service';
import { QUEUES, JOBS, CrawlJobPayload } from '@medusa/shared';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue(QUEUES.CRAWL)
    private readonly crawlQueue: Queue,
    @InjectQueue(QUEUES.DISCOVER)
    private readonly discoverQueue: Queue,
    private readonly targetUrlsService: TargetUrlsService,
    private readonly config: ConfigService,
  ) {}

  // 1am: enqueue crawl jobs for every active target URL
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

  // 2:30am: web URL discovery from known domains + configured search terms
  @Cron('30 2 * * *')
  async scheduleDailyDiscovery() {
    this.logger.log('Daily URL discovery running...');

    // Auto-label URLs based on crawl outcomes before discovery
    const labeled = await this.targetUrlsService.autoLabelFromCrawlOutcomes();
    this.logger.log(`Auto-labeled from crawl outcomes: ${labeled.positive} positive, ${labeled.negative} negative`);

    // Discover from links in existing active pages
    await this.discoverQueue.add(
      JOBS.DISCOVER_URLS,
      { source: 'known_domains', value: '' },
      { attempts: 2, removeOnComplete: { count: 30 } },
    );

    // Discover from configured search queries
    const searchTerms = this.getDiscoverySearchTerms();
    for (const term of searchTerms) {
      await this.discoverQueue.add(
        JOBS.DISCOVER_URLS,
        { source: 'search_query', value: term },
        { attempts: 2, removeOnComplete: { count: 30 } },
      );
    }

    this.logger.log(`Queued discovery for known_domains + ${searchTerms.length} search terms`);
  }

  // 4am: retrain classifier with all labeled data (runs after crawl outcomes are updated)
  @Cron('0 4 * * *')
  async scheduleDailyRetrain() {
    this.logger.log('Daily classifier retrain running...');
    await this.discoverQueue.add(
      JOBS.RETRAIN_CLASSIFIER,
      {},
      { priority: 5, attempts: 2, removeOnComplete: { count: 10 } },
    );
  }

  // Manual trigger for immediate crawl
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

  private getDiscoverySearchTerms(): string[] {
    const raw = this.config.get<string>('DISCOVERY_SEARCH_TERMS', '');
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
