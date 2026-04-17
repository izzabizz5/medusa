import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository, Not, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User, UserRole } from '../../entities/user.entity';
import { TargetUrl } from '../../entities/target-url.entity';
import { SessionUser } from '../auth/auth.service';
import {
  QUEUES, JOBS, QUEUE_PRIORITIES,
  CrawlJobPayload, MatchBatchJobPayload,
} from '@medusa/shared';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(TargetUrl)
    private readonly targetUrlRepo: Repository<TargetUrl>,
    @InjectQueue(QUEUES.CRAWL)
    private readonly crawlQueue: Queue,
    @InjectQueue(QUEUES.MATCH)
    private readonly matchQueue: Queue,
    @InjectQueue(QUEUES.DISCOVER)
    private readonly discoverQueue: Queue,
  ) {}

  // ── user management ──────────────────────────────────────────

  async listUsers(): Promise<SessionUser[]> {
    const users = await this.userRepo.find({ order: { createdAt: 'ASC' } });
    return users.map(this.toSession);
  }

  async findUser(id: string): Promise<SessionUser> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.toSession(user);
  }

  async createProfile(name: string, sport?: string, email?: string): Promise<SessionUser> {
    const resolvedEmail = email?.trim() || `managed_${randomBytes(8).toString('hex')}@medusa.internal`;

    const existing = await this.userRepo.findOne({ where: { email: resolvedEmail } });
    if (existing) throw new ConflictException('Email already in use');

    const randomPassword = randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    const user = this.userRepo.create({
      email: resolvedEmail,
      fullName: name,
      sport: sport?.trim() || null,
      passwordHash,
      role: UserRole.ATHLETE,
    });
    const saved = await this.userRepo.save(user);
    return this.toSession(saved);
  }

  // ── pipeline triggers ────────────────────────────────────────

  /**
   * Queue crawl jobs for active target URLs.
   * discoveredOnly=true (default): only crawl pages found via keyword search,
   * not root homepages of creeper sites.
   */
  async triggerCrawl(discoveredOnly = true): Promise<{ queued: number }> {
    const where: any = { isActive: true };
    if (discoveredOnly) {
      where.autoDiscovered = true;
    }

    const urls = await this.targetUrlRepo.find({ where });

    for (const url of urls) {
      const payload: CrawlJobPayload = {
        targetUrlId: url.id,
        url: url.url,
        platform: url.platform,
      };
      await this.crawlQueue.add(JOBS.CRAWL_URL, payload, {
        priority: QUEUE_PRIORITIES.HIGH,
        attempts: 2,
        removeOnComplete: { count: 50 },
      });
    }

    this.logger.log(`Queued crawl jobs for ${urls.length} ${discoveredOnly ? 'discovered' : 'all active'} URLs`);
    return { queued: urls.length };
  }

  /** Queue a match batch that compares all found embeddings against reference photos. */
  async triggerMatchBatch(userIdFilter?: string): Promise<{ enqueued: boolean; batchDate: string }> {
    const batchDate = new Date().toISOString().split('T')[0];
    const payload: MatchBatchJobPayload = { batchDate, userIdFilter };

    await this.matchQueue.add(JOBS.RUN_MATCH_BATCH, payload, {
      priority: QUEUE_PRIORITIES.HIGH,
      attempts: 1,
      removeOnComplete: { count: 30 },
    });

    this.logger.log(`Queued match batch for ${batchDate} (user=${userIdFilter || 'all'})`);
    return { enqueued: true, batchDate };
  }

  /**
   * Targeted keyword discovery: for each profile, search for their name
   * across known creeper domains using site-specific DuckDuckGo queries.
   * Only finds pages that actually mention the person by name.
   */
  async triggerKeywordDiscovery(): Promise<{ queries: string[]; queued: number }> {
    const profiles = await this.userRepo.find({
      where: { role: UserRole.ATHLETE, fullName: Not(IsNull()) },
    });

    // Get known creeper domains from target URLs
    const targetUrls = await this.targetUrlRepo.find({ where: { isActive: true } });
    const domains = [...new Set(
      targetUrls.map((t) => {
        try { return new URL(t.url).hostname; } catch { return null; }
      }).filter(Boolean) as string[],
    )];

    const queries: string[] = [];

    for (const profile of profiles) {
      const name = profile.fullName;
      const base = profile.sport ? `"${name}" ${profile.sport}` : `"${name}"`;

      // General web search (no site: restriction)
      queries.push(base);
      queries.push(`${base} leaked`);
      queries.push(`${base} nude`);

      // Site-specific searches across each known domain
      for (const domain of domains) {
        queries.push(`${base} site:${domain}`);
      }
    }

    for (const query of queries) {
      await this.discoverQueue.add(
        JOBS.DISCOVER_URLS,
        { source: 'search_query', value: query },
        {
          priority: QUEUE_PRIORITIES.NORMAL,
          attempts: 2,
          removeOnComplete: { count: 50 },
        },
      );
    }

    this.logger.log(`Queued ${queries.length} keyword discovery jobs from ${profiles.length} profiles across ${domains.length} domains`);
    return { queries, queued: queries.length };
  }

  private toSession(user: User): SessionUser {
    return { id: user.id, email: user.email, fullName: user.fullName, role: user.role, sport: user.sport ?? null };
  }
}
