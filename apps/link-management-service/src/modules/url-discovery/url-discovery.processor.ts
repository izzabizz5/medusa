import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES, JOBS } from '@medusa/shared';
import { UrlDiscoveryService, DiscoverJobPayload } from './url-discovery.service';
import { TargetUrlsService } from '../target-urls/target-urls.service';
import { UrlClassifierService } from '../url-classifier/url-classifier.service';
import { MlLabel } from '../../entities/target-url.entity';

@Processor(QUEUES.DISCOVER, { concurrency: 1 })
export class UrlDiscoveryProcessor extends WorkerHost {
  private readonly logger = new Logger(UrlDiscoveryProcessor.name);

  constructor(
    private readonly discoveryService: UrlDiscoveryService,
    private readonly targetUrlsService: TargetUrlsService,
    private readonly classifier: UrlClassifierService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === JOBS.DISCOVER_URLS) {
      await this.handleDiscovery(job.data as DiscoverJobPayload);
    } else if (job.name === JOBS.RETRAIN_CLASSIFIER) {
      await this.handleRetrain();
    }
  }

  private async handleDiscovery(data: DiscoverJobPayload) {
    this.logger.log(`Discovery job: source=${data.source} value="${data.value}"`);

    let result;
    if (data.source === 'search_query') {
      result = await this.discoveryService.discoverFromSearchQuery(data.value);
    } else if (data.source === 'seed_url') {
      result = await this.discoveryService.discoverFromSeedUrl(data.value);
    } else {
      result = await this.discoveryService.discoverFromKnownDomains();
    }

    this.logger.log(
      `Discovery complete: autoAdded=${result.autoAdded} pendingReview=${result.pendingReview} discarded=${result.discarded}`,
    );
  }

  private async handleRetrain() {
    this.logger.log('Retraining URL classifier...');

    // Build training data from all labeled URLs in the DB
    const labeled = await this.targetUrlsService.findLabeledForTraining();

    if (!labeled.length) {
      this.logger.log('No labeled examples yet — skipping retrain');
      return;
    }

    const examples = labeled.map((t) => ({
      url: t.url,
      is_good: t.mlLabel === MlLabel.POSITIVE,
    }));

    const result = await this.classifier.retrain(examples);
    this.logger.log(`Retrain result: ${result.message}`);

    // After training, re-score all unlabeled URLs
    await this.rescoreUnlabeledUrls();
  }

  private async rescoreUnlabeledUrls() {
    const unlabeled = await this.targetUrlsService.findUnscored();
    if (!unlabeled.length) return;

    this.logger.log(`Re-scoring ${unlabeled.length} unscored URLs...`);
    const urls = unlabeled.map((t) => t.url);
    const scores = await this.classifier.classifyBatch(urls);

    for (const { url, score } of scores) {
      const target = unlabeled.find((t) => t.url === url);
      if (target) {
        await this.targetUrlsService.updateMlScore(target.id, score);
      }
    }
  }
}
