import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaceEmbedding, EmbeddingSourceType } from '../../entities/face-embedding.entity';
import { Match, MatchStatus } from '../../entities/match.entity';
import { ReferencePhoto } from '../../entities/reference-photo.entity';
import { FoundImage } from '../../entities/found-image.entity';
import { cosineSimilarity, isCandidateMatch } from '@medusa/shared';

interface RefEmbedding {
  embeddingId: string;
  photoId: string;
  userId: string;
  vector: number[];
}

@Injectable()
export class MatcherService {
  private readonly logger = new Logger(MatcherService.name);

  constructor(
    @InjectRepository(FaceEmbedding)
    private readonly embeddingRepo: Repository<FaceEmbedding>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(ReferencePhoto)
    private readonly refPhotoRepo: Repository<ReferencePhoto>,
    @InjectRepository(FoundImage)
    private readonly foundImageRepo: Repository<FoundImage>,
  ) {}

  async runBatch(batchDate: string, userIdFilter?: string): Promise<{ matches: number; comparisons: number }> {
    this.logger.log(`Starting match batch for date ${batchDate}`);

    // Load all reference embeddings
    const refQuery = this.refPhotoRepo.createQueryBuilder('rp')
      .innerJoin(FaceEmbedding, 'fe', "fe.source_type = 'reference' AND fe.source_id = rp.id::text")
      .select(['rp.id as photo_id', 'rp.user_id as user_id', 'fe.id as embedding_id', 'fe.vector as vector'])
      .where('rp.status = :status', { status: 'embedded' });

    if (userIdFilter) {
      refQuery.andWhere('rp.user_id = :userId', { userId: userIdFilter });
    }

    const refRows = await refQuery.getRawMany();
    const refEmbeddings: RefEmbedding[] = refRows.map((r) => ({
      embeddingId: r.embedding_id,
      photoId: r.photo_id,
      userId: r.user_id,
      vector: r.vector,
    }));

    if (refEmbeddings.length === 0) {
      this.logger.log('No reference embeddings found, skipping batch');
      return { matches: 0, comparisons: 0 };
    }

    this.logger.log(`Loaded ${refEmbeddings.length} reference embeddings`);

    // Load found embeddings in chunks
    const chunkSize = parseInt(process.env.MATCH_BATCH_CHUNK_SIZE || '1000');
    let offset = 0;
    let totalMatches = 0;
    let totalComparisons = 0;

    while (true) {
      const foundEmbeddings = await this.embeddingRepo.find({
        where: { sourceType: EmbeddingSourceType.FOUND },
        take: chunkSize,
        skip: offset,
      });

      if (foundEmbeddings.length === 0) break;

      const foundImageIds = foundEmbeddings.map((e) => e.sourceId);
      const foundImages = await this.foundImageRepo.findByIds(foundImageIds);
      const foundImageMap = new Map(foundImages.map((fi) => [fi.id, fi]));

      this.logger.log(`Processing chunk: ${foundEmbeddings.length} found embeddings (offset ${offset})`);

      for (const foundEmb of foundEmbeddings) {
        for (const refEmb of refEmbeddings) {
          totalComparisons++;

          if (!foundEmb.vector?.length || !refEmb.vector?.length) continue;

          let similarity: number;
          try {
            similarity = cosineSimilarity(foundEmb.vector, refEmb.vector);
          } catch {
            continue;
          }

          if (!isCandidateMatch(similarity)) continue;

          // Check if this match already exists
          const existing = await this.matchRepo.findOne({
            where: {
              referencePhotoId: refEmb.photoId,
              foundImageId: foundEmb.sourceId,
            },
          });
          if (existing) continue;

          await this.matchRepo.save(
            this.matchRepo.create({
              userId: refEmb.userId,
              referencePhotoId: refEmb.photoId,
              foundImageId: foundEmb.sourceId,
              similarityScore: similarity,
              matchBatchDate: batchDate,
              status: MatchStatus.PENDING_REVIEW,
            }),
          );

          totalMatches++;
        }
      }

      offset += chunkSize;
      if (foundEmbeddings.length < chunkSize) break;
    }

    this.logger.log(
      `Batch complete: ${totalMatches} new matches from ${totalComparisons} comparisons`,
    );

    return { matches: totalMatches, comparisons: totalComparisons };
  }
}
