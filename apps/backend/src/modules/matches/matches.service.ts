import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match, MatchStatus } from '../../entities/match.entity';
import {
  TakedownRequest,
  TakedownEvent,
  TakedownStatus,
  TakedownType,
} from '../../entities/takedown-request.entity';
import { FoundImage } from '../../entities/found-image.entity';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(TakedownRequest)
    private readonly takedownRepo: Repository<TakedownRequest>,
    @InjectRepository(TakedownEvent)
    private readonly eventRepo: Repository<TakedownEvent>,
    @InjectRepository(FoundImage)
    private readonly foundImageRepo: Repository<FoundImage>,
    private readonly storage: StorageService,
  ) {}

  async findByUser(userId: string, status?: MatchStatus) {
    const where: any = { userId };
    if (status) where.status = status;
    const matches = await this.matchRepo.find({
      where,
      relations: ['referencePhoto', 'foundImage'],
      order: { createdAt: 'DESC' },
    });

    // Attach signed URLs for both images
    return Promise.all(
      matches.map(async (match) => {
        const refUrl = await this.storage.getSignedDownloadUrl(match.referencePhoto.storageKey);
        const foundUrl = match.foundImage.storageKey
          ? await this.storage.getSignedDownloadUrl(match.foundImage.storageKey)
          : match.foundImage.imageUrl;
        return { ...match, refImageUrl: refUrl, foundImageUrl: foundUrl };
      }),
    );
  }

  async confirm(id: string, userId: string): Promise<Match> {
    const match = await this.matchRepo.findOne({ where: { id, userId } });
    if (!match) throw new NotFoundException('Match not found');
    if (match.status !== MatchStatus.PENDING_REVIEW) {
      throw new BadRequestException('Match is not in pending_review state');
    }
    match.status = MatchStatus.CONFIRMED;
    match.reviewedAt = new Date();
    return this.matchRepo.save(match);
  }

  async reject(id: string, userId: string): Promise<Match> {
    const match = await this.matchRepo.findOne({ where: { id, userId } });
    if (!match) throw new NotFoundException('Match not found');
    if (match.status !== MatchStatus.PENDING_REVIEW) {
      throw new BadRequestException('Match is not in pending_review state');
    }
    match.status = MatchStatus.REJECTED;
    match.reviewedAt = new Date();
    return this.matchRepo.save(match);
  }

  async requestTakedown(
    matchId: string,
    userId: string,
    type: TakedownType,
  ): Promise<TakedownRequest> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId, userId },
      relations: ['foundImage', 'foundImage.targetUrl'],
    });
    if (!match) throw new NotFoundException('Match not found');
    if (match.status !== MatchStatus.CONFIRMED) {
      throw new BadRequestException('You must confirm the match before requesting a takedown');
    }

    const existing = await this.takedownRepo.findOne({ where: { matchId, type } });
    if (existing) throw new BadRequestException('Takedown request already exists for this match');

    const takedown = this.takedownRepo.create({
      matchId,
      userId,
      type,
      platform: match.foundImage?.targetUrl?.platform,
      status: TakedownStatus.PENDING_ADMIN_REVIEW,
    });
    await this.takedownRepo.save(takedown);

    await this.eventRepo.save(
      this.eventRepo.create({
        takedownRequestId: takedown.id,
        eventType: 'created',
        notes: `User requested ${type} takedown`,
        createdBy: userId,
      }),
    );

    await this.matchRepo.update(matchId, { status: MatchStatus.TAKEDOWN_REQUESTED });

    return takedown;
  }
}
