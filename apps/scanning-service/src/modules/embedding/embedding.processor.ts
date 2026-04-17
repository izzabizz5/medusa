import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Job } from 'bullmq';
import { FaceEmbedding, EmbeddingSourceType } from '../../entities/face-embedding.entity';
import { FoundImage, ScanStatus } from '../../entities/found-image.entity';
import { ReferencePhoto, ReferencePhotoStatus } from '../../entities/reference-photo.entity';
import { PythonBridgeService } from '../python-bridge/python-bridge.service';
import { QUEUES, JOBS, ScanJobPayload, EmbedRefJobPayload } from '@medusa/shared';

@Processor(QUEUES.SCAN, { concurrency: 4 })
export class ScanProcessor extends WorkerHost {
  private readonly logger = new Logger(ScanProcessor.name);

  constructor(
    @InjectRepository(FaceEmbedding)
    private readonly embeddingRepo: Repository<FaceEmbedding>,
    @InjectRepository(FoundImage)
    private readonly foundImageRepo: Repository<FoundImage>,
    private readonly pythonBridge: PythonBridgeService,
  ) {
    super();
  }

  async process(job: Job<ScanJobPayload>) {
    const { foundImageId, imageUrl, storageKey } = job.data;

    // Skip if already processed (handles retries, restarts, duplicate queue entries)
    const existing = await this.foundImageRepo.findOne({ where: { id: foundImageId } });
    if (!existing) {
      this.logger.warn(`Found image ${foundImageId} no longer exists, skipping`);
      return;
    }
    if (existing.scanStatus === ScanStatus.EMBEDDED || existing.scanStatus === ScanStatus.NO_FACE) {
      this.logger.log(`Skipping already-processed image ${foundImageId} (${existing.scanStatus})`);
      return;
    }

    this.logger.log(`Scanning found image ${foundImageId}`);
    await this.foundImageRepo.update(foundImageId, { scanStatus: ScanStatus.SCANNING });

    try {
      const result = await this.pythonBridge.embedImage(storageKey, imageUrl);

      await this.foundImageRepo.update(foundImageId, { hasFace: result.hasFace });

      if (!result.hasFace || !result.vector?.length) {
        await this.foundImageRepo.update(foundImageId, { scanStatus: ScanStatus.NO_FACE });
        return;
      }

      // Check if embedding already exists for this image (dedup)
      const existingEmb = await this.embeddingRepo.findOne({
        where: { sourceType: EmbeddingSourceType.FOUND, sourceId: foundImageId },
      });
      if (existingEmb) {
        await this.foundImageRepo.update(foundImageId, {
          scanStatus: ScanStatus.EMBEDDED,
          embeddingId: existingEmb.id,
          hasFace: true,
        });
        this.logger.log(`Embedding already exists for ${foundImageId}, linked`);
        return;
      }

      const embedding = await this.embeddingRepo.save(
        this.embeddingRepo.create({
          sourceType: EmbeddingSourceType.FOUND,
          sourceId: foundImageId,
          modelName: result.modelName,
          vector: result.vector,
        }),
      );

      await this.foundImageRepo.update(foundImageId, {
        scanStatus: ScanStatus.EMBEDDED,
        embeddingId: embedding.id,
        hasFace: true,
      });

      this.logger.log(`Embedded found image ${foundImageId} (${result.faceCount} face(s))`);
    } catch (err) {
      await this.foundImageRepo.update(foundImageId, { scanStatus: ScanStatus.FAILED });
      this.logger.error(`Scan failed for ${foundImageId}: ${err.message}`);
      throw err;
    }
  }
}

@Processor(QUEUES.EMBED_REF, { concurrency: 2 })
export class EmbedRefProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbedRefProcessor.name);

  constructor(
    @InjectRepository(FaceEmbedding)
    private readonly embeddingRepo: Repository<FaceEmbedding>,
    @InjectRepository(ReferencePhoto)
    private readonly referencePhotoRepo: Repository<ReferencePhoto>,
    private readonly pythonBridge: PythonBridgeService,
  ) {
    super();
  }

  async process(job: Job<EmbedRefJobPayload>) {
    const { referencePhotoId, userId, storageKey } = job.data;

    // Skip if already embedded
    const existing = await this.referencePhotoRepo.findOne({ where: { id: referencePhotoId } });
    if (!existing) return;
    if (existing.status === ReferencePhotoStatus.EMBEDDED) {
      this.logger.log(`Skipping already-embedded ref photo ${referencePhotoId}`);
      return;
    }

    this.logger.log(`Embedding reference photo ${referencePhotoId} for user ${userId}`);

    try {
      const result = await this.pythonBridge.embedImage(storageKey);

      if (!result.hasFace || !result.vector?.length) {
        await this.referencePhotoRepo.update(referencePhotoId, {
          status: ReferencePhotoStatus.FAILED,
        });
        this.logger.warn(`No face detected in reference photo ${referencePhotoId}`);
        return;
      }

      const embedding = await this.embeddingRepo.save(
        this.embeddingRepo.create({
          sourceType: EmbeddingSourceType.REFERENCE,
          sourceId: referencePhotoId,
          modelName: result.modelName,
          vector: result.vector,
        }),
      );

      await this.referencePhotoRepo.update(referencePhotoId, {
        status: ReferencePhotoStatus.EMBEDDED,
        embeddingId: embedding.id,
      });

      this.logger.log(`Reference photo ${referencePhotoId} embedded successfully`);
    } catch (err) {
      await this.referencePhotoRepo.update(referencePhotoId, {
        status: ReferencePhotoStatus.FAILED,
      });
      this.logger.error(`Embed ref failed for ${referencePhotoId}: ${err.message}`);
      throw err;
    }
  }
}
