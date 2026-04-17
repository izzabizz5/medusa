import { Body, Controller, Delete, Get, Param, Post, Patch, Query } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TargetUrlsService, CreateTargetUrlDto } from './target-urls.service';
import { QUEUES, JOBS } from '@medusa/shared';

class LabelDto {
  isGood: boolean;
}

class PriorityDto {
  /** 1–5 or null to clear */
  priority: number | null;
}

class DiscoverDto {
  source: 'seed_url' | 'search_query' | 'known_domains';
  value?: string; // URL or search query; omit for known_domains
}

// Admin-only controller — deploy behind VPN/firewall
@Controller('target-urls')
export class TargetUrlsController {
  constructor(
    private readonly service: TargetUrlsService,
    @InjectQueue(QUEUES.DISCOVER) private readonly discoverQueue: Queue,
  ) {}

  @Post()
  create(@Body() dto: CreateTargetUrlDto) {
    return this.service.create(dto, 'admin');
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** Auto-discovered URLs waiting for a human to approve or reject */
  @Get('pending-review')
  findPendingReview() {
    return this.service.findPendingReview();
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.service.toggle(id);
  }

  /**
   * Label a URL as good or bad training data.
   * Good → activates it for crawling.
   * Bad → deactivates it.
   */
  @Patch(':id/label')
  label(@Param('id') id: string, @Body() dto: LabelDto) {
    return this.service.labelUrl(id, dto.isGood);
  }

  /** Set manual crawl priority 1 (low) – 5 (high). Send null to clear. */
  @Patch(':id/priority')
  setPriority(@Param('id') id: string, @Body() dto: PriorityDto) {
    return this.service.setPriority(id, dto.priority ?? null);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  /**
   * Manually trigger a web discovery run.
   * source=seed_url:    crawl a specific page for outbound links
   * source=search_query: search DuckDuckGo for a query
   * source=known_domains: follow links from existing active URLs (default)
   */
  @Post('discover')
  async triggerDiscovery(@Body() dto: DiscoverDto) {
    await this.discoverQueue.add(
      JOBS.DISCOVER_URLS,
      { source: dto.source ?? 'known_domains', value: dto.value ?? '' },
      { priority: 8, attempts: 2, removeOnComplete: { count: 20 } },
    );
    return { queued: true, source: dto.source ?? 'known_domains' };
  }
}
