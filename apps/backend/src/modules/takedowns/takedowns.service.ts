import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  TakedownRequest,
  TakedownEvent,
  TakedownStatus,
  TakedownType,
} from '../../entities/takedown-request.entity';
import { FoundImage } from '../../entities/found-image.entity';
import { QUEUES, JOBS, TakedownJobPayload } from '@medusa/shared';

@Injectable()
export class TakedownsService {
  constructor(
    @InjectRepository(TakedownRequest)
    private readonly takedownRepo: Repository<TakedownRequest>,
    @InjectRepository(TakedownEvent)
    private readonly eventRepo: Repository<TakedownEvent>,
    @InjectRepository(FoundImage)
    private readonly foundImageRepo: Repository<FoundImage>,
    @InjectQueue(QUEUES.TAKEDOWN)
    private readonly takedownQueue: Queue,
  ) {}

  async findAll(filters: { status?: TakedownStatus; userId?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.userId) where.userId = filters.userId;
    return this.takedownRepo.find({
      where,
      relations: ['match', 'match.foundImage', 'user', 'events'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string) {
    return this.findAll({ userId });
  }

  // Admin: approve and file the takedown
  async approve(id: string, adminId: string, notes?: string): Promise<TakedownRequest> {
    const takedown = await this.takedownRepo.findOne({
      where: { id },
      relations: ['match', 'match.foundImage'],
    });
    if (!takedown) throw new NotFoundException('Takedown request not found');

    takedown.status = TakedownStatus.APPROVED;
    takedown.adminNotes = notes;
    await this.takedownRepo.save(takedown);

    await this.eventRepo.save(
      this.eventRepo.create({
        takedownRequestId: takedown.id,
        eventType: 'admin_approved',
        notes,
        createdBy: adminId,
      }),
    );

    // Enqueue the filing job
    const payload: TakedownJobPayload = {
      takedownRequestId: takedown.id,
      matchId: takedown.matchId,
      type: takedown.type,
      platform: takedown.platform,
      userId: takedown.userId,
    };

    const jobName =
      takedown.type === TakedownType.DMCA ? JOBS.FILE_DMCA_NOTICE : JOBS.FILE_PLATFORM_TAKEDOWN;

    await this.takedownQueue.add(jobName, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
    });

    return takedown;
  }

  async reject(id: string, adminId: string, notes?: string): Promise<TakedownRequest> {
    const takedown = await this.takedownRepo.findOne({ where: { id } });
    if (!takedown) throw new NotFoundException('Takedown request not found');

    takedown.status = TakedownStatus.REJECTED;
    takedown.adminNotes = notes;
    await this.takedownRepo.save(takedown);

    await this.eventRepo.save(
      this.eventRepo.create({
        takedownRequestId: takedown.id,
        eventType: 'admin_rejected',
        notes,
        createdBy: adminId,
      }),
    );

    return takedown;
  }
}
