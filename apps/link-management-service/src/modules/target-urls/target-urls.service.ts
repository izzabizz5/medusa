import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { TargetUrl, Platform, MlLabel } from '../../entities/target-url.entity';
import { UrlClassifierService } from '../url-classifier/url-classifier.service';

export class CreateTargetUrlDto {
  url: string;
  platform: Platform;
  label?: string;
}

export interface CreateDiscoveredDto {
  url: string;
  platform: Platform;
  mlScore: number;
  isActive: boolean;
}

@Injectable()
export class TargetUrlsService {
  constructor(
    @InjectRepository(TargetUrl)
    private readonly repo: Repository<TargetUrl>,
    private readonly classifier: UrlClassifierService,
  ) {}

  /**
   * Manually add a URL (admin action). Auto-classifies in the background
   * and labels it as positive training data since the user added it intentionally.
   */
  async create(dto: CreateTargetUrlDto, addedBy: string): Promise<TargetUrl> {
    const existing = await this.repo.findOne({ where: { url: dto.url } });
    if (existing) throw new ConflictException('URL already registered');

    const target = this.repo.create({
      ...dto,
      addedBy,
      mlLabel: MlLabel.POSITIVE, // manually added = positive training example
    });
    const saved = await this.repo.save(target);

    // Score in background — don't block the response
    this.classifier.classifyUrl(dto.url).then(({ score }) => {
      this.repo.update(saved.id, { mlScore: score });
    }).catch(() => {/* classifier unavailable — no-op */});

    return saved;
  }

  /**
   * Add a URL discovered by the web scraper. Not labeled as positive
   * until a human confirms or outcomes prove it useful.
   */
  async createDiscovered(dto: CreateDiscoveredDto): Promise<TargetUrl> {
    const existing = await this.repo.findOne({ where: { url: dto.url } });
    if (existing) throw new ConflictException('URL already registered');

    const target = this.repo.create({
      url: dto.url,
      platform: dto.platform,
      addedBy: 'auto-discovery',
      mlScore: dto.mlScore,
      isActive: dto.isActive,
      autoDiscovered: true,
    });
    return this.repo.save(target);
  }

  findAll(): Promise<TargetUrl[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findActive(): Promise<TargetUrl[]> {
    return this.repo.find({ where: { isActive: true } });
  }

  /**
   * Auto-discovered URLs with score between thresholds, waiting for human review.
   */
  findPendingReview(): Promise<TargetUrl[]> {
    return this.repo.find({
      where: { autoDiscovered: true, isActive: false },
      order: { mlScore: 'DESC' },
    });
  }

  /**
   * All URLs that have an explicit mlLabel — used as training data.
   */
  findLabeledForTraining(): Promise<TargetUrl[]> {
    return this.repo.find({ where: { mlLabel: Not(IsNull()) } });
  }

  /**
   * URLs that have never been ML-scored (need initial scoring pass).
   */
  findUnscored(): Promise<TargetUrl[]> {
    return this.repo.find({ where: { mlScore: IsNull() } });
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

  /**
   * Apply a human feedback label to a URL. This becomes training data
   * for the next classifier retrain.
   */
  async labelUrl(id: string, isGood: boolean): Promise<TargetUrl> {
    const target = await this.repo.findOne({ where: { id } });
    if (!target) throw new NotFoundException('Target URL not found');

    target.mlLabel = isGood ? MlLabel.POSITIVE : MlLabel.NEGATIVE;
    // If user labels it as good and it was inactive, activate it
    if (isGood && !target.isActive) target.isActive = true;
    // If user labels it as bad and it was active, deactivate it
    if (!isGood && target.isActive) target.isActive = false;

    return this.repo.save(target);
  }

  async updateMlScore(id: string, score: number): Promise<void> {
    await this.repo.update(id, { mlScore: score });
  }

  async setPriority(id: string, priority: number | null): Promise<TargetUrl> {
    const target = await this.repo.findOne({ where: { id } });
    if (!target) throw new NotFoundException('Target URL not found');
    target.priority = priority;
    return this.repo.save(target);
  }

  /**
   * Auto-label URLs based on crawl outcomes: URLs that consistently
   * surface images with faces are positive; those with none are negative.
   * Uses raw SQL since crawl data lives in the same DB.
   */
  async autoLabelFromCrawlOutcomes(): Promise<{ positive: number; negative: number }> {
    // URLs with face-bearing images in >15% of crawled images → positive
    await this.repo.query(`
      UPDATE target_urls tu
      SET ml_label = 'positive'
      WHERE tu.ml_label IS NULL
        AND EXISTS (
          SELECT 1 FROM crawl_runs cr
          JOIN found_images fi ON fi.crawl_run_id = cr.id
          WHERE cr.target_url_id = tu.id
            AND fi.has_face = true
          GROUP BY cr.target_url_id
          HAVING COUNT(CASE WHEN fi.has_face = true THEN 1 END)::float
               / NULLIF(COUNT(*), 0) > 0.15
        )
    `);

    // URLs with ≥5 crawl runs and face rate <2% → negative
    await this.repo.query(`
      UPDATE target_urls tu
      SET ml_label = 'negative'
      WHERE tu.ml_label IS NULL
        AND (
          SELECT COUNT(DISTINCT cr.id) FROM crawl_runs cr
          WHERE cr.target_url_id = tu.id
        ) >= 5
        AND (
          SELECT COUNT(CASE WHEN fi.has_face = true THEN 1 END)::float
               / NULLIF(COUNT(*), 0)
          FROM crawl_runs cr
          JOIN found_images fi ON fi.crawl_run_id = cr.id
          WHERE cr.target_url_id = tu.id
        ) < 0.02
    `);

    const [{ pos }] = await this.repo.query(
      `SELECT COUNT(*) as pos FROM target_urls WHERE ml_label = 'positive'`,
    );
    const [{ neg }] = await this.repo.query(
      `SELECT COUNT(*) as neg FROM target_urls WHERE ml_label = 'negative'`,
    );

    return { positive: parseInt(pos), negative: parseInt(neg) };
  }
}
