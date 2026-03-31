import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TargetUrl, Platform } from '../../entities/target-url.entity';

export class CreateTargetUrlDto {
  url: string;
  platform: Platform;
  label?: string;
}

@Injectable()
export class TargetUrlsService {
  constructor(
    @InjectRepository(TargetUrl)
    private readonly repo: Repository<TargetUrl>,
  ) {}

  async create(dto: CreateTargetUrlDto, addedBy: string): Promise<TargetUrl> {
    const existing = await this.repo.findOne({ where: { url: dto.url } });
    if (existing) throw new ConflictException('URL already registered');
    const target = this.repo.create({ ...dto, addedBy });
    return this.repo.save(target);
  }

  findAll(): Promise<TargetUrl[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findActive(): Promise<TargetUrl[]> {
    return this.repo.find({ where: { isActive: true } });
  }

  async toggle(id: string): Promise<TargetUrl> {
    const target = await this.repo.findOne({ where: { id } });
    if (!target) throw new NotFoundException('Target URL not found');
    target.isActive = !target.isActive;
    return this.repo.save(target);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async markCrawled(id: string): Promise<void> {
    await this.repo.update(id, { lastCrawledAt: new Date() });
  }
}
