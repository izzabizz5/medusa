import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoundImage } from '../../entities/found-image.entity';
import { hashImageUrl } from '@medusa/shared';

@Injectable()
export class DedupService {
  constructor(
    @InjectRepository(FoundImage)
    private readonly foundImageRepo: Repository<FoundImage>,
  ) {}

  async isKnown(imageUrl: string): Promise<boolean> {
    const urlHash = hashImageUrl(imageUrl);
    const existing = await this.foundImageRepo.findOne({ where: { urlHash } });
    return !!existing;
  }

  async getKnownIds(imageUrls: string[]): Promise<Set<string>> {
    const hashes = imageUrls.map(hashImageUrl);
    const existing = await this.foundImageRepo
      .createQueryBuilder('fi')
      .where('fi.url_hash IN (:...hashes)', { hashes })
      .select('fi.url_hash')
      .getMany();
    return new Set(existing.map((e) => e.urlHash));
  }
}
