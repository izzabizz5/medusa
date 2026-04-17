import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { CrawlRun, CrawlRunStatus } from '../../../entities/crawl-run.entity';
import { FoundImage, ScanStatus } from '../../../entities/found-image.entity';
import { TargetUrl } from '../../../entities/target-url.entity';
import { RedditStrategy } from '../strategies/reddit.strategy';
import { GenericStrategy } from '../strategies/generic.strategy';
import { DedupService } from '../../dedup/dedup.service';
import { QUEUES, JOBS, CrawlJobPayload, ScanJobPayload, hashImageUrl } from '@medusa/shared';
import { randomUUID } from 'crypto';

@Processor(QUEUES.CRAWL, { concurrency: 3 })
export class CrawlProcessor extends WorkerHost {
  private readonly logger = new Logger(CrawlProcessor.name);
  private readonly s3: S3Client;

  constructor(
    @InjectRepository(CrawlRun)
    private readonly crawlRunRepo: Repository<CrawlRun>,
    @InjectRepository(FoundImage)
    private readonly foundImageRepo: Repository<FoundImage>,
    @InjectRepository(TargetUrl)
    private readonly targetUrlRepo: Repository<TargetUrl>,
    @InjectQueue(QUEUES.SCAN)
    private readonly scanQueue: Queue,
    private readonly redditStrategy: RedditStrategy,
    private readonly genericStrategy: GenericStrategy,
    private readonly dedupService: DedupService,
    private readonly config: ConfigService,
  ) {
    super();
    this.s3 = new S3Client({
      endpoint: config.get('OBJECT_STORAGE_ENDPOINT'),
      region: config.get('OBJECT_STORAGE_REGION', 'us-ashburn-1'),
      credentials: {
        accessKeyId: config.get('OBJECT_STORAGE_ACCESS_KEY', ''),
        secretAccessKey: config.get('OBJECT_STORAGE_SECRET_KEY', ''),
      },
      forcePathStyle: true,
    });
  }

  async process(job: Job<CrawlJobPayload>) {
    const { targetUrlId, url, platform } = job.data;
    this.logger.log(`Processing crawl job for ${url} (${platform})`);

    const crawlRun = await this.crawlRunRepo.save(
      this.crawlRunRepo.create({ targetUrlId, status: CrawlRunStatus.RUNNING }),
    );

    try {
      // Choose strategy based on platform
      const rawImages = platform === 'reddit'
        ? await this.redditStrategy.crawl(url)
        : await this.genericStrategy.crawl(url);

      crawlRun.imagesFound = rawImages.length;

      // Dedup check in batch
      const knownHashes = await this.dedupService.getKnownIds(rawImages.map((i) => i.imageUrl));

      let newCount = 0;
      const delay = parseInt(this.config.get('CRAWL_DELAY_MS', '2000'));

      for (const rawImage of rawImages) {
        const urlHash = hashImageUrl(rawImage.imageUrl);
        if (knownHashes.has(urlHash)) continue;

        // Download image and store
        let storageKey: string | null = null;
        try {
          storageKey = await this.downloadAndStore(rawImage.imageUrl);
        } catch (err) {
          this.logger.warn(`Failed to download ${rawImage.imageUrl}: ${err.message}`);
        }

        const foundImage = await this.foundImageRepo.save(
          this.foundImageRepo.create({
            crawlRunId: crawlRun.id,
            targetUrlId,
            imageUrl: rawImage.imageUrl,
            pageUrl: rawImage.pageUrl,
            storageKey,
            urlHash,
            scanStatus: ScanStatus.PENDING,
          }),
        );

        // Enqueue for facial recognition
        const scanPayload: ScanJobPayload = {
          foundImageId: foundImage.id,
          imageUrl: rawImage.imageUrl,
          storageKey,
        };
        await this.scanQueue.add(JOBS.SCAN_IMAGE, scanPayload, {
          attempts: 2,
          backoff: { type: 'fixed', delay: 30000 },
        });

        newCount++;
        await this.sleep(delay);
      }

      crawlRun.imagesNew = newCount;
      crawlRun.status = CrawlRunStatus.COMPLETED;
      crawlRun.completedAt = new Date();
      await this.crawlRunRepo.save(crawlRun);

      // Update lastCrawledAt on target URL
      await this.targetUrlRepo.update(targetUrlId, { lastCrawledAt: new Date() });

      this.logger.log(`Crawl complete: ${newCount} new images from ${rawImages.length} found`);
    } catch (err) {
      crawlRun.status = CrawlRunStatus.FAILED;
      crawlRun.errorMessage = err.message;
      crawlRun.completedAt = new Date();
      await this.crawlRunRepo.save(crawlRun);
      this.logger.error(`Crawl failed for ${url}: ${err.message}`);
      throw err;
    }
  }

  private async downloadAndStore(imageUrl: string): Promise<string> {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MedusaBot/1.0)',
      },
      maxContentLength: 20 * 1024 * 1024, // 20MB max
    });

    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
    const key = `found-images/${randomUUID()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.config.get('OBJECT_STORAGE_BUCKET', 'medusa-files'),
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return key;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
