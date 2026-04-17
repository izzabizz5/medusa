import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
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

@Processor(QUEUES.CRAWL, { concurrency: 6 })
export class CrawlProcessor extends WorkerHost {
  private readonly logger = new Logger(CrawlProcessor.name);
  private readonly s3: S3Client | null;
  private readonly localMode: boolean;
  private readonly uploadsDir: string;

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

    const accessKey = config.get('OBJECT_STORAGE_ACCESS_KEY', '');
    const secretKey = config.get('OBJECT_STORAGE_SECRET_KEY', '');
    this.localMode = !accessKey || accessKey === 'your-access-key' || !secretKey || secretKey === 'your-secret-key';

    if (this.localMode) {
      this.s3 = null;
      this.uploadsDir = path.resolve(process.cwd(), 'uploads', 'found-images');
      if (!fs.existsSync(this.uploadsDir)) fs.mkdirSync(this.uploadsDir, { recursive: true });
      this.logger.log('Running in local storage mode (no S3)');
    } else {
      this.uploadsDir = '';
      this.s3 = new S3Client({
        endpoint: config.get('OBJECT_STORAGE_ENDPOINT'),
        region: config.get('OBJECT_STORAGE_REGION', 'us-ashburn-1'),
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        forcePathStyle: true,
      });
    }
  }

  async process(job: Job<CrawlJobPayload>) {
    const { targetUrlId, url, platform } = job.data;
    this.logger.log(`Processing crawl job for ${url} (${platform})`);

    const crawlRun = await this.crawlRunRepo.save(
      this.crawlRunRepo.create({ targetUrlId, status: CrawlRunStatus.RUNNING }),
    );

    try {
      const rawImages = platform === 'reddit'
        ? await this.redditStrategy.crawl(url)
        : await this.genericStrategy.crawl(url);

      crawlRun.imagesFound = rawImages.length;

      // Dedup check in batch
      const knownHashes = await this.dedupService.getKnownIds(rawImages.map((i) => i.imageUrl));
      const newImages = rawImages.filter((i) => !knownHashes.has(hashImageUrl(i.imageUrl)));

      // Download + store in parallel (batches of 10)
      const batchSize = 10;
      let newCount = 0;

      for (let i = 0; i < newImages.length; i += batchSize) {
        const batch = newImages.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (rawImage) => {
            const urlHash = hashImageUrl(rawImage.imageUrl);
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

            const scanPayload: ScanJobPayload = {
              foundImageId: foundImage.id,
              imageUrl: rawImage.imageUrl,
              storageKey,
            };
            await this.scanQueue.add(JOBS.SCAN_IMAGE, scanPayload, {
              attempts: 2,
              backoff: { type: 'fixed', delay: 30000 },
            });

            return foundImage;
          }),
        );

        newCount += results.filter((r) => r.status === 'fulfilled').length;

        const delay = parseInt(this.config.get('CRAWL_DELAY_MS', '0'));
        if (delay > 0) await this.sleep(delay);
      }

      crawlRun.imagesNew = newCount;
      crawlRun.status = CrawlRunStatus.COMPLETED;
      crawlRun.completedAt = new Date();
      await this.crawlRunRepo.save(crawlRun);

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
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MedusaBot/1.0)' },
      maxContentLength: 20 * 1024 * 1024,
    });

    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
    const key = `found-images/${randomUUID()}.${ext}`;

    if (this.localMode) {
      const filename = key.split('/').pop()!;
      fs.writeFileSync(path.join(this.uploadsDir, filename), buffer);
    } else {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: this.config.get('OBJECT_STORAGE_BUCKET', 'medusa-files'),
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    }

    return key;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
