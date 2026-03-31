import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ReferencePhoto, ReferencePhotoStatus } from '../../entities/reference-photo.entity';
import { StorageService } from '../storage/storage.service';
import { QUEUES, JOBS, QUEUE_PRIORITIES, EmbedRefJobPayload } from '@medusa/shared';

@Injectable()
export class ReferencePhotosService {
  constructor(
    @InjectRepository(ReferencePhoto)
    private readonly repo: Repository<ReferencePhoto>,
    @InjectQueue(QUEUES.EMBED_REF)
    private readonly embedRefQueue: Queue,
    private readonly storage: StorageService,
  ) {}

  async upload(userId: string, file: Express.Multer.File): Promise<ReferencePhoto> {
    const storageKey = await this.storage.upload(file.buffer, file.mimetype, 'reference-photos');

    const photo = this.repo.create({
      userId,
      storageKey,
      originalName: file.originalname,
      status: ReferencePhotoStatus.PENDING,
    });
    await this.repo.save(photo);

    const payload: EmbedRefJobPayload = {
      referencePhotoId: photo.id,
      userId,
      storageKey,
    };

    await this.embedRefQueue.add(JOBS.EMBED_REFERENCE_PHOTO, payload, {
      priority: QUEUE_PRIORITIES.HIGH,
      attempts: 3,
      backoff: { type: 'exponential', delay: 30000 },
    });

    await this.repo.update(photo.id, { status: ReferencePhotoStatus.PROCESSING });
    return photo;
  }

  async findByUser(userId: string): Promise<ReferencePhoto[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, userId: string): Promise<ReferencePhoto> {
    return this.repo.findOne({ where: { id, userId } });
  }

  async getSignedUrl(id: string, userId: string): Promise<string> {
    const photo = await this.findOne(id, userId);
    if (!photo) return null;
    return this.storage.getSignedDownloadUrl(photo.storageKey);
  }
}
